from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import FolderViewSet, DocumentViewSet

router = SimpleRouter()
router.register('folders', FolderViewSet, basename='folder')
router.register('', DocumentViewSet, basename='document')

urlpatterns = [path('', include(router.urls))]
