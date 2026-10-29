from .models import Actividad


def registrar(accion, *, usuario=None, username="", detalle="", movimiento=None, request=None):
    ip = request.META.get("REMOTE_ADDR") if request is not None else None
    if usuario is not None and not getattr(usuario, "is_authenticated", False):
        usuario = None
    nombre = usuario.get_username() if usuario else username
    return Actividad.objects.create(
        accion=accion, usuario=usuario, username=nombre, detalle=detalle[:500],
        movimiento=movimiento, ip=ip or None)