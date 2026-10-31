@echo off
set PORT=8000
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo No existe el entorno .venv. Corre iniciar.bat una vez primero.
  pause
  goto :eof
)

if not exist "frontend\dist\index.html" (
  echo Falta compilar la interfaz: entra a la carpeta frontend y corre npm install y npm run build.
  pause
  goto :eof
)

".venv\Scripts\python.exe" manage.py migrate
if errorlevel 1 goto error

echo Servidor activo en el puerto %PORT%. Entra con la IP de este equipo.
".venv\Scripts\python.exe" -m waitress --listen=0.0.0.0:%PORT% config.wsgi:application
pause
goto :eof

:error
echo.
echo Fallaron las migraciones. Revisa el mensaje de arriba.
pause