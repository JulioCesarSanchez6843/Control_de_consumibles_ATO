@echo off
rem Doble clic para iniciar todo. Cambia el puerto aqui si quieres:
set PORT=5050
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo Primera vez: creando entorno e instalando dependencias...
  python -m venv .venv
  ".venv\Scripts\python.exe" -m pip install -r requirements.txt
)

".venv\Scripts\python.exe" manage.py crear_db
if errorlevel 1 goto errordb
".venv\Scripts\python.exe" manage.py makemigrations inventario
if errorlevel 1 goto errormig
".venv\Scripts\python.exe" manage.py migrate
if errorlevel 1 goto errormig

if exist "frontend\dist\index.html" goto arrancar
where npm >nul 2>nul
if errorlevel 1 goto sinnode
echo Compilando la interfaz React, solo la primera vez...
pushd frontend
call npm install
call npm run build
popd
goto arrancar

:sinnode
echo AVISO: no encontre Node.js, la pantalla no se podra mostrar. Instalalo y vuelve a abrir este archivo.

:arrancar
start "" cmd /c "timeout /t 3 >nul & start http://127.0.0.1:%PORT%"
".venv\Scripts\python.exe" manage.py runserver %PORT%
pause
goto :eof

:errordb
echo.
echo Fallo la conexion a PostgreSQL. Revisa el archivo .env y que el servicio este encendido.
pause
goto :eof

:errormig
echo.
echo Fallaron las migraciones de la base de datos. Revisa el mensaje de arriba antes de continuar.
pause
goto :eof