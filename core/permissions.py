from rest_framework import permissions


def is_admin(user):
    return bool(user and user.is_authenticated and (user.is_staff or user.role == "admin"))


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return is_admin(request.user)


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS or is_admin(request.user)


class IsEmployer(permissions.BasePermission):
    message = "Only employer accounts can do this."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.role == "employer" or is_admin(user)))


def owner_of(obj, path):
    """owner_of(job, "employer.owner_id") follows the dotted path from the object to its owner's id."""
    for part in path.split("."):
        obj = getattr(obj, part)
    return obj


class IsOwnerOrAdminOrReadOnly(permissions.BasePermission):
    """Anyone reads; only the owner or an admin changes it. The view's `owner_field` is the dotted path from
    the object to the owner's id, "user_id" by default."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return owner_of(obj, getattr(view, "owner_field", "user_id")) == request.user.id or is_admin(request.user)
