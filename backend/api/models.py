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
    CATEGORY_CHOICES = [
        ('Accessories', 'Accessories'),
        ('Media', 'Media'),
        ('Electronics', 'Electronics'),
        ('Supplies', 'Supplies'),
    ]

    name = models.CharField(max_length=60, unique=True)
    category = models.CharField(
        max_length=30,
        choices=CATEGORY_CHOICES,
        default='Supplies'
    )

    def __str__(self):
        return self.name


#equipment item as the 'type' such as DVD, Laptop..
class EquipmentItem(models.Model):
    name = models.CharField(max_length=200, default = "Unknown")

    equipment_type = models.ForeignKey(EquipmentType, on_delete=models.CASCADE)

    description = models.TextField(blank=True)
    use = models.TextField(blank=True)
    loan_period = models.CharField(max_length=50, blank=True)
    location = models.CharField(max_length=100, blank=True)
    
    total_quantity = models.IntegerField(default=0)    
    photo_url = models.URLField(blank=True)

    @property
    def available_quantity(self):
        return self.assets.filter(
            status=EquipmentAsset.STATUS_AVAILABLE
        ).count()
    
    def __str__(self):
        return self.name
    
    

#added this new model for better structure of equipment
#individual physical copy with asset_tag and status
class EquipmentAsset(models.Model):
    STATUS_AVAILABLE = 'available'
    STATUS_UNAVAILABLE = 'unavailable'
    STATUS_CHOICES = [
        (STATUS_AVAILABLE, 'Available'),
        (STATUS_UNAVAILABLE, 'Unavailable'),
    ]

    equipment_item = models.ForeignKey(
        EquipmentItem,
        on_delete=models.CASCADE,
        related_name="assets"
    )

    asset_tag = models.CharField(max_length=50, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_AVAILABLE)
    notes = models.TextField(blank=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.asset_tag} ({self.equipment_item.name})"

import random
from datetime import timedelta
import re
#equipment checkout model
class Checkout(models.Model):
    #borrowing the item( delete user delete checkout)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="checkouts") # links checkout to user
    item = models.ForeignKey(EquipmentItem, on_delete=models.PROTECT, related_name="checkouts") #fe chooses this

    assigned_asset = models.ForeignKey(
        EquipmentAsset,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    checked_out_at = models.DateTimeField(default=timezone.now) #borrowed at time 
    due_at = models.DateTimeField() #expcted return date/time
    returned_at = models.DateTimeField(null=True, blank=True) #actual return time

    def save(self, *args, **kwargs):
        # When creating a new checkout
        if not self.pk and not self.assigned_asset:
            available_assets = EquipmentAsset.objects.filter(
                equipment_item=self.item,
                status=EquipmentAsset.STATUS_AVAILABLE
            )

            if not available_assets.exists():
                raise ValueError("No available assets for this item.")

            asset = available_assets.first()  # assign first available asset
            self.assigned_asset = asset
            asset.status = EquipmentAsset.STATUS_UNAVAILABLE
            asset.save(update_fields=["status"])

            # calculate due_at from loan_period 
            if not self.due_at:
                period_str = self.item.loan_period.lower().strip()  # e.g., "7 days"
                match = re.match(r"(\d+)\s*(day|days|hour|hours|week|weeks)", period_str)
                if match:
                    num = int(match.group(1))
                    unit = match.group(2)
                    if "day" in unit:
                        self.due_at = timezone.now() + timedelta(days=num)
                    elif "hour" in unit:
                        self.due_at = timezone.now() + timedelta(hours=num)
                    elif "week" in unit:
                        self.due_at = timezone.now() + timedelta(weeks=num)
                else:
                    self.due_at = timezone.now() + timedelta(days=1)

        super().save(*args, **kwargs)

