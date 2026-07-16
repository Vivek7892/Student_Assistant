from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, UserRole, StudentProfile, TeacherProfile, UserPreferences


class UserRoleInline(admin.TabularInline):
    model = UserRole
    extra = 0

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'full_name', 'role', 'is_verified', 'created_at']
    list_filter = ['roles__role', 'is_verified', 'is_active']
    search_fields = ['email', 'full_name']
    ordering = ['-created_at']
    readonly_fields = ['role', 'created_at', 'updated_at']
    inlines = [UserRoleInline]
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('full_name', 'avatar', 'role')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'is_verified')}),
        ('Important dates', {'fields': ('created_at', 'updated_at')}),
    )
    add_fieldsets = (
        (None, {'fields': ('email', 'full_name', 'password1', 'password2')}),
    )

admin.site.register(StudentProfile)
admin.site.register(TeacherProfile)
admin.site.register(UserPreferences)
