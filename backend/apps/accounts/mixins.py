from .models import ActivityLog


class ActivityLogMixin:
    """Add to any APIView/ViewSet to log authenticated write operations."""
    activity_action = None  # override in subclass or auto-detect

    def _log(self, request, action, metadata=None):
        if request.user and request.user.is_authenticated:
            ActivityLog.objects.create(
                user=request.user,
                action=action,
                metadata=metadata or {},
            )

    def perform_create(self, serializer):
        super().perform_create(serializer)
        self._log(self.request, self.activity_action or f'created {self.__class__.__name__}')

    def perform_update(self, serializer):
        super().perform_update(serializer)
        self._log(self.request, self.activity_action or f'updated {self.__class__.__name__}')

    def perform_destroy(self, instance):
        self._log(self.request, self.activity_action or f'deleted {self.__class__.__name__}')
        super().perform_destroy(instance)
