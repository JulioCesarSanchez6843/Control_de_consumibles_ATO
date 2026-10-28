import os
import shutil
import subprocess

from django.conf import settings
from django.contrib.staticfiles.management.commands.runserver import Command as RunserverCommand


class Command(RunserverCommand):
    default_port = "5050"

    def handle(self, *args, **options):
        if os.environ.get("RUN_MAIN") != "true":
            self.compilar_front()
        return super().handle(*args, **options)

    def compilar_front(self):
        front = settings.BASE_DIR / "frontend"
        if not front.exists():
            return
        fuentes = [p for p in (front / "src").rglob("*") if p.is_file()]
        fuentes += [front / n for n in ("index.html", "package.json", "vite.config.js")]
        fuentes = [p for p in fuentes if p.exists()]
        index = front / "dist" / "index.html"
        if index.exists() and all(p.stat().st_mtime <= index.stat().st_mtime for p in fuentes):
            return
        npm = shutil.which("npm")
        if not npm:
            self.stderr.write("No encontré Node.js (npm). Se usará la última versión compilada del front.")
            return
        self.stdout.write("Compilando el front...")
        try:
            if not (front / "node_modules").exists():
                subprocess.run([npm, "install"], cwd=front, check=True)
            subprocess.run([npm, "run", "build"], cwd=front, check=True)
        except subprocess.CalledProcessError:
            self.stderr.write("Falló la compilación del front. Se usará la última versión compilada.")