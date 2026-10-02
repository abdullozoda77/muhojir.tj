"""Who sees what in the admin panel. Admins (superusers) see everything as usual. Editors see only the
site's content (see EditorAccess); users, their documents and payments, jobs and companies stay hidden."""
from .permissions import is_editor


class EditorAccess:
    """Mixin for ModelAdmin and inlines: editors may view, add, change and delete these."""

    def _editor(self, request):
        return is_editor(request.user) and request.user.is_staff

    def has_module_permission(self, request):
        return self._editor(request) or super().has_module_permission(request)

    def has_view_permission(self, request, obj=None):
        return self._editor(request) or super().has_view_permission(request, obj)

    def has_add_permission(self, request, *args):
        return self._editor(request) or super().has_add_permission(request, *args)

    def has_change_permission(self, request, obj=None):
        return self._editor(request) or super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        return self._editor(request) or super().has_delete_permission(request, obj)


class EditorChangeOnly(EditorAccess):
    """Editors may view and change these (e.g. a document type's guide), but not add or delete them."""

    def has_add_permission(self, request, *args):
        return super(EditorAccess, self).has_add_permission(request, *args)

    def has_delete_permission(self, request, obj=None):
        return super(EditorAccess, self).has_delete_permission(request, obj)
