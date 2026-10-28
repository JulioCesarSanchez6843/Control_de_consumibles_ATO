# Control de consumibles (Django + React)

Control de stock de consumibles de impresión: registras una entrega y el stock se actualiza solo.

- **Backend:** Django (API JSON + PostgreSQL)
- **Frontend:** React (Vite). Se compila **una vez** y Django lo sirve: en el día a día es un solo `runserver`.

## Requisitos
Python 3.10+ y Node.js 18+ (Node solo se usa para compilar el front).

## Iniciar
**Doble clic en `iniciar.bat`.** La primera vez: crea el entorno, instala Django, crea la base,
compila React y abre http://127.0.0.1:5050.

**A mano:**
```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe manage.py crear_db
.venv\Scripts\python.exe manage.py makemigrations inventario
.venv\Scripts\python.exe manage.py migrate
cd frontend && npm install && npm run build && cd ..
.venv\Scripts\python.exe manage.py runserver 5050
```
Puerto: cambia `PORT` en `iniciar.bat` o el `5050` del comando.

## Si cambias el front
- Para ver cambios en vivo: deja `runserver 5050` corriendo y en otra terminal `cd frontend && npm run dev` (http://localhost:5173).
- Para dejarlo definitivo: `npm run build` otra vez.

## Uso
- **Registrar:** consumible, cantidad, departamento. El stock baja al instante; si pides más de lo que hay, lo rechaza. *Entrada* = llegó material.
- **Stock:** alertas Bajo/Agotado según el mínimo de cada consumible; alta de consumibles nuevos.
- **Bitácora:** historial. *Anular* revierte el stock y deja el registro marcado (no se borra).
- **Impresoras:** tu hoja de impresoras; *Entregar* abre el formulario ya llenado.

## Base de datos (PostgreSQL)
1. Copia `.env.example` como `.env` y llena `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`.
2. Corre `iniciar.bat`: el comando `crear_db` crea la base si no existe, luego migra.
   (A mano: `manage.py crear_db`.) Si prefieres otra base ya creada, solo pon su nombre en `DB_NAME`.

## Admin de Django (opcional)
`.venv\Scripts\python.exe manage.py createsuperuser` y entra a http://127.0.0.1:5050/admin/
(el stock ahí es de solo lectura para que la bitácora siempre cuadre).

## Vaciar la base
`.venv\Scripts\python.exe manage.py flush --no-input`  (borra todos los datos y deja las tablas)

## Estructura
```
manage.py · iniciar.bat · requirements.txt
config/                 settings y urls
inventario/models.py    tablas
inventario/services.py  reglas de stock (registrar / anular)
inventario/api.py       endpoints JSON + sirve el React compilado
frontend/src/           React (App, api.js, components/)
```

## Notas
- No hay login todavía: úsalo en tu equipo o red de confianza.
- Algunas piezas de la hoja *Impresoras* no coinciden con ningún modelo del stock; salen como "no está en stock" hasta que las completes.
