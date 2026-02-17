from django.utils import timezone
from rest_framework import serializers
from .models import Campus, Room, Reservation, EquipmentItem, Checkout

class CampusSerializer(serializers.ModelSerializer):
    #converts Campus model objects used for listing/creating campuses 
    class Meta:
        model = Campus
        #only exposes these fields in the API response/request body
        fields = ["id","code","name"]

class RoomSerializer(serializers.ModelSerializer):
    #converts room model objects includes campus_code as a convinience field for frontend display
    # read-only "extra" field pulled from the related campus object
    campus_code = serializers.CharField(source="campus.code", read_only=True)

   class Meta:
        model = Room
        fields = [
            "id", "campus", "campus_code", "name", "capacity", "location_text",
            "accessible", "has_whiteboard", "has_monitor", "has_power", "is_active"
        ]
class ReservationSerializer(serializers.ModelSerializer):
    #Automatically attaches the logged-in user (request.user), validates time ranges, prevents overlapping reservations
    #CurrentUserDefault() fills it from request user auto
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = Reservation
        fields = ["id", "user", "room", "start_time", "end_time", "status", "created_at"]
        # Frontend should not set these directly
        read_only_fields = ["status", "created_at"]

    def validate(self, attrs):
        #runs before create/update
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
        qs = Reservation.objects.filter(room=room).exclude(status=Reservation.STATUS_CANCELLED)

        # If updating an existing reservation, exclude itself from overlap check
        if self.instance:
            qs = qs.exclude(id=self.instance.id)

        overlap = qs.filter(start_time__lt=end, end_time__gt=start).exists()
        if overlap:
            raise serializers.ValidationError("This room is already reserved for that time range.")

        return attrs


class EquipmentItemSerializer(serializers.ModelSerializer):
    #used for listing/creating equipment items
    class Meta:
        model = EquipmentItem
        fields = ["id", "name", "barcode", "is_active"]


class CheckoutSerializer(serializers.ModelSerializer):
    #Automatically attaches the logged-in users, provides is_returned flag, prevents double checkout 
     user = serializers.HiddenField(default=serializers.CurrentUserDefault())

    # ReadOnlyField: included in responses, ignored in requests
    is_returned = serializers.ReadOnlyField()

    class Meta:
        model = Checkout
        fields = ["id", "user", "item", "checked_out_at", "due_at", "returned_at", "is_returned"]
        # The system sets checked_out_at; returned_at should be set by a "return" endpoint later
        read_only_fields = ["checked_out_at", "returned_at", "is_returned"]

    def validate(self, attrs):
        item = attrs["item"]
        due = attrs["due_at"]

        # Don’t allow checkout of inactive items
        if not item.is_active:
            raise serializers.ValidationError("This item is not active.")

        # Due date must be in the future
        if due <= timezone.now():
            raise serializers.ValidationError("due_at must be in the future.")

        # Prevent double checkout:
        # If any checkout exists for this item where returned_at is NULL, item is currently out
        active_exists = Checkout.objects.filter(item=item, returned_at__isnull=True).exists()
        if active_exists:
            raise serializers.ValidationError("This item is currently checked out.")

        return attrs