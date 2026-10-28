"""API JSON que consume el React. Mismas reglas de stock que services.py."""
import json

from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from . import services
from .models import Consumible, Impresora, Movimiento


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


# ---------- serializadores ----------
def _cons(c):
    return {"id": c.pk, "modelo": c.modelo, "descripcion": c.descripcion, "marca": c.marca,
            "notas": c.notas, "stock": c.stock, "stock_minimo": c.stock_minimo}


def _mov(m):
    return {"id": m.pk, "fecha": timezone.localtime(m.fecha).strftime("%Y-%m-%d %H:%M"), "tipo": m.tipo,
            "consumable_id": m.consumible_id, "cantidad": m.cantidad, "departamento": m.departamento,
            "persona": m.persona, "notas": m.notas, "anulado": m.anulado,
            "modelo": m.consumible.modelo, "descripcion": m.consumible.descripcion,
            "stock_actual": m.consumible.stock}


def _impresora(p):
    return {"id": p.pk, "marca": p.marca, "modelo": p.modelo, "tipo": p.tipo, "departamento": p.departamento,
            "consumibles": [{
                "id": ln.pk, "tipo_consumible": ln.tipo_consumible, "pieza": ln.pieza,
                "cantidad": ln.cantidad, "consumable_id": ln.consumible_id,
                "stock_actual": ln.consumible.stock if ln.consumible else None,
            } for ln in p.consumibles.all()]}


# ---------- rutas ----------
@ensure_csrf_cookie
@require_GET
def csrf(request):
    return JsonResponse({"ok": True})

@require_POST
def agregar_stock(request, pk):
    d = _body(request)
    try:
        cantidad = _entero(d.get("cantidad"), "La cantidad", minimo=1)
        m = services.agregar_stock(pk, cantidad, proveedor=_txt(d, "proveedor"), notas=_txt(d, "notas"))
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
    return JsonResponse(_cons(c), status=201)


@require_http_methods(["PUT"])
def consumible_detalle(request, pk):
    try:
        c = Consumible.objects.get(pk=pk)
    except Consumible.DoesNotExist:
        return _err("Consumible no encontrado", 404)
    d = _body(request)  # el stock NO se edita aquí: solo cambia con movimientos
    try:
        for campo in ("descripcion", "marca", "notas"):
            if campo in d:
                setattr(c, campo, _txt(d, campo))
        if "stock_minimo" in d:
            c.stock_minimo = _entero(d["stock_minimo"], "El mínimo")
    except ValueError as e:
        return _err(str(e))
    c.save()
    return JsonResponse(_cons(c))


@require_GET
def impresoras(request):
    qs = Impresora.objects.prefetch_related("consumibles__consumible")
    return JsonResponse([_impresora(p) for p in qs], safe=False)


@require_GET
def departamentos(request):
    a = Impresora.objects.exclude(departamento="").values_list("departamento", flat=True)
    b = Movimiento.objects.exclude(departamento="").values_list("departamento", flat=True)
    return JsonResponse(sorted({d.strip() for d in list(a) + list(b)}, key=str.lower), safe=False)


@require_http_methods(["GET", "POST"])
def movimientos(request):
    if request.method == "GET":
        qs = Movimiento.objects.select_related("consumible")[:500]
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
            persona=_txt(d, "persona"), notas=_txt(d, "notas"))
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
        m = services.anular_movimiento(pk)
    except Movimiento.DoesNotExist:
        return _err("Movimiento no encontrado", 404)
    except services.ErrorInventario as e:
        return _err(str(e))
    return JsonResponse(_mov(m))


# ---------- sirve el React compilado ----------
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
