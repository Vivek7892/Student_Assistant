from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User, UserRole, UserSettings, StudentProfile, UserPreferences


@receiver(post_save, sender=User)
def bootstrap_new_user(sender, instance, created, **kwargs):
    if not created:
        return
    UserRole.objects.get_or_create(user=instance, role=UserRole.Role.STUDENT)
    UserSettings.objects.get_or_create(user=instance)
    StudentProfile.objects.get_or_create(user=instance)
    UserPreferences.objects.get_or_create(user=instance)
