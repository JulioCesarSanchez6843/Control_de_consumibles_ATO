import json
from functools import wraps

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login, logout, update_session_auth_hash
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from . import auditoria, services
from .models import Actividad, Consumible, Impresora, ImpresoraConsumible, Movimiento


def _err(msg, status=400):
    return JsonResponse({"detail": msg}, status=status)


def _body(request):
    try:
        data = json.loads(request.body or b"{}")
        return data if isinstance(data, dict) else {}
    except ValueError:
        return {}


def _entero(v, nombre, minimo=0):
    try:
        n = int(v)
    except (TypeError, ValueError):
        raise ValueError(f"{nombre} debe ser un número entero")
    if n < minimo:
        raise ValueError(f"{nombre} debe ser {minimo} o más")
    return n


def _txt(d, k):
    return str(d.get(k) or "").strip()


def _cons(c):
    return {"id": c.pk, "modelo": c.modelo, "descripcion": c.descripcion, "marca": c.marca,
            "notas": c.notas, "stock": c.stock, "stock_minimo": c.stock_minimo}


def _mov(m):
    return {"id": m.pk, "fecha": timezone.localtime(m.fecha).strftime("%Y-%m-%d %H:%M"), "tipo": m.tipo,
            "consumable_id": m.consumible_id, "cantidad": m.cantidad, "departamento": m.departamento,
            "persona": m.persona, "notas": m.notas, "anulado": m.anulado,
            "modelo": m.consumible.modelo, "descripcion": m.consumible.descripcion,
            "stock_actual": m.consumible.stock,
            "usuario": m.usuario.get_username() if m.usuario else "",
            "anulado_por": m.anulado_por.get_username() if m.anulado_por else ""}


def _impresora(p):
    return {"id": p.pk, "marca": p.marca, "modelo": p.modelo, "tipo": p.tipo, "departamento": p.departamento,
            "consumibles": [{
                "id": ln.pk, "tipo_consumible": ln.tipo_consumible, "pieza": ln.pieza,
                "cantidad": ln.cantidad, "consumable_id": ln.consumible_id,
                "stock_actual": ln.consumible.stock if ln.consumible else None,
            } for ln in p.consumibles.all()]}


def _usuario(u):
    return {"username": u.get_username(), "nombre": u.get_full_name() or u.get_username(),
            "es_admin": u.is_staff}


def _usuario_admin(u):
    return {"id": u.pk, "username": u.get_username(), "nombre": u.first_name,
            "es_admin": u.is_staff, "activo": u.is_active,
            "ultimo_acceso": timezone.localtime(u.last_login).strftime("%Y-%m-%d %H:%M") if u.last_login else ""}


def solo_admin(vista):
    @wraps(vista)
    def envuelta(request, *args, **kwargs):
        if not request.user.is_staff:
            return _err("Solo el encargado puede hacer esto", 403)
        return vista(request, *args, **kwargs)
    return envuelta


@ensure_csrf_cookie
@require_GET
def csrf(request):
    return JsonResponse({"ok": True})


@require_GET
def me(request):
    if not request.user.is_authenticated:
        return _err("No has iniciado sesión", 401)
    return JsonResponse(_usuario(request.user))


@require_POST
def entrar(request):
    d = _body(request)
    user = authenticate(request, username=_txt(d, "username"), password=str(d.get("password") or ""))
    if user is None:
        auditoria.registrar("login_fallido", username=_txt(d, "username")[:150], request=request)
        return _err("Usuario o contraseña incorrectos", 401)
    login(request, user)
    auditoria.registrar("login", usuario=user, request=request)
    return JsonResponse(_usuario(user))


@require_POST
def salir(request):
    if request.user.is_authenticated:
        auditoria.registrar("logout", usuario=request.user, request=request)
    logout(request)
    return JsonResponse({"ok": True})


@require_POST
def agregar_stock(request, pk):
    d = _body(request)
    try:
        cantidad = _entero(d.get("cantidad"), "La cantidad", minimo=1)
        m = services.agregar_stock(pk, cantidad, proveedor=_txt(d, "proveedor"), notas=_txt(d, "notas"),
                                   usuario=request.user)
    except ValueError as e:
        return _err(str(e))
    except Consumible.DoesNotExist:
        return _err("Consumible no encontrado", 404)
    return JsonResponse(_mov(m), status=201)


@require_http_methods(["GET", "POST"])
def consumibles(request):
    if request.method == "GET":
        return JsonResponse([_cons(c) for c in Consumible.objects.all()], safe=False)
    d = _body(request)
    modelo = _txt(d, "modelo")
    if not modelo:
        return _err("El modelo es obligatorio")
    if Consumible.objects.filter(modelo__iexact=modelo).exists():
        return _err(f"Ya existe un consumible con el modelo '{modelo}'")
    try:
        c = Consumible.objects.create(
            modelo=modelo, descripcion=_txt(d, "descripcion"), marca=_txt(d, "marca"), notas=_txt(d, "notas"),
            stock=_entero(d.get("stock", 0), "El stock"), stock_minimo=_entero(d.get("stock_minimo", 1), "El mínimo"))
    except ValueError as e:
        return _err(str(e))
    auditoria.registrar("consumible_alta", usuario=request.user,
                        detalle=f"{c.modelo} (stock inicial {c.stock}, mínimo {c.stock_minimo})")
    return JsonResponse(_cons(c), status=201)


