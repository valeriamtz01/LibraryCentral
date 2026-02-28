from django.contrib.auth import authenticate  # checks username/password against Django auth system

from rest_framework.response import Response  # return JSON responses
from rest_framework.decorators import api_view, permission_classes
from rest_framework import viewsets, status
from rest_framework.permissions import (
    IsAuthenticated,
    IsAdminUser,
    AllowAny,  
)

from rest_framework_simplejwt.tokens import RefreshToken  # generates JWT tokens

from .models import Reservation, Checkout, Room, EquipmentItem
from .serializers import (
    ReservationSerializer,
    CheckoutSerializer,
    RoomSerializer,
    EquipmentItemSerializer,
    RegisterSerializer, 
)
from .permissions import IsOwnerOrStaff
@api_view(["GET"])
def health(request):
    return Response({"status": "ok", "message": "Library Central API running"})
@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    """
    POST /auth/register/

    Frontend sends:
      { "name": "...", "email": "...", "password": "..." }

    What happens:
    1) Validate the incoming data with RegisterSerializer
    2) If valid, create the user in the DB (serializer.save())
    3) Return success message + new user's id
    """
    serializer = RegisterSerializer(data=request.data)

    # serializer.is_valid() runs all field checks + validate_password()
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # serializer.save() calls RegisterSerializer.create()
    user = serializer.save()

    return Response(
        {"message": "User created successfully", "user_id": user.id},
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    """
    POST /auth/login/

    Frontend sends:
      { "email": "...", "password": "..." }

    What happens:
    1) authenticate() checks credentials (we use email as username)
    2) If valid, generate a JWT access token
    3) Return { "token": "<jwt>" } (your Login.tsx expects resp.data.token)
    """
    email = request.data.get("email")
    password = request.data.get("password")

    # Basic guardrails so errors are clear
    if not email or not password:
        return Response(
            {"error": "email and password are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Our RegisterSerializer created the user with username=email,
    # so authenticate uses username=email here.
    user = authenticate(username=email, password=password)

    if user is None:
        return Response(
            {"error": "Invalid credentials"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    # Create JWT token pair and return ACCESS token to frontend
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)

    return Response({"token": access_token}, status=status.HTTP_200_OK)
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
