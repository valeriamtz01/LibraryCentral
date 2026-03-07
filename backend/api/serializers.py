from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from .models import Campus, Room, Reservation, EquipmentItem, Checkout


class CampusSerializer(serializers.ModelSerializer):
    # converts Campus model objects used for listing/creating campuses 
    class Meta:
        model = Campus
        # only exposes these fields in the API response/request body
        fields = ["id", "code", "name"]

class RoomSerializer(serializers.ModelSerializer):
    # converts room model objects includes campus_code as a convinience field for frontend display
    # read-only "extra" field pulled from the related campus object
    campus_code = serializers.CharField(source="campus.code", read_only=True)

    class Meta:
        model = Room
        fields = [
            "id",
            "campus",
            "campus_code",
            "name",
            "capacity",
            "location_text",
            "accessible",
            "has_whiteboard",
            "has_monitor",
            "has_power",
            "is_active",
        ]

class ReservationSerializer(serializers.ModelSerializer):
    # Automatically attaches the logged-in user (request.user), validates time ranges, prevents overlapping reservations
    # CurrentUserDefault() fills it from request user auto
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())

    #added
    room_name = serializers.CharField(source = "room.name", read_only = True)

    class Meta:
        model = Reservation
        fields = [
            "id",
            "user",
            "room",
            "room_name",
            "start_time",
            "end_time",
            "status",
            "created_at",
        ]
        # Frontend should not set these directly
        read_only_fields = ["status", "created_at"]

    def validate(self, attrs):
        # runs before create/update
        room = attrs["room"]
        start = attrs["start_time"]
        end = attrs["end_time"]

        # Basic time validation
        if end <= start:
            raise serializers.ValidationError("end_time must be after start_time.")

                  # Don’t allow bookings for rooms that are turned off
        if not room.is_active:
            raise serializers.ValidationError("This room is not active.")

        # Overlap logic:
        # An overlap exists when:
        # existing.start < new.end AND existing.end > new.start
        qs = Reservation.objects.filter(room=room).exclude(
                    status=Reservation.STATUS_CANCELLED
                )
        # If updating an existing reservation, exclude itself from overlap check
        if self.instance:
            qs = qs.exclude(id=self.instance.id)

        overlap = qs.filter(start_time__lt=end, end_time__gt=start).exists()
        if overlap:
            raise serializers.ValidationError(
                "This room is already reserved for that time range."
            )

        return attrs

    def create(self, validated_data):
        """Create reservation with a re-check inside a transaction.

        Why: the `validate()` overlap check can be bypassed under a race condition
        if two requests validate at the same time.

        Fix: re-check overlaps inside `transaction.atomic()` while holding a
        `select_for_update()` lock on the Room row.
        """
        room: Room = validated_data["room"]
        start = validated_data["start_time"]
        end = validated_data["end_time"]

        with transaction.atomic():
            # Lock the room row for the duration of the transaction.
            Room.objects.select_for_update().get(pk=room.pk)

            overlap = (
                Reservation.objects.filter(room=room)
                .exclude(status=Reservation.STATUS_CANCELLED)
                .filter(start_time__lt=end, end_time__gt=start)
                .exists()
            )

            if overlap:
                raise serializers.ValidationError(
                    "This room is already reserved for that time range."
                )

            return super().create(validated_data)


class ReservationSerializer(serializers.ModelSerializer):
    # Automatically attaches the logged-in user (request.user)
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = Reservation
        fields = [
            "id",
            "user",
            "room",
            "start_time",
            "end_time",
            "status",
            "created_at",
        ]
        read_only_fields = ["status", "created_at"]

    def validate(self, attrs):
        room = attrs["room"]
        start = attrs["start_time"]
        end = attrs["end_time"]

        if end <= start:
            raise serializers.ValidationError("end_time must be after start_time.")

        if not room.is_active:
            raise serializers.ValidationError("This room is not active.")

        qs = Reservation.objects.filter(room=room).exclude(
            status=Reservation.STATUS_CANCELLED
        )

        if self.instance:
            qs = qs.exclude(id=self.instance.id)

        if qs.filter(start_time__lt=end, end_time__gt=start).exists():
            raise serializers.ValidationError(
                "This room is already reserved for that time range."
            )

        return attrs


