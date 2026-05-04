from django.contrib.auth import authenticate  # checks username/password against Django auth system
from django.db import models # need to import since acitivty_history function uses models.Q for the OR filter
from rest_framework.response import Response  # return JSON responses
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework import viewsets, status
from rest_framework.permissions import (
    IsAuthenticated,
    IsAdminUser,
    AllowAny,  
)

from rest_framework_simplejwt.tokens import RefreshToken  # generates JWT tokens

from .models import Reservation, Checkout, Room, EquipmentItem, EquipmentAsset, Waitlist, Notification, WaitlistHold
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
from django.utils.dateparse import parse_datetime
from zoneinfo import ZoneInfo # for central time deadline display
CENTRAL = ZoneInfo("America/Chicago") # UTRGV campus timezone


# a room must be booked at least this many minutes before start
ADVANCE_MINUTES = 30 

@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def health(request):
    return Response({"status": "ok", "message": "Library Central API running"})


@api_view(["POST"])
@authentication_classes([])
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
@authentication_classes([])
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
            "asset_tag": c.assigned_asset.asset_tag,
            "loan_period": c.item.loan_period, 
            # notes contain text, so extract a clean name else use the type name
            #.split('\n')[0]: grabs the first line (just in case there are multiple lines of notes).
            # .split('-')[0]: splits that line into a list based on the dash and grabs the first part (e.g., "DVDs").
            # .strip(): cleans up any leftover accidental spaces around the word.
            "item_name": c.item.name,          
            "checked_out_at": c.checked_out_at,
            "due_at": c.due_at,
            "status": c.assigned_asset.status
        }
        for c in equipment_loans_qs
    ]


    # add waitlist entries for this user
    waitlist_entries = Waitlist.objects.filter(
        user=user,
        status__in=["waiting", "notified"]
    ).select_related("room").order_by("created_at")

    # calculate position for each entry
    waitlist_data = []
    for entry in waitlist_entries:
        # count how many people are ahead of this user in the queue for this room
        position = Waitlist.objects.filter(
            room=entry.room,
            status__in=["waiting", "notified"],
            created_at__lt=entry.created_at  # joined before this user
        ).count() + 1  # +1 because position is 1-indexed

        # total people waiting for this room
        total = Waitlist.objects.filter(
            room=entry.room,
            status__in=["waiting", "notified"]
        ).count()

        waitlist_data.append({
            "id": entry.id,
            "room_id": entry.room.id if entry.room else None,
            "room_name": entry.room.name if entry.room else None,
            "status": entry.status,
            "position": position,
            "total": total,
            "room_start_time": entry.room_start_time.isoformat() if entry.room_start_time else None,
            "room_end_time": entry.room_end_time.isoformat() if entry.room_end_time else None,
        })

    return Response({
        "activeRooms": activeRooms,
        "activeComputers": activeComputers,
        "equipmentLoans": equipmentLoans,
        "reservations": reservations,
        "equipment": equipment,
        "waitlist": waitlist_data,
        "user_name": user.get_full_name() or user.username # added this line to be able to fetch username
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

    #updated
    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Reservation.objects.all()
        qs = Reservation.objects.filter(user=user)
        return qs
    
    #added for waitlist queue
    #overrides the default delete behavior so that when a reservation is cancelled
    def perform_destroy(self, instance):
        from django.db import transaction
        with transaction.atomic():
            #lock the romo so no concurrent request can touch it mid-cancel
            locked = Reservation.objects.select_for_update().get(pk=instance.pk)

            room = locked.room
            
            # ensure datetimes are timezone aware before passing them into notify_next_user
            # is use_tx = true and the field is already aware, make_aware is a no-op, 
            # without this the comparison 'latest_bookable <= timezone.now()' can raise an error or evaluate wrong 
            # , leaving deadline = no2 instead of cancelled_start - 30min
            start = locked.start_time
            end = locked.end_time

            start = timezone.localtime(start) if timezone.is_aware(start) else timezone.make_aware(start)
            end = timezone.localtime(end) if timezone.is_aware(end) else timezone.make_aware(end)

            # DEBUG: confirm correct values BEFORE sending
            print(f"[DEBUG CANCEL] start={start}, end={end}")

            if timezone.is_naive(start):
                start = timezone.make_aware(start)   # attach UTC if naive
            if timezone.is_naive(end):
                end = timezone.make_aware(end)

            #capture who is cancelling
            cancelled_by = locked.user 

            #new: set status to cancelled instead of deleting
            #so it will say reservation cancelled not completed (if clicking trash icon)
            locked.status = Reservation.STATUS_CANCELLED
            locked.save(update_fields=["status"])

            #notify and create hold(non blocking for ui response)
            # runs inside the transactions so that the waitlist hold row is created atomically with the deletion
            notify_next_user(room, cancelled_start=start, cancelled_end=end, cancelled_by=cancelled_by)
   
    #added for the waitlist queue
    #when someone on the waitlist actually books the room -> their waitlist entry gets marked booked
    def perform_create(self, serializer):
        reservation = serializer.save(user=self.request.user)

        # if this user was in the waitlist for this room, clear it so they don't get notified again
        notified_entry = Waitlist.objects.filter(
            user=self.request.user,
            room=reservation.room,
            status="notified",
        ).first()
        if notified_entry:
            notified_entry.status = "booked"
            notified_entry.save(update_fields=["status"])

        Waitlist.objects.filter(
            user=self.request.user,
            room=reservation.room,
            status="waiting",
        ).delete()

        Notification.objects.filter(
            user=self.request.user,
            room=reservation.room,
            is_read=False,
        ).update(is_read=True)
        
        #mark any waitlist hold reserved_for this user and room as inactive (Claimed)
        WaitlistHold.objects.filter(
            room=reservation.room,
            reserved_for=self.request.user,
            is_active=True,
        ).update(is_active=False)




    def perform_update(self, serializer):
        old_instance = self.get_object()
        reservation = serializer.save()
        if (
            old_instance.status != Reservation.STATUS_CANCELLED and
            reservation.status == Reservation.STATUS_CANCELLED
        ):
            # keep the deadline as cancelled_start - 40 min 
            notify_next_user(
                reservation.room,
                cancelled_start=old_instance.start_time,   
                cancelled_end=old_instance.end_time,       
                cancelled_by=old_instance.user,
            )

#checkouts
# class CheckoutViewSet(viewsets.ModelViewSet):
#     serializer_class = CheckoutSerializer
#     permission_classes = [IsAuthenticated, IsOwnerOrStaff]

#     def update_available_quantity(equipment_item):
#         available_count = EquipmentAsset.objects.filter(
#             equipment_item=equipment_item,
#             status=EquipmentAsset.STATUS_AVAILABLE
#         ).count()
#         equipment_item.available_quantity = available_count
#         equipment_item.save()

#     # Example: checking out an asset
#     asset.status = EquipmentAsset.STATUS_UNAVAILABLE
#     asset.save()

#     # Update available quantity on the parent item
#     update_available_quantity(asset.equipment_item)
#     def get_queryset(self):
#         user = self.request.user

#         if user.is_staff:
#             return Checkout.objects.all()
        
#         return .objects.filter(user=user)

import random
from rest_framework import serializers 
class CheckoutViewSet(viewsets.ModelViewSet):
    serializer_class = CheckoutSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrStaff]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Checkout.objects.all()
        return Checkout.objects.filter(user=user)

    # def update_available_quantity(self, equipment_item):
    #     available_count = EquipmentAsset.objects.filter(
    #         equipment_item=equipment_item,
    #         status=EquipmentAsset.STATUS_AVAILABLE
    #     ).count()
    #     equipment_item.available_quantity = available_count
    #     equipment_item.save(update_fields=['available_quantity'])

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


    # automatically set is_cancelled = True when a non-staff user (student) sets returned_at for the first time
    # Staff setting returned_at through the admin portal goes through Django Admin's save_model() path, not perform_update, 
    # so is_cancelled stays False
    def perform_update(self, serializer):
        # is_cancelled = True only when:
        # 1. the user is a student (not staff)
        # 2. returned_at is being set for the first time (was null before)
        was_returned = serializer.instance.returned_at is not None
        is_setting_returned = serializer.validated_data.get("returned_at") is not None

        is_student_cancelling = (
            not self.request.user.is_staff and
            not was_returned and      # wasn't already returned
            is_setting_returned       # is now being set
        )

        checkout = serializer.save(
            is_cancelled=True if is_student_cancelling else serializer.instance.is_cancelled
        )
        asset = checkout.assigned_asset

        if checkout.returned_at and asset:
            asset.status = EquipmentAsset.STATUS_AVAILABLE
            asset.save(update_fields=["status"])


            # asset.equipment_item.update_available_quantity()
        
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
    serializer_class = EquipmentItemSerializer
    permission_classes = [IsAuthenticated]

    #get one item per equipment type
    def get_queryset(self):
        return EquipmentItem.objects.select_related(
            "equipment_type"
        ).all().order_by("equipment_type__name", "name")

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
    activeRooms = [
    {
        "id":            room.id,
        "room_name":     room.name,
        "capacity":      room.capacity,
        "accessible":    room.accessible,
        "has_whiteboard":room.has_whiteboard,
        "has_monitor":   room.has_monitor,
        "has_power":     room.has_power,
        "location_text": room.location_text,
    }
    for room in rooms_qs
]
    


    return Response(
        {
            "activeRooms": activeRooms,
            "statuses": statuses,
        },
        status=status.HTTP_200_OK
    )

# creating waitlist api

from django.core.mail import send_mail
from django.utils import timezone
from datetime import timedelta

# join waitlist - a POST endpoint at /waitlist/join/
# so when a student clicks the notify me button, the fe sends the room_id
# then this function checks if the room exists and if the student is alreay in the queue for that room
# and if not, created a new waitlist entry with the status waiting
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def join_waitlist(request):
    user = request.user
    room_id = request.data.get("room_id")

    # the fe send the start_time the user was trying to book
    # so store it and later compute theie exact booking deadline
    room_start_time = request.data.get("room_start_time")  # ISO string or None

    room_end_time = request.data.get("room_end_time")

    try:
        room = Room.objects.get(id=room_id)
    except Room.DoesNotExist:
        return Response({"error": "Room not found"}, status=404)

    if room.has_monitor:
        return Response({"error": "Computers cannot be added to the waitlist."}, status=400)

    # allow user who cancelled to rejoin waitlist cleanly
    Waitlist.objects.filter(user=user, room=room, status__in=["cancelled", "expired"]).delete()

    # prevent duplicates (so if student is already in the waitlist)
    if Waitlist.objects.filter(user=user, room=room, status="waiting").exists():
        return Response({"message": "Already in waitlist"}, status=400)

    room_end_time = request.data.get("room_end_time")

    # parse the ISO string into a timezone-aware datetime if provided
    parsed_start = None
    if room_start_time:
        parsed_start = parse_datetime(room_start_time)
        # parse_datetime returns naive if no tz info — make it aware
        if parsed_start and timezone.is_naive(parsed_start):
            parsed_start = timezone.make_aware(parsed_start)

    parsed_end = None
    if room_end_time:
        parsed_end = parse_datetime(room_end_time)
        if parsed_end and timezone.is_naive(parsed_end):
            parsed_end = timezone.make_aware(parsed_end)

    Waitlist.objects.create(user=user, room=room, room_start_time=parsed_start, room_end_time = parsed_end,) # store the slot time they want

    return Response({"message": "Added to waitlist"})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_waitlist(request):
    entries = (
        Waitlist.objects.filter(user=request.user)
        .select_related("room")
        .order_by("-created_at")
    )
    data = [
        {
            "id": e.id,
            "room_id": e.room.id if e.room else None,
            "room_name": e.room.name if e.room else None,
            "status": e.status,
            "room_start_time": e.room_start_time.isoformat() if e.room_start_time else None,
            "room_end_time": e.room_end_time.isoformat() if e.room_end_time else None,
            "notification_time": e.notification_time.isoformat() if e.notification_time else None,
            "notification_deadline": e.notification_deadline.isoformat() if e.notification_deadline else None,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in entries
    ]
    return Response({"waitlist": data})

# an internal helper function, not an endpoint
# gets called automatically when a rooom becomes free
# notifies only the next person that is waiting by looking at the waitlist table, finding the oldest entry with status = waiting
# creates the notification record in the database so the bell badge appears
def notify_next_user(room, cancelled_start=None, cancelled_end=None, cancelled_by=None):
    now = timezone.now()

    # normalize to timezone
    if cancelled_start and timezone.is_naive(cancelled_start):
        cancelled_start = timezone.make_aware(cancelled_start)
    if cancelled_end and timezone.is_naive(cancelled_end):
        cancelled_end = timezone.make_aware(cancelled_end)

    #  1)  always compute deadline for the cancelled window 
    window_deadline = None
    if cancelled_start:
        window_deadline = cancelled_start - timedelta(minutes=ADVANCE_MINUTES)
        if window_deadline <= now:
            # slot is no longer bookable — create a permanently inactive hold
            # so no one (including the original booker) can sneak back in
            if cancelled_start and cancelled_end:
                WaitlistHold.objects.create(
                    room=room,
                    held_start=cancelled_start,
                    held_end=cancelled_end,
                    reserved_for=None,
                    expires_at=now,
                    is_active=False,
                    cancelled_by=cancelled_by,
                )
            return  # window is unbookable, nothing more to do

    #  2) notify the next person in waitlist 
    next_entry = Waitlist.objects.filter(
        room=room, status="waiting"
    ).order_by("created_at").first()

    # determine slot times for notification message
    # if a reservation was cancelled, always notify using the freed window
    # (waitlist entry times can drift or be missing and should not override reality)
    if cancelled_start and cancelled_end:
        slot_start = cancelled_start
        slot_end = cancelled_end
    elif next_entry and next_entry.room_start_time:
        slot_start = next_entry.room_start_time
        if next_entry.room_end_time:
            slot_end = next_entry.room_end_time
        else:
            slot_end = slot_start + timedelta(hours=1)
    else:
        slot_start = now
        slot_end = slot_start + timedelta(hours=1)

    # compute booking deadline
    deadline = slot_start - timedelta(minutes=ADVANCE_MINUTES)
    if deadline <= now:
        deadline = now + timedelta(hours=24)

    deadline_central = deadline.astimezone(CENTRAL)
    deadline_str = deadline_central.strftime("%b %d at %I:%M %p CT")

    # build message
    slot_start_ct = slot_start.astimezone(CENTRAL)
    slot_end_ct = slot_end.astimezone(CENTRAL)
    slot_str = f"{slot_start_ct.strftime('%b %d, %I:%M %p')}–{slot_end_ct.strftime('%I:%M %p CT')}"

    if next_entry:
        message_body = (
            f"{room.name} is now available for {slot_str}! "
            f"You have until {deadline_str} to book it. "
            f"Click to reserve or decline your spot."
        )

        Notification.objects.create(
                user=next_entry.user,
                room=room,
                message=message_body,
            )


        # update waitlist entry
        next_entry.status = "notified"
        next_entry.notification_time = now
        next_entry.notification_deadline = deadline
        next_entry.save(update_fields=["status", "notification_time", "notification_deadline"])
        
    # always create a waitlist hold for the cancelled window
    # this is what blocks the original booker from re-reserving
    # reserved_for = none when no one is waiting means the slot is held but unclaimable until it expires
    if cancelled_start and cancelled_end:
        # deactuvate any previous holds for this exact window first (avoid duplicates)
        WaitlistHold.objects.filter(
            room=room,
            held_start=cancelled_start,
            held_end=cancelled_end,
            is_active=True,
        ).update(is_active=False)

        WaitlistHold.objects.create(
            room=room,
            held_start=cancelled_start,
            held_end=cancelled_end,
            reserved_for=next_entry.user if next_entry else None,
            expires_at=deadline,
            is_active=True,
            cancelled_by=cancelled_by,
        )


# expires after 24 hours
# uses notification_deadline (dynamic) instead of fixed 24h.
# this function is now called by the APScheduler background job, NOT on every
# page load, see the scheduler.py
def check_expired_waitlist():
    now = timezone.now()

    # uses notification_deadline instead of the harcoded 24 hours
    # checks the actual stored deadline for each entry
    expired = Waitlist.objects.filter(
        status="notified",
        notification_deadline__lt=now, # deadline has passed
        notification_deadline__isnull = False, # skip entries with no deadline set
    )

    #marks them expired, and calls notify_next_user again to move to the next person in line
    for entry in expired:
        entry.status = "expired"
        entry.save(update_fields = ["status"])

        # look up the hold to recover the original window
        active_hold = WaitlistHold.objects.filter(
            room=entry.room,
            reserved_for=entry.user,
            is_active=True,
        ).first()

        #deactivate their hold
        WaitlistHold.objects.filter(
            room=entry.room,
            reserved_for=entry.user,
            is_active=True,
        ).update(is_active=False)

        # notify the next person in queue
        notify_next_user(
            entry.room,
            cancelled_start=active_hold.held_start if active_hold else None,
            cancelled_end=active_hold.held_end if active_hold else None,
            cancelled_by=None,
        )

# added for notifcations
# this is a GET endpoint at /notifications/
# ─── GET /notifications/ ───
# dashboard calls this every 10 seconds and returns all unread notifications for the logged-in user
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_notifications(request):

    # fetch unread notifications
    notifications = Notification.objects.filter(user=request.user, is_read=False)
    data = [
        {
            "id": n.id,
            "message": n.message,
            "room_name": n.room.name if n.room else None,
            "room_id": n.room.id if n.room else None,
            "created_at": n.created_at,
        }
        for n in notifications
    ]

    return Response({"notifications": data, "count": len(data)})

# is a POST endpoint at /notifications/
# when the student clicks on "mark all read" or the booking link -> marks all their notifications as read so the notifions clears
# POST /notifications/mark-read/ 
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_notifications_read(request):
    # optionally accept a list of ids -> if empty, marks all as read
    ids = request.data.get("ids", [])
    qs = Notification.objects.filter(user=request.user, is_read=False)
    if ids:
        qs = qs.filter(id__in=ids)
    qs.update(is_read=True)
    return Response({"marked_read": qs.count()})

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def decline_waitlist(request):
    user = request.user
    room_id = request.data.get("room_id")

    try:
        room = Room.objects.get(id=room_id)
    except Room.DoesNotExist:
        return Response({"error": "Room not found"}, status=404)

    # find their active notified entry
    entry = Waitlist.objects.filter(
        user=user,
        room=room,
        status="notified"
    ).first()

    if not entry:
        return Response({"error": "No active waitlist notification"}, status=400)

    # mark as declined (or you can delete instead)
    entry.status = "declined"
    entry.save(update_fields=["status"])

    # look up the active hold so we can pass the original window to notify_next_user
    # without this, notify_next_user has no window info and falls back to "now + 1h"
    active_hold = WaitlistHold.objects.filter(
        room=room,
        reserved_for=user,
        is_active=True,
    ).first()


    # deactivate their hold
    WaitlistHold.objects.filter(
        room=room,
        reserved_for=user,
        is_active=True,
    ).update(is_active=False)

    # mark notification as read
    Notification.objects.filter(user=user, room=room, is_read=False).update(is_read=True) # .delete() - notfication to disappear completely

    # notify the next user - pass the original window so the next person's notification shows the right slot
    notify_next_user(
        room,
        cancelled_start=active_hold.held_start if active_hold else None,
        cancelled_end=active_hold.held_end if active_hold else None,
        cancelled_by=None,  # decline is not a cancellation, don't block anyone
    )

    return Response({"message": "You have been removed from the waitlist"})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def remove_waitlist(request):
    entry_id = request.data.get("waitlist_id")
    if not entry_id:
        return Response({"error": "waitlist_id is required"}, status=400)

    entry = Waitlist.objects.filter(id=entry_id, user=request.user).first()
    if not entry:
        return Response({"error": "Waitlist entry not found"}, status=404)

    room = entry.room
    entry.delete()
    if room:
        Notification.objects.filter(user=request.user, room=room, is_read=False).update(is_read=True)
        WaitlistHold.objects.filter(room=room, reserved_for=request.user, is_active=True).update(is_active=False)
    return Response({"message": "Removed from waitlist"})

# added this new endpoint to be able to color the time slots (fe needs to know which specific time windows are already booked for the selected room and date)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def room_schedule(request, room_id):
    """
    GET /studyspaces/<room_id>/schedule/?date=YYYY-MM-DD
    Returns booked time windows for a room on a given date so the
    frontend can color time slots green (available) or red (booked).
    """
    date_str = request.query_params.get("date")
    if not date_str:
        return Response({"error": "date query param required"}, status=400)

    try:
        room = Room.objects.get(id=room_id, is_active=True)
    except Room.DoesNotExist:
        return Response({"error": "Room not found"}, status=404)

    # parse the date and build a UTC range covering that full calendar day in CT
    from django.utils.dateparse import parse_date
    date = parse_date(date_str)
    if not date:
        return Response({"error": "Invalid date format"}, status=400)

    # convert midnight-to-midnight Central Time to UTC for the DB query
    from datetime import datetime
    day_start = timezone.make_aware(
        datetime(date.year, date.month, date.day, 0, 0, 0),
        ZoneInfo("America/Chicago")
    )
    day_end = timezone.make_aware(
        datetime(date.year, date.month, date.day, 23, 59, 59),
        ZoneInfo("America/Chicago")
    )

    # confirmed/pending reservations
    reservations = Reservation.objects.filter(
        room=room,
        status__in=[Reservation.STATUS_PENDING, Reservation.STATUS_CONFIRMED],
        start_time__lt=day_end,
        end_time__gt=day_start,
    ).values("start_time", "end_time")

    booked = [
        {
            "start": r["start_time"].isoformat(),
            "end": r["end_time"].isoformat(),
        }
        for r in reservations
    ]

    # active waitlist holds — windows held for a queued user
    # these should also appear red since they're not freely bookable
    # tag each hold with whether it belongs to the current user
    # so the frontend can skip coloring it red for the priority user
    holds = WaitlistHold.objects.filter(
        room=room,
        is_active=True,
        expires_at__gt=timezone.now(),
        held_start__lt=day_end,
        held_end__gt=day_start,
    )

    held = [
        {
            "start": h.held_start.isoformat(),
            "end": h.held_end.isoformat(),
            "reserved_for_me": h.reserved_for == request.user,  # ← key addition
        }
        for h in holds
    ]

    # also flag windows where someone is actively waiting (status="waiting")
    # so even before a hold is created, the slot shows as unavailable
    waiting_entries = Waitlist.objects.filter(
        room=room,
        status__in=["waiting", "notified"],
        room_start_time__isnull=False,
    )

    waitlisted = []
    for entry in waiting_entries:
        if entry.room_start_time:
            w_start = entry.room_start_time
            w_end = entry.room_end_time if entry.room_end_time else (
                w_start + timedelta(hours=1)
            )
            if w_start < day_end and w_end > day_start:
                waitlisted.append({
                    "start": w_start.isoformat(),
                    "end": w_end.isoformat(),
                    "reserved_for_me": entry.user == request.user,  # ← add this
                })


    return Response({
        "booked": booked,
        "held": held,
        "waitlisted": waitlisted,
    })


#copy and pasted dashboard summar for profile summary
#return what dashboard expects
#aggregates active study space reservations (rooms & computers) and equipment loans for the logged in user
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def profile_summary(request):
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
            "asset_tag": c.assigned_asset.asset_tag,
            "loan_period": c.item.loan_period, 
            # notes contain text, so extract a clean name else use the type name
            #.split('\n')[0]: grabs the first line (just in case there are multiple lines of notes).
            # .split('-')[0]: splits that line into a list based on the dash and grabs the first part (e.g., "DVDs").
            # .strip(): cleans up any leftover accidental spaces around the word.
            "item_name": c.item.name,          
            "checked_out_at": c.checked_out_at,
            "due_at": c.due_at,
            "status": c.assigned_asset.status
        }
        for c in equipment_loans_qs
    ]


   

    return Response({
        "activeRooms": activeRooms,
        "activeComputers": activeComputers,
        "equipmentLoans": equipmentLoans,
        "reservations": reservations,
        "equipment": equipment,
        "user_name": user.get_full_name() or user.username, # added this line to be able to fetch username
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
    })

