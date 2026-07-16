from django.utils import timezone
from datetime import timedelta
from rest_framework import status, generics, permissions, parsers
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings

from .models import (
    EmailVerificationToken, PasswordResetToken,
    Skill, Achievement, Interest, ActivityLog, UserSettings, UserPreferences,
)
from .serializers import (
    RegisterSerializer, LoginSerializer, UserSerializer,
    ChangePasswordSerializer, ForgotPasswordSerializer,
    ResetPasswordSerializer, UpdateProfileSerializer,
    SkillSerializer, AchievementSerializer, InterestSerializer,
    ActivityLogSerializer, UserSettingsSerializer, UserPreferencesSerializer,
)

User = get_user_model()


def _tokens(user):
    refresh = RefreshToken.for_user(user)
    refresh['role'] = user.role
    refresh['email'] = user.email
    refresh['full_name'] = user.full_name
    return {'refresh': str(refresh), 'access': str(refresh.access_token)}


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        s = self.get_serializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = s.save()
        tok = EmailVerificationToken.objects.create(
            user=user, expires_at=timezone.now() + timedelta(hours=24)
        )
        send_mail(
            'Verify your email',
            f'{settings.FRONTEND_URL}/verify-email?token={tok.token}',
            settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=True,
        )
        return Response({'user': UserSerializer(user).data, 'tokens': _tokens(user)},
                        status=status.HTTP_201_CREATED)


class LoginView(generics.GenericAPIView):
    serializer_class = LoginSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        s = self.get_serializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = s.validated_data['user']
        return Response({'user': UserSerializer(user).data, 'tokens': _tokens(user)})


class LogoutView(generics.GenericAPIView):
    def post(self, request):
        try:
            RefreshToken(request.data.get('refresh')).blacklist()
            return Response({'message': 'Logged out'})
        except Exception:
            return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

    def patch(self, request, *args, **kwargs):
        s = UpdateProfileSerializer(request.user, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(UserSerializer(request.user).data)

    put = patch


class AvatarUploadView(generics.GenericAPIView):
    parser_classes = [parsers.MultiPartParser]

    def post(self, request):
        file = request.FILES.get('avatar')
        if not file:
            return Response({'error': 'No file'}, status=400)
        request.user.avatar = file
        request.user.save(update_fields=['avatar'])
        return Response({'avatar': request.build_absolute_uri(request.user.avatar.url)})


class SkillViewSet(generics.ListCreateAPIView):
    serializer_class = SkillSerializer

    def get_queryset(self):
        return Skill.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class SkillDetailView(generics.DestroyAPIView):
    serializer_class = SkillSerializer

    def get_queryset(self):
        return Skill.objects.filter(user=self.request.user)


class InterestViewSet(generics.ListCreateAPIView):
    serializer_class = InterestSerializer

    def get_queryset(self):
        return Interest.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class InterestDetailView(generics.DestroyAPIView):
    serializer_class = InterestSerializer

    def get_queryset(self):
        return Interest.objects.filter(user=self.request.user)


class AchievementListView(generics.ListAPIView):
    serializer_class = AchievementSerializer

    def get_queryset(self):
        return Achievement.objects.filter(user=self.request.user)


class ActivityListView(generics.ListAPIView):
    serializer_class = ActivityLogSerializer

    def get_queryset(self):
        return ActivityLog.objects.filter(user=self.request.user)


class SettingsView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSettingsSerializer

    def get_object(self):
        obj, _ = UserSettings.objects.get_or_create(user=self.request.user)
        return obj

    def patch(self, request, *args, **kwargs):
        obj = self.get_object()
        s = self.get_serializer(obj, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        # sync timezone to user
        if 'timezone' in request.data:
            request.user.timezone = request.data['timezone']
            request.user.save(update_fields=['timezone'])
        return Response(s.data)

    put = patch


class DeleteAccountView(generics.DestroyAPIView):
    def delete(self, request, *args, **kwargs):
        user = request.user
        user.is_active = False
        user.email = f'deleted_{user.id}@deleted.invalid'
        user.save(update_fields=['is_active', 'email'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class VerifyEmailView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        try:
            tok = EmailVerificationToken.objects.get(token=request.data.get('token'), is_used=False)
            if tok.expires_at < timezone.now():
                return Response({'error': 'Token expired'}, status=400)
            tok.user.is_verified = True
            tok.user.save()
            tok.is_used = True
            tok.save()
            return Response({'message': 'Email verified'})
        except EmailVerificationToken.DoesNotExist:
            return Response({'error': 'Invalid token'}, status=400)


class ForgotPasswordView(generics.GenericAPIView):
    serializer_class = ForgotPasswordSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        s = self.get_serializer(data=request.data)
        s.is_valid(raise_exception=True)
        try:
            user = User.objects.get(email=s.validated_data['email'])
            tok = PasswordResetToken.objects.create(
                user=user, expires_at=timezone.now() + timedelta(hours=1)
            )
            send_mail(
                'Reset your password',
                f'{settings.FRONTEND_URL}/reset-password?token={tok.token}',
                settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=True,
            )
        except User.DoesNotExist:
            pass
        return Response({'message': 'If the email exists, a reset link has been sent.'})


class ResetPasswordView(generics.GenericAPIView):
    serializer_class = ResetPasswordSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        s = self.get_serializer(data=request.data)
        s.is_valid(raise_exception=True)
        try:
            tok = PasswordResetToken.objects.get(token=s.validated_data['token'], is_used=False)
            if tok.expires_at < timezone.now():
                return Response({'error': 'Token expired'}, status=400)
            tok.user.set_password(s.validated_data['new_password'])
            tok.user.save()
            tok.is_used = True
            tok.save()
            return Response({'message': 'Password reset successfully'})
        except PasswordResetToken.DoesNotExist:
            return Response({'error': 'Invalid token'}, status=400)


class ChangePasswordView(generics.GenericAPIView):
    serializer_class = ChangePasswordSerializer

    def post(self, request):
        s = self.get_serializer(data=request.data, context={'request': request})
        s.is_valid(raise_exception=True)
        request.user.set_password(s.validated_data['new_password'])
        request.user.save()
        return Response({'message': 'Password changed'})


class PreferencesView(generics.RetrieveUpdateAPIView):
    serializer_class = UserPreferencesSerializer

    def get_object(self):
        obj, _ = UserPreferences.objects.get_or_create(user=self.request.user)
        return obj

    def put(self, request, *args, **kwargs):
        return self.patch(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        obj = self.get_object()
        s = self.get_serializer(obj, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(s.data)
