from django.urls import path

from . import api

urlpatterns = [
    path("csrf", api.csrf),
    path("consumables", api.consumibles),
    path("consumables/<int:pk>", api.consumible_detalle),
    path("consumables/<int:pk>/agregar", api.agregar_stock),
    path("printers", api.impresoras),
    path("departamentos", api.departamentos),
    path("movements", api.movimientos),
    path("movements/<int:pk>/anular", api.anular),
]
