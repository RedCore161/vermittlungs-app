from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend


class EmailOrUsernameBackend(ModelBackend):
    """
    Authenticates with an e-mail address or a username (both case-insensitive).

    Identifiers containing "@" are looked up as e-mail addresses, all others as
    usernames (usernames cannot contain "@"). Also used by the Django admin login.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        User = get_user_model()
        identifier = username if username is not None else kwargs.get("email")
        identifier = (identifier or "").strip()
        if not identifier or password is None:
            return None

        lookup = "email__iexact" if "@" in identifier else "username__iexact"
        try:
            user = User._default_manager.get(**{lookup: identifier})
        except User.DoesNotExist:
            # Run the hasher anyway to keep the response time similar for
            # existing and non-existing accounts (user enumeration).
            User().set_password(password)
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
