import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def _cargar_env():
    """Lee el archivo .env (formato CLAVE=valor) sin necesitar librerías extra."""
    ruta = BASE_DIR / ".env"
    if not ruta.exists():
        return
    for linea in ruta.read_text(encoding="utf-8").splitlines():
        linea = linea.strip()
        if not linea or linea.startswith("#") or "=" not in linea:
            continue
        clave, _, valor = linea.partition("=")
        os.environ.setdefault(clave.strip(), valor.strip().strip('"').strip("'"))


_cargar_env()

def _lista(nombre):
    return [x.strip() for x in os.environ.get(nombre, "").split(",") if x.strip()]


DEBUG = os.environ.get("DJANGO_DEBUG", "1") == "1"

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "")
if not SECRET_KEY:
    if not DEBUG:
        raise RuntimeError("Falta DJANGO_SECRET_KEY en el archivo .env")
    SECRET_KEY = "#-0+e+4c696*fr^x$wz-7w4ufi-jg3a!8wx4=ci=i_^*+f!zv"

ALLOWED_HOSTS = ["127.0.0.1", "localhost"] + _lista("DJANGO_ALLOWED_HOSTS")
CSRF_TRUSTED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"] + _lista("DJANGO_CSRF_ORIGINS")

if os.environ.get("DJANGO_HTTPS") == "1":
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

INSTALLED_APPS = [
    "inventario",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "inventario.middleware.ExigirLogin",
]

ROOT_URLCONF = "config.urls"

AUTH_USER_MODEL = "inventario.Usuario"

TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [],
    "APP_DIRS": True,
    "OPTIONS": {"context_processors": [
        "django.template.context_processors.request",
        "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages",
    ]},
}]

WSGI_APPLICATION = "config.wsgi.application"

# Base de datos: solo PostgreSQL. Los datos de conexión salen del archivo .env
_faltan = [k for k in ("DB_NAME", "DB_USER", "DB_PASSWORD") if not os.environ.get(k)]
if _faltan:
    raise RuntimeError(
        "Faltan variables en el archivo .env: " + ", ".join(_faltan)
        + ". Copia .env.example como .env y llénalo con los datos de tu PostgreSQL.")

DATABASES = {"default": {
    "ENGINE": "django.db.backends.postgresql",
    "NAME": os.environ["DB_NAME"],
    "USER": os.environ["DB_USER"],
    "PASSWORD": os.environ["DB_PASSWORD"],
    "HOST": os.environ.get("DB_HOST", "localhost"),
    "PORT": os.environ.get("DB_PORT", "5432"),
}}

LANGUAGE_CODE = "es-mx"
TIME_ZONE = "America/Mexico_City"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATICFILES_DIRS = [BASE_DIR / "static"]
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
