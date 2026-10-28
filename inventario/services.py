"""Reglas de negocio: aquí es donde el stock se actualiza solo."""
from django.db import transaction

from .models import Consumible, Movimiento


class ErrorInventario(Exception):
    """Error que se le muestra al usuario tal cual."""

@transaction.atomic
def registrar_salida(*, consumible, cantidad, departamento="", persona="", notas=""):
    c = Consumible.objects.select_for_update().get(pk=consumible.pk)
    departamento = (departamento or "").strip()
    if not departamento:
        raise ErrorInventario("Indica a qué departamento se entrega el consumible.")
    nuevo = c.stock - cantidad
    if nuevo < 0:
        raise ErrorInventario(f"Stock insuficiente de {c.modelo}: hay {c.stock} y pides {cantidad}.")
    c.stock = nuevo
    c.save(update_fields=["stock"])
    return Movimiento.objects.create(
        consumible=c, tipo=Movimiento.SALIDA, cantidad=cantidad, departamento=departamento,
        persona=(persona or "").strip(), notas=(notas or "").strip())


@transaction.atomic
def agregar_stock(pk, cantidad, proveedor="", notas=""):
    c = Consumible.objects.select_for_update().get(pk=pk)
    c.stock += cantidad
    c.save(update_fields=["stock"])
    return Movimiento.objects.create(
        consumible=c, tipo=Movimiento.ENTRADA, cantidad=cantidad,
        persona=(proveedor or "").strip(), notas=(notas or "").strip())

@transaction.atomic
def anular_movimiento(pk):
    """No borra el registro (queda para auditoría): lo marca anulado y revierte el stock."""
    m = Movimiento.objects.select_for_update().get(pk=pk)
    if m.anulado:
        raise ErrorInventario("Ese movimiento ya estaba anulado.")
    c = Consumible.objects.select_for_update().get(pk=m.consumible_id)
    nuevo = c.stock + (m.cantidad if m.tipo == Movimiento.SALIDA else -m.cantidad)
    if nuevo < 0:
        raise ErrorInventario("No se puede anular: el stock quedaría negativo.")
    c.stock = nuevo
    c.save(update_fields=["stock"])
    m.anulado = True
    m.save(update_fields=["anulado"])
    return m
