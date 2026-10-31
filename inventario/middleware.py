from django.db import DataError
from django.http import JsonResponse

LIBRES = ("/api/csrf", "/api/login", "/api/logout", "/api/me")


class ExigirLogin:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith("/api/") and request.path not in LIBRES and not request.user.is_authenticated:
            return JsonResponse({"detail": "Inicia sesión para continuar"}, status=401)
        return self.get_response(request)


    def process_exception(self, request, exception):
        if request.path.startswith("/api/") and isinstance(exception, DataError):
            return JsonResponse({"detail": "Algún dato es demasiado largo o demasiado grande"}, status=400)
        return None
    