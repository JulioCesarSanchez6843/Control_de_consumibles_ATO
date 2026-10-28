from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve

from inventario.api import DIST, spa

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("inventario.urls")),
    re_path(r"^static/(?P<path>.*)$", serve, {"document_root": settings.BASE_DIR / "static"}),
    re_path(r"^assets/(?P<path>.*)$", serve, {"document_root": DIST / "assets"}),
    re_path(r"^.*$", spa),  # cualquier otra ruta -> la app React
]