#plus these three new API endpoint functions to save when a student clicks edit
#and either types a new name or changes their password

#update_profile: lets a logged in student update their own name and email address
#patch = partially updating something that already exists 

@api_view(["PATCH"])
@permission_classes([IsAuthenticated]) 
def update_profile(request):
 
    user = request.user
 
    first_name = request.data.get("first_name")
    last_name  = request.data.get("last_name")
    email      = request.data.get("email")
 
    # onkly update the fields that were actually provided 

    if first_name is not None:
        user.first_name = first_name
        # This changes the value on the Python object in memory.
        # The database has NOT been updated yet — that happens with user.save()
 
    if last_name is not None:
        user.last_name = last_name
 
    if email is not None:
        user.email    = email
        user.username = email

 
    user.save()

    return Response({"message": "Profile updated successfully"}, status=status.HTTP_200_OK)

 
#change_password: endpoint that lets a logged in student securely change their own password

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
 
    user = request.user
 
    #read the two passwords the frontend sent 
    # Profile.tsx's savePw() function sends:
    #   { "current_password": "oldpass123", "new_password": "newpass456" }
    # need both: the current one to verify identity, the new one to set.
 
    current_password = request.data.get("current_password")
    new_password     = request.data.get("new_password")
 
    if not current_password or not new_password:
        # if  either field is missing or empty, we stop immediately
        return Response(
            {"error": "current_password and new_password are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )
 
    # verify the current password is actually correct 
    if not user.check_password(current_password):
        # check_password() is a built-in Django method on every User object, works by hashing the string you give it using the
        # exact same algorithm and salt that was used when the password was
        # originally set, then comparing the two hashes
        
        # if the check fails (student mistyped their current password):
        return Response(
            {"error": "Current password is incorrect"},
            status=status.HTTP_400_BAD_REQUEST,
        )
 
    # set the new one if current password correct
    user.set_password(new_password)
    # set_password() is another built-in Django method

    # set_password() does several things automatically:
    #   1. Generates a new random salt (makes every stored hash unique)
    #   2. Hashes the new password securely using Django's algorithm
    #   3. Stores the hash (not the raw password) on user.password
    #
  
    user.save()

    # writes the new hashed password permanently to the database.
    return Response({"message": "Password updated successfully"}, status=status.HTTP_200_OK)

#activity_history: the api endpoint that returns the full history of a user's past activity (room + computer reservation and equipment)
 
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def activity_history(request):
 
    user = request.user
    now  = timezone.now()
 
    # 1.) the past room reservations 
    # in here, "past" means the reservation end_time has already passed OR the
    # reservation was cancelled
    # select_related("room") does a SQL JOIN so we get room.name and
    # room.has_monitor without firing extra queries per row
    past_reservations = Reservation.objects.filter(
        user=user,
    ).filter(
        # either the time slot is over, or it was  cancelled
        models.Q(end_time__lt=now) | models.Q(status=Reservation.STATUS_CANCELLED)
    ).select_related("room").order_by("-start_time")
    # order_by("-start_time") = newest first (the minus sign means descending)
 
    # now build the list by tagging each entry with a "type" field so the fe
    # knows which icon and color to use when rendering the activity feed
    room_history = []
    for r in past_reservations:
        # determine whether this room is a study room or a computer station
        # remember: data model uses has_monitor=True to flag computer stations
        if r.room.has_monitor:
            activity_type = "computer"
            label         = "Computer Reservation"
        else:
            activity_type = "room"
            label         = "Room Reservation"
 
        # map the raw status value to a human-readable display string
        if r.status == Reservation.STATUS_CANCELLED:
            display_status = "Cancelled"
        elif r.end_time < now:
            display_status = "Completed"
        else:
            display_status = r.status.capitalize()
 
        room_history.append({
            "type":         activity_type,  # "room" or "computer" — used for icon on FE
            "label":        label,
            "description":  r.room.name,    # ex "Study Room 2.100A"
            "date":         r.start_time.isoformat(),   # ISO string, FE formats it
            "end_date":     r.end_time.isoformat(),
            "status":       display_status, # "Completed" or "Cancelled"
        })
 
    # 2,) Returned equipment checkouts 
    # "returned" means returned_at is not null (which i guess would mean the staff marked it back in)
    # active loans (returned_at is null) already show in the profile summary
    # section, and only want the ones that are done.
 
    returned_checkouts = Checkout.objects.filter(
        user=user,
        returned_at__isnull=False,  # only items that have been returned
    ).select_related("item", "assigned_asset").order_by("-returned_at")
    # select_related("item") joins the EquipmentItem table so we get item.name
    # select_related("assigned_asset") joins EquipmentAsset for the asset tag
 
    checkout_history = []
    for c in returned_checkouts:
        checkout_history.append({
            "type":        "equipment",         # used for icon on FE
            "label":       "Equipment Checkout",
            "description": c.item.name,         # ex " Camera"
            "date":        c.checked_out_at.isoformat(),  # when they borrowed it
            "end_date":    c.returned_at.isoformat(),     # when they returned it
            "status":      "Cancelled" if c.is_cancelled else "Returned" # asking a cancelled status 
        })
 
    # 3.) merge and sort everything together 
    # combines both lists into one unified activity feed
    all_activity = room_history + checkout_history
 
    # sort the combined list by date descending (newest activity at the top)
    # also sort on "date" which is the ISO string of when the activity started
    all_activity.sort(key=lambda x: x["date"], reverse=True)
 
    return Response({
        "history": all_activity,
        "total":   len(all_activity),  # handy for the FE to show a count badge
    })