@require_http_methods(["PUT"])
def consumible_detalle(request, pk):
    try:
        c = Consumible.objects.get(pk=pk)
    except Consumible.DoesNotExist:
        return _err("Consumible no encontrado", 404)
    d = _body(request)
    try:
        for campo in ("descripcion", "marca", "notas"):
            if campo in d:
                setattr(c, campo, _txt(d, campo))
        if "stock_minimo" in d:
            c.stock_minimo = _entero(d["stock_minimo"], "El mínimo")
    except ValueError as e:
        return _err(str(e))
    c.save()
    cambios = ", ".join(f"{k}={_txt(d, k)}" for k in ("descripcion", "marca", "notas", "stock_minimo") if k in d)
    auditoria.registrar("consumible_edicion", usuario=request.user, detalle=f"{c.modelo}: {cambios}")
    return JsonResponse(_cons(c))


def _datos_impresora(d):
    datos = {k: _txt(d, k) for k in ("departamento", "marca", "modelo", "tipo")}
    if not datos["departamento"]:
        raise ValueError("El departamento es obligatorio")
    if not datos["modelo"]:
        raise ValueError("El modelo es obligatorio")
    return datos


@require_http_methods(["GET", "POST"])
def impresoras(request):
    if request.method == "GET":
        qs = Impresora.objects.prefetch_related("consumibles__consumible")
        return JsonResponse([_impresora(p) for p in qs], safe=False)
    try:
        p = Impresora.objects.create(**_datos_impresora(_body(request)))
        auditoria.registrar("impresora_alta", usuario=request.user,
                            detalle=f"{p.departamento}: {p.marca} {p.modelo}")
    except ValueError as e:
        return _err(str(e))
    return JsonResponse(_impresora(p), status=201)


@require_http_methods(["PUT", "DELETE"])
def impresora_detalle(request, pk):
    try:
        p = Impresora.objects.get(pk=pk)
    except Impresora.DoesNotExist:
        return _err("Impresora no encontrada", 404)
    if request.method == "DELETE":
        detalle = f"{p.departamento}: {p.marca} {p.modelo}"
        p.delete()
        auditoria.registrar("impresora_baja", usuario=request.user, detalle=detalle)
        return JsonResponse({"ok": True})
    try:
        datos = _datos_impresora(_body(request))
    except ValueError as e:
        return _err(str(e))
    for campo, valor in datos.items():
        setattr(p, campo, valor)
    p.save()
    auditoria.registrar("impresora_edicion", usuario=request.user,
                        detalle=f"{p.departamento}: {p.marca} {p.modelo}")
    return JsonResponse(_impresora(p))


@require_POST
def impresora_linea_nueva(request, pk):
    d = _body(request)
    try:
        p = Impresora.objects.get(pk=pk)
        c = Consumible.objects.get(pk=_entero(d.get("consumable_id"), "El consumible", minimo=1))
    except ValueError as e:
        return _err(str(e))
    except Impresora.DoesNotExist:
        return _err("Impresora no encontrada", 404)
    except Consumible.DoesNotExist:
        return _err("Consumible no encontrado", 404)
    if p.consumibles.filter(consumible=c).exists():
        return _err("Esa impresora ya tiene ese consumible")
    ImpresoraConsumible.objects.create(impresora=p, consumible=c, pieza=c.modelo, tipo_consumible=c.descripcion)
    auditoria.registrar("linea_alta", usuario=request.user,
                        detalle=f"{c.modelo} a {p.departamento}: {p.marca} {p.modelo}")
    return JsonResponse(_impresora(p), status=201)


@require_http_methods(["DELETE"])
def impresora_linea_detalle(request, pk):
    linea = ImpresoraConsumible.objects.select_related("impresora").filter(pk=pk).first()
    borradas, _detalle = ImpresoraConsumible.objects.filter(pk=pk).delete()
    if not borradas:
        return _err("Línea no encontrada", 404)
    auditoria.registrar("linea_baja", usuario=request.user,
                        detalle=f"{linea.pieza} de {linea.impresora.departamento}: "
                                f"{linea.impresora.marca} {linea.impresora.modelo}")
    return JsonResponse({"ok": True})


@require_GET
def departamentos(request):
    a = Impresora.objects.exclude(departamento="").values_list("departamento", flat=True)
    b = Movimiento.objects.exclude(departamento="").values_list("departamento", flat=True)
    return JsonResponse(sorted({d.strip() for d in list(a) + list(b)}, key=str.lower), safe=False)


