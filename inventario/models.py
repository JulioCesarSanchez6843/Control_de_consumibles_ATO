from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models
from django.utils import timezone

class UsuarioManager(UserManager):
    def _create_user(self, username, email=None, password=None, **extra_fields):
        if not username:
            raise ValueError("El usuario es obligatorio")
        user = self.model(username=self.model.normalize_username(username), **extra_fields)
        user.password = make_password(password)
        user.save(using=self._db)
        return user


class Usuario(AbstractUser):
    email = None
    REQUIRED_FIELDS = []

    objects = UsuarioManager()

    class Meta:
        verbose_name = "usuario"
        verbose_name_plural = "usuarios"

class Consumible(models.Model):
    modelo = models.CharField(max_length=200)
    departamento = models.CharField(max_length=100, blank=True, default="")
    descripcion = models.CharField("descripción", max_length=100, blank=True)
    marca = models.CharField(max_length=100, blank=True)
    notas = models.CharField(max_length=300, blank=True)
    stock = models.PositiveIntegerField(default=0)
    stock_minimo = models.PositiveIntegerField("stock mínimo", default=1)

    class Meta:
        ordering = ["departamento", "descripcion", "modelo"]
        constraints = [
            models.UniqueConstraint(fields=["departamento", "modelo"], name="consumible_unico_por_departamento"),
        ]
        verbose_name = "consumible"
        verbose_name_plural = "consumibles"

    def __str__(self):
        return f"{self.modelo} ({self.descripcion}) - {self.departamento}"

    @property
    def estado(self):
        if self.stock == 0:
            return "agotado"
        return "bajo" if self.stock <= self.stock_minimo else "ok"


class Impresora(models.Model):
    marca = models.CharField(max_length=100, blank=True)
    modelo = models.CharField(max_length=150, blank=True)
    tipo = models.CharField(max_length=200, blank=True)
    departamento = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ["departamento", "marca", "modelo"]
        verbose_name = "impresora"
        verbose_name_plural = "impresoras"

    def __str__(self):
        return f"{self.marca} {self.modelo} - {self.departamento}"


class ImpresoraConsumible(models.Model):
    impresora = models.ForeignKey(Impresora, on_delete=models.CASCADE, related_name="consumibles")
    tipo_consumible = models.CharField(max_length=100, blank=True)
    pieza = models.CharField(max_length=200, blank=True)
    cantidad = models.PositiveIntegerField(null=True, blank=True)
    consumible = models.ForeignKey(Consumible, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name="usado_en")

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.tipo_consumible} {self.pieza}".strip()


class Movimiento(models.Model):
    SALIDA = "salida"
    ENTRADA = "entrada"
    TIPOS = [(SALIDA, "Salida (entrego)"), (ENTRADA, "Entrada (llegó stock)")]

    fecha = models.DateTimeField(default=timezone.now)
    tipo = models.CharField(max_length=10, choices=TIPOS, default=SALIDA)
    consumible = models.ForeignKey(Consumible, on_delete=models.PROTECT, related_name="movimientos")
    cantidad = models.PositiveIntegerField()
    departamento = models.CharField(max_length=100, blank=True)
    persona = models.CharField("quién recibe / proveedor", max_length=100, blank=True)
    notas = models.CharField(max_length=300, blank=True)
    anulado = models.BooleanField(default=False)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT,
                                related_name="movimientos_registrados")
    anulado_por = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT,
                                    related_name="movimientos_anulados")

    class Meta:
        ordering = ["-id"]
        verbose_name = "movimiento"
        verbose_name_plural = "movimientos (bitácora)"

    def __str__(self):
        return f"#{self.pk} {self.tipo} {self.cantidad} x {self.consumible.modelo}"


class Actividad(models.Model):
    ACCIONES = [
        ("login", "Inicio de sesión"),
        ("login_fallido", "Intento de sesión fallido"),
        ("logout", "Cierre de sesión"),
        ("salida", "Salida registrada"),
        ("entrada", "Entrada registrada"),
        ("anulacion", "Movimiento anulado"),
        ("consumible_alta", "Consumible creado"),
        ("consumible_edicion", "Consumible editado"),
        ("impresora_alta", "Impresora creada"),
        ("impresora_edicion", "Impresora editada"),
        ("impresora_baja", "Impresora eliminada"),
        ("linea_alta", "Consumible agregado a impresora"),
        ("linea_baja", "Consumible quitado de impresora"),
        ("usuario_alta", "Usuario creado"),
        ("usuario_edicion", "Usuario editado"),
    ]

    fecha = models.DateTimeField(default=timezone.now, db_index=True)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT,
                                related_name="actividad")
    username = models.CharField("usuario", max_length=150, blank=True)
    accion = models.CharField(max_length=30, choices=ACCIONES)
    detalle = models.CharField(max_length=500, blank=True)
    movimiento = models.ForeignKey(Movimiento, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name="actividad")
    ip = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ["-id"]
        verbose_name = "actividad"
        verbose_name_plural = "actividad de usuarios"

    def __str__(self):
        return f"#{self.pk} {self.username} {self.accion}"