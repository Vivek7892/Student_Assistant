from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from .google_oauth import google_oauth_callback

urlpatterns = [
    # auth
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('verify-email/', views.VerifyEmailView.as_view(), name='verify-email'),
    path('forgot-password/', views.ForgotPasswordView.as_view(), name='forgot-password'),
    path('reset-password/', views.ResetPasswordView.as_view(), name='reset-password'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change-password'),
    path('google/', google_oauth_callback, name='google-oauth'),
    # profile
    path('me/', views.MeView.as_view(), name='me'),
    path('me/avatar/', views.AvatarUploadView.as_view(), name='me-avatar'),
    path('me/skills/', views.SkillViewSet.as_view(), name='me-skills'),
    path('me/skills/<int:pk>/', views.SkillDetailView.as_view(), name='me-skill-detail'),
    path('me/interests/', views.InterestViewSet.as_view(), name='me-interests'),
    path('me/interests/<int:pk>/', views.InterestDetailView.as_view(), name='me-interest-detail'),
    path('me/achievements/', views.AchievementListView.as_view(), name='me-achievements'),
    path('me/activity/', views.ActivityListView.as_view(), name='me-activity'),
    path('me/settings/', views.SettingsView.as_view(), name='me-settings'),
    path('me/', views.DeleteAccountView.as_view(), name='me-delete'),
    # legacy
    path('preferences/', views.PreferencesView.as_view(), name='preferences'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh-legacy'),
]
