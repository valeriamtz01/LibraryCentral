#to define the database table 
#using it to store the campuses rooms and reservations so far 
from django.conf import settings # to reference project settings 
from django.db import models # ORM base classes 
from django.utils import timezone # timezone aware

#campus model 
class Campus(models.Model):
    code = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=100)

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"

class Room(models.Model):
    #each room belongs to one campus a caampus many rooms, you cant delete a campus if it has rooms, and last part lets you do campus.rooms.all()
    #Core room fields
        #name: room name (like “Study Room 101”).
        #capacity: only allows non-negative integers; default 1.
        #location_text: optional text; blank=True means forms/admin allow it empty.
    campus = models.ForeignKey(Campus, on_delete=models.PROTECT, related_name="rooms")  
    name = models.CharField(max_length=80)
    capacity = models.PositiveIntegerField(default=1)
    location_text = models.CharField(max_length=120, blank=True)

#Feature flags
#accessible, has_whiteboard, has_monitor, has_power: simple booleans for filters.
#is_active
#Soft toggle: instead of deleting a room, you can mark it inactive and hide it from search.

    accessible = models.BooleanField(default=False)
    has_whiteboard = models.BooleanField(default=False)
    has_monitor = models.BooleanField(default=False)
    has_power = models.BooleanField(default=True)

    is_active = models.BooleanField(default=True)
#Meta constraint
    #unique_together = ("campus", "name"):
    #You can reuse the same room name across campuses,
    #but within one campus, room names must be unique.
#__str__
    #Displays like: "E: Study Room 101".

    class Meta: 
        unique_together = ("campus", "name")
    def __str__(self) -> str:
        return f"{self.campus.code}: {self.name}"

class Reservation(models.Model): # the booking itself creating allowed values and django will store the values in DB and Admin will show pending etc. 
    STATUS_PENDING = "PENDING"
    STATUS_CONFIRMED = "CONFIRMED"
    STATUS_CANCELLED = "CANCELLED"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_CONFIRMED, "Confirmed"),
        (STATUS_CANCELLED, "Cancelled"),
    ]
    
   # Reservation links a user to a room for a specific time range.
    # Deleting a user removes their reservations (CASCADE).
    # Rooms cannot be deleted if reservations exist (PROTECT).
    # Status is limited to predefined choices.
    # created_at defaults to current time.
    # Database indexes improve performance for room conflict checks
    #and fetching a user’s upcoming reservations.
    #__str__ provides a readable summary of the booking time slot.

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reservations")
    room = models.ForeignKey(Room, on_delete=models.PROTECT, related_name="reservations")
    
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        #DB indexes for faster look ups 
        indexes = [
            models.Index(fields=["room", "start_time", "end_time"]),
            models.Index(fields=["user", "start_time"]),
        ]

    def __str__(self) -> str: # human readabel label for admin
        return f"{self.room} {self.start_time:%Y-%m-%d %H:%M}–{self.end_time:%H:%M} ({self.user})"


class EquipmentType(models.Model):
    name = models.CharField(max_length=60, unique=True)  # e.g. "Laptop Charger"

    def __str__(self) -> str:
        return self.name


class EquipmentItem(models.Model):
    STATUS_AVAILABLE = "AVAILABLE"
    STATUS_CHECKED_OUT = "CHECKED_OUT"
    STATUS_MAINTENANCE = "MAINTENANCE"
    STATUS_CHOICES = [
        (STATUS_AVAILABLE, "Available"),
        (STATUS_CHECKED_OUT, "Checked Out"),
        (STATUS_MAINTENANCE, "Maintenance"),
    ]

    equipment_type = models.ForeignKey(EquipmentType, on_delete=models.PROTECT, related_name="items")
    campus = models.ForeignKey(Campus, on_delete=models.PROTECT, related_name="equipment")
    asset_tag = models.CharField(max_length=40, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_AVAILABLE)
    notes = models.TextField(blank=True)

    def __str__(self) -> str:
        return f"{self.asset_tag} ({self.equipment_type})"


class Checkout(models.Model):
    #borrowing the item( delete user delete checkout)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="checkouts")
    item = models.ForeignKey(EquipmentItem, on_delete=models.PROTECT, related_name="checkouts")
    checked_out_at = models.DateTimeField(default=timezone.now)
    due_at = models.DateTimeField()
    returned_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["item", "returned_at"]),
            models.Index(fields=["user", "returned_at"]),
        ]

    @property
    def is_returned(self) -> bool:
        return self.returned_at is not None

    def __str__(self) -> str:
        return f"{self.item} -> {self.user}"