import re
import zipfile
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

PLANTILLA = Path(__file__).resolve().parent / "plantillas" / "requisicion.xlsm"
CATEGORIAS = [
    "ESTETICA AUTOMOTRIZ", "PAPELERIA", "CONSUMIBLES", "MATERIAL DE LIMPIEZA", "IMPRESOS", "PUBLICIDAD",
    "REFACCIONES", "SERVICIO", "ESTEREOS Y PELICULAS", "H Y P", "SEGURIDAD", "EQUIPO DE COMPUTO", "EVENTOS",
]
COLUMNAS = "ABCDEFGHIJKLM"
FILAS = [20 + 2 * i for i in range(13)]
TASA_IVA = Decimal("0.16")
CENTAVOS = Decimal("0.01")


def _limpio(texto):
    return re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", str(texto or "")).strip()


def _txt(d, clave, limite=200):
    return _limpio(d.get(clave))[:limite]


def _dec(valor, nombre):
    s = _limpio(valor).replace(",", "")
    if s == "":
        return None
    try:
        n = Decimal(s)
    except InvalidOperation:
        raise ValueError(f"{nombre} no es un número válido")
    if not n.is_finite() or abs(n) > Decimal("1000000000000"):
        raise ValueError(f"{nombre} no es un número válido")
    return n


def _fecha(valor, nombre, obligatoria):
    s = _limpio(valor)
    if not s:
        if obligatoria:
            raise ValueError(f"Falta {nombre}")
        return ""
    try:
        return datetime.strptime(s, "%Y-%m-%d").strftime("%d/%m/%Y")
    except ValueError:
        raise ValueError(f"{nombre.capitalize()} no es una fecha válida")


def normalizar(d):
    empresa = _txt(d, "empresa")
    departamento = _txt(d, "departamento")
    solicitante = _txt(d, "solicitante")
    if not empresa:
        raise ValueError("Falta la empresa")
    if not departamento:
        raise ValueError("Falta el departamento solicitante")
    if not solicitante:
        raise ValueError("Falta quién solicita")
    lineas = []
    for l in (d.get("lineas") if isinstance(d.get("lineas"), list) else [])[: len(FILAS)]:
        if not isinstance(l, dict):
            continue
        descripcion = _txt(l, "descripcion", 300)
        precio = _dec(l.get("precio"), "El precio unitario")
        if not descripcion and precio is None:
            continue
        lineas.append({
            "cantidad": _dec(l.get("cantidad"), "La cantidad"),
            "unidad": _txt(l, "unidad", 30).upper(),
            "descripcion": descripcion,
            "precio": precio,
        })
    if not any(l["descripcion"] for l in lineas):
        raise ValueError("Agrega al menos un artículo con descripción")
    categorias = d.get("categorias") if isinstance(d.get("categorias"), list) else []
    presupuesto = _txt(d, "presupuesto", 5).upper()
    return {
        "empresa": empresa,
        "folio": _txt(d, "folio", 40),
        "departamento": departamento.upper(),
        "solicitante": solicitante,
        "fecha_solicitud": _fecha(d.get("fechaSolicitud"), "la fecha de solicitud", True),
        "fecha_necesita": _fecha(d.get("fechaNecesita"), "la fecha en que se necesita", False),
        "categorias": [c for c in CATEGORIAS if c in categorias],
        "presupuesto": presupuesto if presupuesto in ("SÍ", "NO") else "",
        "proveedor": _txt(d, "proveedor", 150),
        "lineas": lineas,
        "subtotal": _dec(d.get("subtotal"), "El subtotal"),
        "iva": _dec(d.get("iva"), "El IVA"),
        "isr": _dec(d.get("isr"), "La retención de ISR"),
        "total": _dec(d.get("total"), "El total"),
        "observaciones": re.sub(r"\s*\n\s*", " ", _limpio(d.get("observaciones")))[:600],
    }


def _num(n):
    return format(Decimal(n).normalize(), "f") if n != 0 else "0"


def _poner(xml, ref, texto=None, numero=None, formula=None, cache=None):
    patron = re.compile(r'<c r="%s"((?: [A-Za-z:]+="[^"]*")*)\s*(?:/>|>.*?</c>)' % ref, re.S)
    m = patron.search(xml)
    if not m:
        raise ValueError(f"La plantilla no tiene la celda {ref}")
    estilo = re.search(r' s="(\d+)"', m.group(1))
    s = f' s="{estilo.group(1)}"' if estilo else ""
    if texto is not None:
        nuevo = f'<c r="{ref}"{s} t="inlineStr"><is><t xml:space="preserve">{escape(texto)}</t></is></c>'
    elif formula is not None:
        nuevo = f'<c r="{ref}"{s}><f>{escape(formula)}</f><v>{_num(cache)}</v></c>'
    elif numero is not None:
        nuevo = f'<c r="{ref}"{s}><v>{_num(numero)}</v></c>'
    else:
        nuevo = f'<c r="{ref}"{s}/>'
    return xml[: m.start()] + nuevo + xml[m.end():]


def _con_etiqueta(etiqueta, valor):
    return f"{etiqueta} {valor}" if valor else etiqueta


