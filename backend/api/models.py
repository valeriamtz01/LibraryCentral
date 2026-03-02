#to define the database table 
#using it to store the campuses rooms and reservations so far 
from django.conf import settings # to reference project settings 
from django.db import models # ORM base classes 
from django.utils import timezone # timezone aware

#campus model 
class Campus(models.Model):
    code = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=100)

    class Meta: 
        verbose_name = "Campus"
        verbose_name_plural = "Campus"
        
    def __str__(self) -> str:
        return f"{self.code} - {self.name}"
    
#room model
class Room(models.Model):
    #each room belongs to one campus a caampus many rooms, you cant delete a campus if it has rooms, and last part lets you do campus.rooms.all()
    #these are the core room fields:
        #name: room name (like Room 2.111).
        #capacity: only allows non-negative integers; default 1.
        #location_text: optional text; blank=True means forms/admin allow it empty.
    campus = models.ForeignKey(Campus, on_delete=models.PROTECT, related_name="rooms")  
    name = models.CharField(max_length=80)
    capacity = models.PositiveIntegerField(default=1)
    location_text = models.CharField(max_length=120, blank=True)

#feature flags for filtering/searching
#accessible, has_whiteboard, has_monitor, has_power: simple booleans for filters
#is_active = soft toggle: instead of deleting a room, mark it inactive and hide it from search.

    accessible = models.BooleanField(default=False) 
    has_whiteboard = models.BooleanField(default=False)
    has_monitor = models.BooleanField(default=False)
    has_power = models.BooleanField(default=True)

    is_active = models.BooleanField(default=True) 

#meta constraint
    #unique_together = ("campus", "name"):
    #You can reuse the same room name across campuses,
    #but within one campus, room names must be unique.
#__str__
    #Displays like: "UTRGV: Room 2.111.

    class Meta: 
        unique_together = ("campus", "name") # again, ensures sam eroom name cannot exist within same campus

    def __str__(self) -> str:
        return f"{self.campus.code}: {self.name}" # the readable format for admin

#reservation model
class Reservation(models.Model): # the booking itself creating allowed values and django will store the values in database and admin will show pending or confirmed, cancelled 
    # the status options:
    STATUS_PENDING = "PENDING"
    STATUS_CONFIRMED = "CONFIRMED"
    STATUS_CANCELLED = "CANCELLED"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_CONFIRMED, "Confirmed"),
        (STATUS_CANCELLED, "Cancelled"),
    ]
    
    # reservation links a user to a room for a specific time range
    # deleting a user removes their reservations (CASCADE)
    # rooms cannot be deleted if reservations exist (PROTECT)
    # status is limited to predefined choices
    # created_at defaults to current time
    # database indexes improve performance for room conflict checks
    # and fetching a user’s upcoming reservations
    # __str__ provides a readable summary of the booking time slot

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reservations")
    room = models.ForeignKey(Room, on_delete=models.PROTECT, related_name="reservations")
    
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        #database indexes for faster lookup in the queuries
        indexes = [
            models.Index(fields=["room", "start_time", "end_time"]),
            models.Index(fields=["user", "start_time"]),
        ]

    def __str__(self) -> str: #shows room and reservation time raneg with user
        return f"{self.room} {self.start_time:%Y-%m-%d %H:%M}–{self.end_time:%H:%M} ({self.user})"


#equipment type model
class EquipmentType(models.Model):
    name = models.CharField(max_length=60, unique=True)  # the type name
    category = models.CharField(max_length=30, choices=[('Accessories','Accessories'),('Media','Media'),('Electronics','Electronics'),('Supplies','Supplies')], default='Supplies') #categories limited to these specific choices

    def __str__(self) -> str:
        return self.name


#individual equipment item
class EquipmentItem(models.Model):
    STATUS_AVAILABLE = "AVAILABLE"
    STATUS_CHECKED_OUT = "CHECKED_OUT"
    STATUS_MAINTENANCE = "MAINTENANCE"
    STATUS_CHOICES = [
        (STATUS_AVAILABLE, "Available"),
        (STATUS_CHECKED_OUT, "Checked Out"),
        (STATUS_MAINTENANCE, "Maintenance"),
    ]

    # link to equipment type
    equipment_type = models.ForeignKey(EquipmentType, on_delete=models.PROTECT, related_name="items")
    campus = models.ForeignKey(Campus, on_delete=models.PROTECT, related_name="equipment")
    asset_tag = models.CharField(max_length=40, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_AVAILABLE)
    notes = models.TextField(blank=True)

    def __str__(self) -> str:
        return f"{self.asset_tag} ({self.equipment_type})"


#equipment checkout model
class Checkout(models.Model):
    #borrowing the item( delete user delete checkout)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="checkouts") # links checkout to user
    item = models.ForeignKey(EquipmentItem, on_delete=models.PROTECT, related_name="checkouts") # linnks checkout to equipment item (PROTECT - can't delete item if it has active checkout records)
    checked_out_at = models.DateTimeField(default=timezone.now) #borrowed at time
    due_at = models.DateTimeField() #expcted return date/time
    returned_at = models.DateTimeField(null=True, blank=True) #actual return time

    class Meta:
        indexes = [ 
            models.Index(fields=["item", "returned_at"]), #for checking if an item is available
            models.Index(fields=["user", "returned_at"]), #for fetching all acitve loans for a user
        ]

    @property
    def is_returned(self) -> bool:
        return self.returned_at is not None #a convience property - true if item is returned

    def __str__(self) -> str:
        return f"{self.item} -> {self.user}"