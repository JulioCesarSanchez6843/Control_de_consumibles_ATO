from django.contrib import admin

from .models import Consumible, Impresora, ImpresoraConsumible, Movimiento


@admin.register(Consumible)
class ConsumibleAdmin(admin.ModelAdmin):
    list_display = ("modelo", "descripcion", "marca", "stock", "stock_minimo")
    search_fields = ("modelo", "descripcion", "marca")

    def get_readonly_fields(self, request, obj=None):
        # El stock solo cambia con movimientos, para que la bitácora siempre cuadre
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
    list_display = ("id", "fecha", "tipo", "consumible", "cantidad", "departamento", "persona", "anulado")
    list_filter = ("tipo", "anulado")
    readonly_fields = ("fecha", "tipo", "consumible", "cantidad", "anulado")
