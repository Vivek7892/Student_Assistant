from rest_framework.permissions import BasePermission, SAFE_METHODS
from .models import User


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.Role.ADMIN


class IsTeacherOrAdmin(BasePermission):
    """Kept for import compatibility — now only admin passes."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.Role.ADMIN


class IsStudent(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.Role.STUDENT


class IsOwnerOrAdmin(BasePermission):
    """Object-level: owner field can be `user`, `student`, `created_by`, or the object itself."""
    def has_object_permission(self, request, view, obj):
        if request.user.role == User.Role.ADMIN:
            return True
        for field in ('user', 'student', 'created_by'):
            owner = getattr(obj, field, None)
            if owner is not None:
                return owner == request.user
        return obj == request.user


class IsOwnerOrAdminReadOnly(BasePermission):
    """Safe methods allowed for authenticated users; write only for owner/admin."""
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return request.user.is_authenticated
        if request.user.role == User.Role.ADMIN:
            return True
        for field in ('user', 'student', 'created_by', 'uploaded_by'):
            owner = getattr(obj, field, None)
            if owner is not None:
                return owner == request.user
        return obj == request.user
