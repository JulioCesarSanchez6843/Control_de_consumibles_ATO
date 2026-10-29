from django.contrib import admin

from .models import Actividad, Consumible, Impresora, ImpresoraConsumible, Movimiento


@admin.register(Consumible)
class ConsumibleAdmin(admin.ModelAdmin):
    list_display = ("modelo", "descripcion", "marca", "stock", "stock_minimo")
    search_fields = ("modelo", "descripcion", "marca")

    def get_readonly_fields(self, request, obj=None):
        return ("stock",) if obj else ()


class LineaInline(admin.TabularInline):
    model = ImpresoraConsumible
    extra = 1


@admin.register(Impresora)
class ImpresoraAdmin(admin.ModelAdmin):
    list_display = ("departamento", "marca", "modelo", "tipo")
    search_fields = ("departamento", "marca", "modelo")
    inlines = [LineaInline]


@admin.register(Movimiento)
class MovimientoAdmin(admin.ModelAdmin):
    list_display = ("id", "fecha", "tipo", "consumible", "cantidad", "departamento", "persona", "usuario", "anulado")
    list_filter = ("tipo", "anulado")
    readonly_fields = ("fecha", "tipo", "consumible", "cantidad", "anulado", "usuario", "anulado_por")


@admin.register(Actividad)
class ActividadAdmin(admin.ModelAdmin):
    list_display = ("id", "fecha", "username", "accion", "detalle", "movimiento", "ip")
    list_filter = ("accion", "usuario")
    search_fields = ("username", "detalle")
    date_hierarchy = "fecha"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False