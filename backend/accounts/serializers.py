from django.contrib.auth import authenticate, get_user_model, password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name"]
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    class Meta:
        model = User
        fields = ["email", "password", "first_name", "last_name"]
        extra_kwargs = {
            "first_name": {"required": False},
            "last_name": {"required": False},
            # Uniqueness is checked case-insensitively in validate_email.
            "email": {"validators": []},
        }

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Ein Konto mit dieser E-Mail-Adresse existiert bereits.")
        return email

    def validate(self, attrs):
        candidate = User(
            email=attrs["email"],
            first_name=attrs.get("first_name", ""),
            last_name=attrs.get("last_name", ""),
        )
        try:
            password_validation.validate_password(attrs["password"], user=candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)})
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate(self, attrs):
        user = authenticate(request=self.context.get("request"), email=attrs["email"], password=attrs["password"])
        if user is None:
            raise serializers.ValidationError("E-Mail-Adresse oder Passwort ist falsch.", code="authorization")
        attrs["user"] = user
        return attrs
