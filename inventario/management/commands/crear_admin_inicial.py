
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Crea el administrador inicial si todavía no existen usuarios."

    def handle(self, *args, **options):
        Usuario = get_user_model()

        # Si ya existe algún usuario, no crear otro administrador.
        if Usuario.objects.exists():
            self.stdout.write(
                self.style.WARNING(
                    "Ya existen usuarios. Se omite la creación del administrador inicial."
                )
            )
            return

        # Crear administrador inicial.
        Usuario.objects.create_superuser(
            username="Admin",
            password="admin",
            first_name="Admin"
        )

        self.stdout.write(
            self.style.SUCCESS(
                "Administrador inicial creado correctamente.\n"
                "Usuario: Admin\n"
                "Contraseña inicial: admin"
            )
        )
