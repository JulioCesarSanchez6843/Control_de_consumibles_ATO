from django.core.paginator import Paginator
from django.http import JsonResponse

FILAS_DEFECTO = 25
FILAS_MAXIMO = 100


def _natural(valor, defecto, maximo=None):
    try:
        n = int(valor)
    except (TypeError, ValueError):
        return defecto
    if n < 1:
        return defecto
    return min(n, maximo) if maximo else n


def paginar(request, qs, serializar, extra=None):
    filas = _natural(request.GET.get("filas"), FILAS_DEFECTO, FILAS_MAXIMO)
    pagina = _natural(request.GET.get("pagina"), 1)
    paginador = Paginator(qs, filas)
    actual = paginador.get_page(pagina)
    datos = {
        "resultados": [serializar(x) for x in actual.object_list],
        "total": paginador.count,
        "pagina": actual.number,
        "paginas": paginador.num_pages,
        "filas": filas,
    }
    if extra:
        datos.update(extra)
    return JsonResponse(datos)