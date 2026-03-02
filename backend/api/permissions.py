from rest_framework.permissions import BasePermission

class IsOwnerOrStaff(BasePermission):
    def has_object_permission(self, request, view, obj):
        # 1. always allow staff
        if request.user.is_staff:
            return True
        
        # 2. if the object has a 'user' field (reservations or checkouts), 
        # check if it matches the current user
        if hasattr(obj, 'user'):
            return obj.user == request.user
            
        # 3. if it is a room or equipment item (no 'user' field), 
        # allow the user to see it (GET), but viewsets already handle the 'create/update' restrictions via get_permissions.
        return True