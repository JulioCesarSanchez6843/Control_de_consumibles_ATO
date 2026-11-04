from django.urls import path

from . import api

urlpatterns = [
    path("csrf", api.csrf),
    path("login", api.entrar),
    path("logout", api.salir),
    path("me", api.me),
    path("me/perfil", api.perfil),
    path("me/preferencias", api.preferencias),
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
    path("requisicion/excel", api.requisicion_excel),
    path("purchase-notes", api.notas_compra),
    path("purchase-notes/requisicion", api.notas_a_requisicion),
    path("purchase-notes/<int:pk>", api.nota_compra_detalle),
]