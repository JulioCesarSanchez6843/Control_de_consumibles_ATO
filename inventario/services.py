from django.db import transaction

from . import auditoria
from .models import Consumible, Movimiento


class ErrorInventario(Exception):
    pass


@transaction.atomic
def registrar_salida(*, consumible, cantidad, departamento="", persona="", notas="", usuario=None):
    c = Consumible.objects.select_for_update().get(pk=consumible.pk)
    departamento = (departamento or "").strip()
    if not departamento:
        raise ErrorInventario("Indica a qué departamento se entrega el consumible.")
    nuevo = c.stock - cantidad
    if nuevo < 0:
        raise ErrorInventario(f"Stock insuficiente de {c.modelo}: hay {c.stock} y pides {cantidad}.")
    c.stock = nuevo
    c.save(update_fields=["stock"])
    m = Movimiento.objects.create(
        consumible=c, tipo=Movimiento.SALIDA, cantidad=cantidad, departamento=departamento,
        persona=(persona or "").strip(), notas=(notas or "").strip(), usuario=usuario)
    auditoria.registrar(
        "salida", usuario=usuario, movimiento=m,
        detalle=f"{cantidad} x {c.modelo} a {departamento}" + (f" ({m.persona})" if m.persona else ""))
    return m


@transaction.atomic
def agregar_stock(pk, cantidad, proveedor="", notas="", usuario=None):
    c = Consumible.objects.select_for_update().get(pk=pk)
    c.stock += cantidad
    c.save(update_fields=["stock"])
    m = Movimiento.objects.create(
        consumible=c, tipo=Movimiento.ENTRADA, cantidad=cantidad,
        persona=(proveedor or "").strip(), notas=(notas or "").strip(), usuario=usuario)
    auditoria.registrar(
        "entrada", usuario=usuario, movimiento=m,
        detalle=f"{cantidad} x {c.modelo}" + (f" de {m.persona}" if m.persona else ""))
    return m


@transaction.atomic
def anular_movimiento(pk, usuario=None):
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
    m.anulado_por = usuario
    m.save(update_fields=["anulado", "anulado_por"])
    auditoria.registrar(
        "anulacion", usuario=usuario, movimiento=m,
        detalle=f"{m.tipo} #{m.pk}: {m.cantidad} x {c.modelo}")
    return m