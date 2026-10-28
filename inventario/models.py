from django.db import models
from django.utils import timezone


class Consumible(models.Model):
    modelo = models.CharField(max_length=200, unique=True)
    descripcion = models.CharField("descripción", max_length=100, blank=True)
    marca = models.CharField(max_length=100, blank=True)
    notas = models.CharField(max_length=300, blank=True)
    stock = models.PositiveIntegerField(default=0)
    stock_minimo = models.PositiveIntegerField("stock mínimo", default=1)

    class Meta:
        ordering = ["descripcion", "modelo"]
        verbose_name = "consumible"
        verbose_name_plural = "consumibles"

    def __str__(self):
        return f"{self.modelo} ({self.descripcion})"

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
    """Qué consumibles usa cada impresora ."""
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

    class Meta:
        ordering = ["-id"]
        verbose_name = "movimiento"
        verbose_name_plural = "movimientos (bitácora)"

    def __str__(self):
        return f"#{self.pk} {self.tipo} {self.cantidad} x {self.consumible.modelo}"
