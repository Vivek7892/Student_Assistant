"""
Google OAuth2 Authorization Code → JWT exchange.
Flow:
  1. Frontend redirects user to Google consent screen
  2. Google redirects back with ?code=...
  3. Frontend POSTs { code, redirect_uri } to /api/auth/google/
  4. Backend exchanges code for Google tokens, fetches user info,
     creates/updates local User, returns our JWT pair.
"""
import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

GOOGLE_TOKEN_URL   = 'https://oauth2.googleapis.com/token'
GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'


def _get_tokens(user):
    refresh = RefreshToken.for_user(user)
    refresh['role']      = user.role
    refresh['email']     = user.email
    refresh['full_name'] = user.full_name
    return {'refresh': str(refresh), 'access': str(refresh.access_token)}


@api_view(['POST'])
@permission_classes([AllowAny])
def google_oauth_callback(request):
    code         = request.data.get('code')
    redirect_uri = request.data.get('redirect_uri')

    if not code or not redirect_uri:
        return Response({'error': 'code and redirect_uri are required'}, status=status.HTTP_400_BAD_REQUEST)

    client_id     = getattr(settings, 'GOOGLE_CLIENT_ID', '')
    client_secret = getattr(settings, 'GOOGLE_CLIENT_SECRET', '')

    if not client_id or not client_secret:
        return Response({'error': 'Google OAuth is not configured on the server'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    # Exchange code for tokens
    token_resp = requests.post(GOOGLE_TOKEN_URL, data={
        'code':          code,
        'client_id':     client_id,
        'client_secret': client_secret,
        'redirect_uri':  redirect_uri,
        'grant_type':    'authorization_code',
    }, timeout=10)

    if not token_resp.ok:
        return Response({'error': 'Failed to exchange code with Google'}, status=status.HTTP_400_BAD_REQUEST)

    access_token = token_resp.json().get('access_token')

    # Fetch user info
    info_resp = requests.get(GOOGLE_USERINFO_URL, headers={'Authorization': f'Bearer {access_token}'}, timeout=10)
    if not info_resp.ok:
        return Response({'error': 'Failed to fetch Google user info'}, status=status.HTTP_400_BAD_REQUEST)

    info = info_resp.json()
    email      = info.get('email', '').lower()
    first_name = info.get('given_name', '')
    last_name  = info.get('family_name', '') or '.'
    avatar     = info.get('picture', '')

    if not email:
        return Response({'error': 'No email returned from Google'}, status=status.HTTP_400_BAD_REQUEST)

    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            'first_name':     first_name,
            'last_name':      last_name,
            'avatar':         avatar,
            'oauth_provider': 'google',
            'is_verified':    True,
        }
    )

    if not created:
        # Update avatar / name if changed
        updated = False
        if avatar and user.avatar != avatar:
            user.avatar = avatar; updated = True
        if not user.oauth_provider:
            user.oauth_provider = 'google'; updated = True
        if not user.is_verified:
            user.is_verified = True; updated = True
        if updated:
            user.save(update_fields=['avatar', 'oauth_provider', 'is_verified'])

    from apps.accounts.serializers import UserSerializer
    return Response({
        'user':   UserSerializer(user).data,
        'tokens': _get_tokens(user),
    })