@require_http_methods(["GET", "POST"])
def movimientos(request):
    if request.method == "GET":
        qs = Movimiento.objects.select_related("consumible", "usuario", "anulado_por")[:500]
        return JsonResponse([_mov(m) for m in qs], safe=False)
    d = _body(request)
    tipo = d.get("tipo", Movimiento.SALIDA)
    if tipo not in (Movimiento.SALIDA, Movimiento.ENTRADA):
        return _err("Tipo de movimiento no válido")
    try:
        cantidad = _entero(d.get("cantidad"), "La cantidad", minimo=1)
        consumible = Consumible.objects.get(pk=_entero(d.get("consumable_id"), "El consumible", minimo=1))
        m = services.registrar_salida(
            consumible=consumible, cantidad=cantidad, departamento=_txt(d, "departamento"),
            persona=_txt(d, "persona"), notas=_txt(d, "notas"), usuario=request.user)
    except ValueError as e:
        return _err(str(e))
    except Consumible.DoesNotExist:
        return _err("Consumible no encontrado", 404)
    except services.ErrorInventario as e:
        return _err(str(e))
    return JsonResponse(_mov(m), status=201)


@require_POST
def anular(request, pk):
    try:
        m = services.anular_movimiento(pk, usuario=request.user)
    except Movimiento.DoesNotExist:
        return _err("Movimiento no encontrado", 404)
    except services.ErrorInventario as e:
        return _err(str(e))
    return JsonResponse(_mov(m))

@require_http_methods(["GET", "POST"])
@solo_admin
def usuarios(request):
    User = get_user_model()
    if request.method == "GET":
        return JsonResponse([_usuario_admin(u) for u in User.objects.order_by("-is_staff", "username")], safe=False)
    d = _body(request)
    username = _txt(d, "username")
    password = str(d.get("password") or "")
    if not username:
        return _err("El usuario es obligatorio")
    if len(username) > 150:
        return _err("El usuario es demasiado largo")
    if len(password) < 6:
        return _err("La contraseña debe tener al menos 6 caracteres")
    if User.objects.filter(username__iexact=username).exists():
        return _err(f"Ya existe el usuario '{username}'")
    u = User.objects.create_user(username=username, password=password,
                                 first_name=_txt(d, "nombre")[:150], is_staff=bool(d.get("es_admin")))
    rol = "encargado" if u.is_staff else "becario"
    auditoria.registrar("usuario_alta", usuario=request.user, detalle=f"{u.username} ({rol})")
    return JsonResponse(_usuario_admin(u), status=201)


@require_http_methods(["PUT"])
@solo_admin
def usuario_detalle(request, pk):
    User = get_user_model()
    try:
        u = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return _err("Usuario no encontrado", 404)
    d = _body(request)
    propio = u.pk == request.user.pk
    cambios = []
    if "activo" in d:
        if propio and not d["activo"]:
            return _err("No puedes desactivar tu propio usuario")
        u.is_active = bool(d["activo"])
        cambios.append("activado" if u.is_active else "desactivado")
    if "es_admin" in d:
        if propio and not d["es_admin"]:
            return _err("No puedes quitarte el rol de encargado")
        u.is_staff = bool(d["es_admin"])
        cambios.append("ahora encargado" if u.is_staff else "ahora becario")
    if "nombre" in d:
        u.first_name = _txt(d, "nombre")[:150]
        cambios.append("nombre")
    if d.get("password"):
        nueva = str(d["password"])
        if len(nueva) < 6:
            return _err("La contraseña debe tener al menos 6 caracteres")
        u.set_password(nueva)
        cambios.append("contraseña nueva")
    u.save()
    if propio and d.get("password"):
        update_session_auth_hash(request, u)
    auditoria.registrar("usuario_edicion", usuario=request.user,
                        detalle=f"{u.username}: {', '.join(cambios) or 'sin cambios'}")
    return JsonResponse(_usuario_admin(u))


@require_GET
@solo_admin
def actividad(request):
    qs = Actividad.objects.all()
    usuario = request.GET.get("usuario", "").strip()
    accion = request.GET.get("accion", "").strip()
    acciones = [x.strip() for x in request.GET.get("acciones", "").split(",") if x.strip()]
    if usuario:
        qs = qs.filter(username=usuario)
    if accion:
        qs = qs.filter(accion=accion)
    elif acciones:
        qs = qs.filter(accion__in=acciones)
    return JsonResponse([{
        "id": a.pk, "fecha": timezone.localtime(a.fecha).strftime("%Y-%m-%d %H:%M"),
        "username": a.username, "accion": a.accion, "accion_texto": a.get_accion_display(),
        "detalle": a.detalle, "ip": a.ip or ""} for a in qs[:300]], safe=False)


DIST = settings.BASE_DIR / "frontend" / "dist"

SIN_COMPILAR = """<!doctype html><meta charset="utf-8"><title>Falta compilar</title>
<body style="font-family:system-ui;max-width:640px;margin:60px auto">
<h2>Falta compilar la interfaz React</h2>
<p>El servidor funciona, pero aún no existe <code>frontend/dist</code>. Corre una sola vez:</p>
<pre>cd frontend
npm install
npm run build</pre><p>y recarga esta página.</p></body>"""


@ensure_csrf_cookie
def spa(request, *args, **kwargs):
    index = DIST / "index.html"
    if not index.exists():
        return HttpResponse(SIN_COMPILAR, status=503)
    return HttpResponse(index.read_text(encoding="utf-8"))