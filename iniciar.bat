
@echo off
setlocal

rem ==========================================
rem CONFIGURACION
rem ==========================================

set "PORT=5050"
cd /d "%~dp0"

echo.
echo ==========================================
echo       CONTROL DE CONSUMIBLES ATO
echo ==========================================
echo.

rem ==========================================
rem 1. COMPROBAR PYTHON
rem ==========================================

where python >nul 2>nul
if errorlevel 1 goto errorpython

rem ==========================================
rem 2. CREAR ENTORNO VIRTUAL
rem ==========================================

if not exist ".venv\Scripts\python.exe" (
    echo Creando entorno virtual...
    python -m venv .venv
    if errorlevel 1 goto errorvenv
)

set "PYTHON=%CD%\.venv\Scripts\python.exe"

if not exist "%PYTHON%" goto errorvenv

rem ==========================================
rem 3. INSTALAR DEPENDENCIAS PYTHON
rem ==========================================

if not exist ".venv\requirements_installed.flag" (
    echo.
    echo Instalando dependencias de Python...

    "%PYTHON%" -m pip install -r requirements.txt
    if errorlevel 1 goto errordeps

    type nul > ".venv\requirements_installed.flag"
)

rem ==========================================
rem 4. CREAR BASE DE DATOS SI NO EXISTE
rem ==========================================

echo.
echo Comprobando base de datos PostgreSQL...

"%PYTHON%" manage.py crear_db
if errorlevel 1 goto errordb

rem ==========================================
rem 5. APLICAR MIGRACIONES
rem ==========================================

echo.
echo Aplicando migraciones...

"%PYTHON%" manage.py migrate --noinput
if errorlevel 1 goto errormig

rem ==========================================
rem 6. CREAR ADMINISTRADOR INICIAL
rem ==========================================

echo.
echo Comprobando administrador inicial...

"%PYTHON%" manage.py crear_admin_inicial
if errorlevel 1 goto erroradmin

rem ==========================================
rem 7. PREPARAR FRONTEND REACT
rem ==========================================

if exist "frontend\dist\index.html" goto arrancar

where npm >nul 2>nul
if errorlevel 1 goto errornode

echo.
echo Instalando dependencias del frontend...

pushd frontend

call npm install
if errorlevel 1 (
    popd
    goto errornpm
)

echo.
echo Compilando interfaz React...

call npm run build
if errorlevel 1 (
    popd
    goto errornpm
)

popd

rem ==========================================
rem 8. INICIAR SERVIDOR
rem ==========================================

:arrancar

echo.
echo ==========================================
echo       INICIANDO SERVIDOR
echo ==========================================
echo.
echo Direccion: http://127.0.0.1:%PORT%
echo.

start "" cmd /c "timeout /t 5 >nul & start http://127.0.0.1:%PORT%"

"%PYTHON%" manage.py runserver %PORT%

echo.
echo El servidor se ha detenido.
pause
goto :eof


rem ==========================================
rem MANEJO DE ERRORES
rem ==========================================

:errorpython
echo.
echo ERROR: No se encontro Python.
echo Instala Python y agregalo al PATH.
goto errorfinal

:errorvenv
echo.
echo ERROR: No se pudo crear el entorno virtual.
goto errorfinal

:errordeps
echo.
echo ERROR: No se pudieron instalar las dependencias de Python.
goto errorfinal

:errordb
echo.
echo ERROR: No se pudo crear o comprobar la base de datos.
echo Revisa PostgreSQL y tu archivo .env.
goto errorfinal

:errormig
echo.
echo ERROR: Fallaron las migraciones de Django.
goto errorfinal

:erroradmin
echo.
echo ERROR: No se pudo crear el administrador inicial.
echo Comprueba que exista crear_admin_inicial.py.
goto errorfinal

:errornode
echo.
echo ERROR: No se encontro Node.js / npm
echo Instala Node.js para compilar el frontend.
goto errorfinal

:errornpm
echo.
echo ERROR: Fallo la instalacion o compilacion de React.
goto errorfinal

:errorfinal
echo.
echo No se pudo iniciar el proyecto.
pause
goto :eof
