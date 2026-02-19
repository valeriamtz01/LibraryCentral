from rest_framework.permissions import BasePermission

# custom permission class - runs when someone tried to access a certain thingg
class IsOwnerOrStaff(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.is_staff: #if the user is staff , allows access
            return True
        
        return obj.user == request.user #otherwise only if they own the object 
    
