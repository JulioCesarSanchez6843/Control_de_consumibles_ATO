from django.urls import path

from . import api

urlpatterns = [
    path("csrf", api.csrf),
    path("login", api.entrar),
    path("logout", api.salir),
    path("me", api.me),
    path("users", api.usuarios),
    path("users/<int:pk>", api.usuario_detalle),
    path("activity", api.actividad),
    path("consumables", api.consumibles),
    path("consumables/<int:pk>", api.consumible_detalle),
    path("consumables/<int:pk>/agregar", api.agregar_stock),
    path("printers", api.impresoras),
    path("printers/<int:pk>", api.impresora_detalle),
    path("printers/<int:pk>/lineas", api.impresora_linea_nueva),
    path("printers/lineas/<int:pk>", api.impresora_linea_detalle),
    path("departamentos", api.departamentos),
    path("movements", api.movimientos),
    path("movements/<int:pk>/anular", api.anular),
]