from rest_framework import permissions


def is_admin(user):
    # By role, not by is_staff: editors are staff too (they work in the admin panel) but are not admins.
    return bool(user and user.is_authenticated and (user.is_superuser or user.role == "admin"))


def is_editor(user):
    """Editors manage the site's content (news, guides, exam questions, help sites, centers, prices); admins too."""
    return bool(user and user.is_authenticated and user.is_active and (user.role == "editor" or is_admin(user)))


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return is_admin(request.user)


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS or is_admin(request.user)


def owner_of(obj, path):
    for part in path.split("."):
        obj = getattr(obj, part)
    return obj


class IsEditorOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS or is_editor(request.user)


class IsOwnerOrAdminOrReadOnly(permissions.BasePermission):
    """Anyone reads; only the owner or an admin changes it. The view's `owner_field` is the dotted path from
    the object to the owner's id, "user_id" by default."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return owner_of(obj, getattr(view, "owner_field", "user_id")) == request.user.id or is_admin(request.user)
