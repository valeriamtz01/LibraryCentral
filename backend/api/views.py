from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, IsAdminUser #permission that ensures the user is logged in
from .models import Reservation, Checkout, Room, EquipmentItem #import database models
from .serializers import ( #import serializers 
    ReservationSerializer,
    CheckoutSerializer,
    RoomSerializer,
    EquipmentItemSerializer
)
from .permissions import IsOwnerOrStaff #custom permission to control student(owner of..) vs staff accesss

@api_view(["GET"])
def health(request):
    return Response({"status": "ok", "message": "Library Central API running"})

#create viewsets (get, post, put, delete)
#reservations
class ReservationViewSet(viewsets.ModelViewSet):
    serializer_class = ReservationSerializer #tells dfr which serializer to use
    permission_classes = [IsAuthenticated, IsOwnerOrStaff] #users must be logged in and either own the thing or be staff

    def get_queryset(self): #controls what data the user is allowed to see
        user = self.request.user #the currently logged in user

        if user.is_staff: #if the user is staff, they can see all resverations
            return Reservation.objects.all()

        return Reservation.objects.filter(user=user) #students can only see their own resverations
    
#checkouts
class CheckoutViewSet(viewsets.ModelViewSet):
    serializer_class = CheckoutSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrStaff]

    def get_queryset(self):
        user = self.request.user

        if user.is_staff:
            return Checkout.objects.all()
        
        return Checkout.objects.filter(user=user)
    
#rooms - students=read info, staff=manage rooms
class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all() #returns all rooms
    serializer_class = RoomSerializer
    permission_classes = [IsAuthenticated] #must be logged in to acess rooms
    
    def get_permission(self):
        if self.action in ["create", "update", "partial_update", "destroy"]: #only staff can modift
            return [IsAuthenticated(), IsAdminUser()]
        return[IsAuthenticated()] #for list/retrieve, any logged in user
    
#equipment
class EquipmentItemViewSet(viewsets.ModelViewSet):
    queryset = EquipmentItem.objects.all() #return all equipment items
    serializer_class = EquipmentItemSerializer
    permission_classes = [IsAuthenticated] #must be logged in

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsAdminUser()]
        return [IsAuthenticated()]
