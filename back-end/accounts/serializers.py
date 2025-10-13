# GRC/accounts/serializers.py
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, Role, UserSettings, Organization
from auditing.utils import create_log

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['email'] = user.email
        # Include both organization ID and name for frontend compatibility
        if user.organization:
            token['organization'] = {
                'id': user.organization.id,
                'name': user.organization.name
            }
        else:
            token['organization'] = None
        token['status'] = getattr(user, 'status', 'N/A')
        token['role'] = user.role.name if user.role else None
        return token
    
    def validate(self, attrs):
        data = super().validate(attrs)
        create_log(
            user=self.user, 
            action="User logged in", 
            module="Authentication",
            level="info",
            details=f"Successful login for user: {self.user.username}"
        )
        return data

class SignUpSerializer(serializers.ModelSerializer):
    organization = serializers.CharField(write_only=True, max_length=255)
    class Meta:
        model = User
        fields = ('username', 'password', 'email', 'first_name', 'last_name', 'organization')
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        organization_name = validated_data.pop('organization')
        organization, created = Organization.objects.get_or_create(name=organization_name)
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            organization=organization
        )
        return user

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'name']

# --- NEW: Add a serializer for the Organization model ---
class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['id', 'name']

class UserAdminSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)
    # --- THE FIX IS HERE: Use the nested serializer for organization ---
    # This will make the API return {"id": 1, "name": "Org Name"} instead of just the ID.
    organization = OrganizationSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_staff', 'is_active', 'date_joined', 'last_login',
            'organization', 'role', 'status'
        ]

class UserCreateUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, validators=[validate_password])
    role = serializers.PrimaryKeyRelatedField(queryset=Role.objects.all(), required=False, allow_null=True)
    # This serializer correctly accepts an organization ID for writing, so no change is needed here.

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_staff', 'is_active', 'password',
            'organization', 'role', 'status'
        ]

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User.objects.create(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        instance = super().update(instance, validated_data)
        if password:
            instance.set_password(password)
            instance.save()
        return instance

class UserSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSettings
        fields = '__all__'

class UserProfileSerializer(serializers.ModelSerializer):
    settings = UserSettingsSerializer()
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'organization', 'role', 'settings'
        ]
        depth = 1

    def update(self, instance, validated_data):
        settings_data = validated_data.pop('settings', None)
        if settings_data:
            settings_serializer = UserSettingsSerializer(instance.settings, data=settings_data, partial=True)
            if settings_serializer.is_valid(raise_exception=True):
                settings_serializer.save()
        instance = super().update(instance, validated_data)
        return instance