def _hoja(xml, d):
    xml = _poner(xml, "K2", texto=d["folio"]) if d["folio"] else _poner(xml, "K2")
    xml = _poner(xml, "D3", texto=d["empresa"])
    xml = _poner(xml, "D4")
    xml = _poner(xml, "L4", texto=d["departamento"])
    xml = _poner(xml, "A6", texto=_con_etiqueta("DEPARTAMENTO SOLICITANTE:", d["departamento"]))
    xml = _poner(xml, "A8", texto=_con_etiqueta("SOLICITADO POR:", d["solicitante"]))
    xml = _poner(xml, "J7", texto=d["fecha_solicitud"])
    xml = _poner(xml, "J9", texto=d["fecha_necesita"]) if d["fecha_necesita"] else _poner(xml, "J9")

    for i, nombre in enumerate(CATEGORIAS):
        ref = f"{COLUMNAS[i]}12"
        xml = _poner(xml, ref, texto="X") if nombre in d["categorias"] else _poner(xml, ref)

    xml = _poner(xml, "A14", texto=_con_etiqueta("ENTRA EN PRESUPUESTO AUTORIZADO POR CONSEJO:", d["presupuesto"]))
    xml = _poner(xml, "A16", texto=_con_etiqueta("PROVEEDOR SUGERIDO:", d["proveedor"]))

    subtotal_auto = Decimal(0)
    for i, fila in enumerate(FILAS):
        if i >= len(d["lineas"]):
            for col in "ACDKM":
                xml = _poner(xml, f"{col}{fila}")
            continue
        l = d["lineas"][i]
        xml = _poner(xml, f"A{fila}", numero=l["cantidad"]) if l["cantidad"] is not None else _poner(xml, f"A{fila}")
        xml = _poner(xml, f"C{fila}", texto=l["unidad"]) if l["unidad"] else _poner(xml, f"C{fila}")
        xml = _poner(xml, f"D{fila}", texto=l["descripcion"]) if l["descripcion"] else _poner(xml, f"D{fila}")
        if l["precio"] is None:
            xml = _poner(xml, f"K{fila}")
            xml = _poner(xml, f"M{fila}")
            continue
        importe = (l["cantidad"] or Decimal(0)) * l["precio"]
        subtotal_auto += importe
        xml = _poner(xml, f"K{fila}", numero=l["precio"])
        xml = _poner(xml, f"M{fila}", formula=f"A{fila}*K{fila}", cache=importe.quantize(CENTAVOS, ROUND_HALF_UP))

    subtotal = d["subtotal"] if d["subtotal"] is not None else subtotal_auto
    iva = d["iva"] if d["iva"] is not None else subtotal * TASA_IVA
    isr = d["isr"] if d["isr"] is not None else Decimal(0)
    total = d["total"] if d["total"] is not None else subtotal + iva - isr
    redondo = lambda n: n.quantize(CENTAVOS, ROUND_HALF_UP)

    if d["subtotal"] is not None:
        xml = _poner(xml, "M45", numero=d["subtotal"])
    else:
        xml = _poner(xml, "M45", formula="SUM(M17:M44)", cache=redondo(subtotal))
    if d["iva"] is not None:
        xml = _poner(xml, "M46", numero=d["iva"])
    else:
        xml = _poner(xml, "M46", formula="M45*0.16", cache=redondo(iva))
    xml = _poner(xml, "M47", numero=d["isr"]) if d["isr"] is not None else _poner(xml, "M47")
    if d["total"] is not None:
        xml = _poner(xml, "M48", numero=d["total"])
    else:
        xml = _poner(xml, "M48", formula="SUM(M45+M46)-M47", cache=redondo(total))

    xml = _poner(xml, "A49", texto=_con_etiqueta("OBSERVACIONES:", d["observaciones"]))
    return xml


def generar(d):
    with zipfile.ZipFile(PLANTILLA) as z:
        entradas = [(info.filename, z.read(info.filename)) for info in z.infolist()]
    salida = BytesIO()
    with zipfile.ZipFile(salida, "w", zipfile.ZIP_DEFLATED) as out:
        for nombre, datos in entradas:
            if nombre == "xl/calcChain.xml":
                continue
            if nombre == "xl/worksheets/sheet1.xml":
                datos = _hoja(datos.decode("utf-8"), d).encode("utf-8")
            elif nombre == "xl/workbook.xml":
                texto = datos.decode("utf-8")
                texto = re.sub(r"<calcPr([^>]*?)/>", r'<calcPr\1 fullCalcOnLoad="1"/>', texto)
                datos = texto.encode("utf-8")
            elif nombre == "xl/_rels/workbook.xml.rels":
                datos = re.sub(r"<Relationship [^>]*calcChain[^>]*/>", "", datos.decode("utf-8")).encode("utf-8")
            elif nombre == "[Content_Types].xml":
                datos = re.sub(r"<Override [^>]*calcChain[^>]*/>", "", datos.decode("utf-8")).encode("utf-8")
            out.writestr(nombre, datos)
    return salida.getvalue()