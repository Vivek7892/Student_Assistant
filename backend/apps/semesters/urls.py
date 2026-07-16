from django.urls import path, include
from rest_framework_nested import routers
from .views import SemesterViewSet, SubjectViewSet

router = routers.SimpleRouter()
router.register('', SemesterViewSet, basename='semester')

subjects_router = routers.NestedSimpleRouter(router, '', lookup='semester')
subjects_router.register('subjects', SubjectViewSet, basename='semester-subject')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(subjects_router.urls)),
]