class EquipmentItemSerializer(serializers.ModelSerializer):
    # flattening fields from EquipmentType
    # uses serializermethodfield for computed values 
    # our databae stored individal items but the userinterface expects specific naming convetions
    name = serializers.SerializerMethodField() #modified
    category = serializers.CharField(source='equipment_type.category', read_only=True)
    # Using 'notes' as the description since that's where seed.py puts data
    description = serializers.CharField(source='notes', read_only=True)
    
    # logic for the individual items
    location = serializers.CharField(source='campus.name', read_only=True)
    totalQuantity = serializers.SerializerMethodField()
    availableQuantity = serializers.SerializerMethodField()
    photoUrl = serializers.SerializerMethodField()

    class Meta:
        model = EquipmentItem
        fields = [
            'id', 'name', 'category', 'description', 'location', 
            'totalQuantity', 'availableQuantity', 'photoUrl', 'status', 'asset_tag'
        ]

    #computed fields
    def get_totalQuantity(self, obj):
        return 1  # Each row in database is 1 individual physical item

    def get_availableQuantity(self, obj):
        """
            updated logic: 
                an item is only available if: 
                    1. its status says explicitly available
                    2. there an no active checkout (where returned_at is null)
        """
        # check for any active loans for this specific item:
        is_currently_loaned = Checkout.objects.filter(
            item=obj, 
            returned_at__isnull=True
        ).exists()

        if obj.status == "AVAILABLE" and not is_currently_loaned:
            return 1
        return 0

    def get_photoUrl(self, obj):
        # defauly placeholder 
        return "https://via.placeholder.com/400x300?text=Equipment"

    def get_name(self, obj):
        # takes the first line of your 'notes' field from seed.py
        # => extracs a readble name from the notes field (Dvds - ... becomes "Dvds")
        if obj.notes:
            return obj.notes.split(" - ")[0].strip() # getting the name (word/s before the -) to show on equipment page
        return obj.equipment_type.name

class CheckoutSerializer(serializers.ModelSerializer):
    # Automatically attaches the logged-in users, provides is_returned flag, prevents double checkout 
    # tracks current equipment loans and prevents checking out an item that's already out
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())

    # updated name
    item_name = serializers.SerializerMethodField()
    is_returned = serializers.ReadOnlyField()     # ReadOnlyField: included in responses, ignored in requests


    class Meta:
        model = Checkout
        fields = [
            "id",
            "user",
            "item",
            "item_name",
            "checked_out_at",
            "due_at",
            "returned_at",
            "is_returned",
        ]
        # The system sets checked_out_at; returned_at should be set by a "return" endpoint later
        read_only_fields = ["checked_out_at", "returned_at", "is_returned"]

    def get_item_name(self, obj):
        # obj is the Checkout instance. 
        # We need to go: Checkout -> EquipmentItem (item) -> notes
        item = obj.item
        if item.notes:
            return item.notes.split('\n')[0].strip()
        return item.equipment_type.name
    
    def validate(self, attrs):
        item = attrs["item"]
        due = attrs["due_at"]

        if item.status != EquipmentItem.STATUS_AVAILABLE: #modified
         raise serializers.ValidationError("This item is not available for checkout.") 

        # Due date must be in the future
        if due <= timezone.now():
            raise serializers.ValidationError("due_at must be in the future.")

        # Prevent double checkout:
        # If any checkout exists for this item where returned_at is NULL, item is currently out
        active_exists = Checkout.objects.filter(
            item=item, returned_at__isnull=True
        ).exists()
        if active_exists:
            raise serializers.ValidationError("This item is currently checked out.")

        return attrs
    
# Auth serializers (Register/login)
# get_user_model() returns whichever User model app is using.
# validate_password() runs Django's built-in password rules
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()

class RegisterSerializer(serializers.Serializer):
    """
    This serializer defines what data we expect from the frontend when registering.

    Frontend (SignUp.tsx) sends something like:
      { "name": "...", "email": "...", "password": "..." }

    Serializer responsibilities:
    1) Validate the incoming payload
    2) Create the user in the database if valid
    """

    # Required fields coming from the request body
    name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True
    )  # write_only means: accept input, never return it in responses
    def validate_password(self, value):
        # Runs Django's password validators (configured in settings.py, usually default validators)
        validate_password(value)
        return value

    def create(self, validated_data):
        # We use the email as the username:
        # This keeps login simple because authenticate() uses "username" by default.
        # So in our login endpoint, we can authenticate(username=email, password=...)
        user = User.objects.create_user(
            username=validated_data["email"],  # treat email as username
            email=validated_data["email"],
            password=validated_data[
                "password"
            ],  # create_user automatically hashes the password
        )

        # Save the "name" to a user field.
        # Default Django User doesn't have a "name" field, but it DOES have first_name/last_name.
        # We'll store the full name in first_name for now.
        full_name = validated_data.get("name", "").strip()

        # hasattr check keeps this safe if your User model changes later.
        if hasattr(user, "first_name"):
            user.first_name = full_name

            # update_fields updates ONLY that column (more efficient than saving everything)
            user.save(update_fields=["first_name"])

        # Return the newly created user object.
        # This serializer isn't returning the user data automatically
        return user