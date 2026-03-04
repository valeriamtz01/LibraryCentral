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
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone


@api_view(["GET"])
@permission_classes([AllowAny])
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


#return what dashboard expects
#aggregates active study space reservations (rooms & computers) and equipment loans for the logged in user
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    """
    {
        "activeRooms": int,        # active room reservations
        "activeComputers": int,    # active computer reservations
        "equipmentLoans": int,     # currently checked out items
        "reservations": [...],     # optional: upcoming reservations
        "equipment": [...]         # optional: currently checked out equipment
    }

    what happens: 
        1. this is the "Data Aggregator." It pulls from three different tables (Reservation, Room, Checkout) and merges them into one JSON response.
        2. reduces network "waterfalling" (react making 5 separate calls).

    """


    user = request.user
    now = timezone.now()

     # active room reservations => fetching future-active reservations
    upcoming_reservations = Reservation.objects.filter(
        user=user,
        status__in=[Reservation.STATUS_PENDING, Reservation.STATUS_CONFIRMED],
        end_time__gte=timezone.now()  # still future or ongoing
    ).select_related("room") # optimizing: joins the room table to prevent n+1 queries

    # segmenting spaces => so our logic defines computer as a room with a room montior
    activeRooms = upcoming_reservations.filter(room__has_monitor=False).count()
    activeComputers = upcoming_reservations.filter(room__has_monitor=True).count()

    # equipment loans 
    # active loans: => only items where 'returned_at' is null
    equipment_loans_qs = Checkout.objects.filter(user=user, returned_at__isnull = True)
    equipmentLoans = equipment_loans_qs.count()

    # added: uses the serializer here instead of the manual list
    # will use the get_item_name() logic automatically
    equipment_data = CheckoutSerializer(equipment_loans_qs, many=True).data

    #including details for the lists groups
    #manually building the lists to ensure the keys ('room_name' and 'item_name) match what dashboard.tsx expects for easy rendering
    reservations = [
        {
            "id": r.id,
            "room": r.room.id,
            "room_name": r.room.name,
            "start_time": r.start_time,
            "end_time": r.end_time,
            "status": r.status,
        }
        for r in upcoming_reservations
    ]

    equipment = [
        {
            "id": c.id,
            "asset_tag": c.item.asset_tag,
            
            # notes contain text, so extract a clean name else use the type name
            #.split('\n')[0]: grabs the first line (just in case there are multiple lines of notes).
            # .split('-')[0]: splits that line into a list based on the dash and grabs the first part (e.g., "DVDs").
            # .strip(): cleans up any leftover accidental spaces around the word.
            "item_name": c.item.notes.split('\n')[0].split('-')[0].strip() if c.item.notes else c.item.equipment_type.name,
          
            "checked_out_at": c.checked_out_at,
            "due_at": c.due_at,
            "status": c.item.status,
        }
        for c in equipment_loans_qs
    ]

    return Response({
        "activeRooms": activeRooms,
        "activeComputers": activeComputers,
        "equipmentLoans": equipmentLoans,
        "reservations": reservations,
        "equipment": equipment
    })


#create viewsets (get, post, put, delete)
#reservations
class ReservationViewSet(viewsets.ModelViewSet):
    """
        Provides GET, POST, PUT, DELETE for Reservations.
        SECURITY: IsOwnerOrStaff ensures students can't edit other students' bookings.

    """

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
    """
    what happens: 
        1. manages the inventory of rooms
        2. dynamic permission -> want anyone to see what rooms exist (GET) but only admis able to create/delete rooms
    """
    
    #Rooms endpoint: Students (any authenticated user): can GET list/retrieve
    #Staff (admin): can create/update/delete
    
    queryset = Room.objects.all()
    serializer_class = RoomSerializer

    def get_permissions(self):        
        #create/update/partial_update/destroy: staff only
        #list/retrieve: any authenticated user
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsAdminUser()]
        return [IsAuthenticated()]

#equipment
class EquipmentItemViewSet(viewsets.ModelViewSet):
    queryset = EquipmentItem.objects.all()
    serializer_class = EquipmentItemSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsAdminUser()]
        return [IsAuthenticated()]


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def studyspaces_statuses(request):

    #GET /studyspaces/statuses/
    #returns variable names that match the frontend directly: activeRooms, reservations statuses

    #statud logic:
      # "occupied" if there is any active reservation overlapping "now"
      #otherwise "available"
    

    now = timezone.now()

    # only rooms that are marked active should show on the map
    rooms_qs = Room.objects.filter(is_active=True).order_by("name")

    # find the reservations overlapping "now" (and not cancelled)
    overlapping = Reservation.objects.filter(
        status__in=[Reservation.STATUS_PENDING, Reservation.STATUS_CONFIRMED],
        start_time__lte=now,
        end_time__gte=now
    ).select_related("room")


    # build statuses dict keyed by exact room name string (matches FE keys)
    statuses = {room.name: "available" for room in rooms_qs}

    # only loop through overlapping reservation to mark rooms occupied
    for res in overlapping:
        statuses[res.room.name] = "occupied"

    # activeRooms: give FE both id + room_name so it can POST reservations by id later
    activeRooms = [{"id": room.id, "room_name": room.name} for room in rooms_qs]


    return Response(
        {
            "activeRooms": activeRooms,
            "statuses": statuses,
        },
        status=status.HTTP_200_OK
    )



