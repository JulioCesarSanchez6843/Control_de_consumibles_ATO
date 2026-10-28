import psycopg
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from psycopg import sql


class Command(BaseCommand):
    help = "Crea la base de datos de PostgreSQL definida en .env si todavía no existe."

    def handle(self, *args, **opts):
        cfg = settings.DATABASES["default"]
        nombre = cfg["NAME"]
        try:
            # Se conecta a la base de mantenimiento "postgres" para poder crear la nueva.
            with psycopg.connect(dbname="postgres", user=cfg["USER"], password=cfg["PASSWORD"],
                                 host=cfg["HOST"], port=cfg["PORT"], autocommit=True) as con:
                existe = con.execute("SELECT 1 FROM pg_database WHERE datname = %s", (nombre,)).fetchone()
                if existe:
                    self.stdout.write(f"La base '{nombre}' ya existe.")
                    return
                con.execute(sql.SQL("CREATE DATABASE {} ENCODING 'UTF8'").format(sql.Identifier(nombre)))
        except psycopg.OperationalError as e:
            raise CommandError(
                f"No pude conectar a PostgreSQL en {cfg['HOST']}:{cfg['PORT']} con el usuario "
                f"'{cfg['USER']}'. Revisa que el servicio esté encendido y los datos del .env.\n{e}")
        self.stdout.write(self.style.SUCCESS(f"Base '{nombre}' creada."))
