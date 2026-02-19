from django.contrib import admin
from .models import Campus, Room, Reservation, EquipmentItem, Checkout


# Register your models here.

#campus admin - register the campus model in admin
@admin.register(Campus)
class CampusAdmin(admin.ModelAdmin):
    list_display = ("code", "name") #shown in the list view
    search_fields = ("code", "name") #search by in the admin search bar

#room admin
@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ( # colums in admin list view
        "name",
        "campus",
        "capacity",
        "accessible",
        "has_whiteboard",
        "has_monitor",
        "has_power",
        "is_active"
    )
    list_filter = ("campus", "accessible", "has_whiteboard", "has_monitor", "has_power", "is_active")
    search_fields = ("name", "location_text")

# reservation admin
@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ("room", "user", "start_time", "end_time", "status", "created_at") #main fields to show in list view
    list_filter = ("status", "room", "user") # filters for status, room, and user
    search_fields = ("room__name", "user__username", "user__email") # allows searching by room name or user info
    date_hierarchy = "start_time" # adds a date navigation abr for start_time

# equipmentitem admin
@admin.register(EquipmentItem)
class EquipmentItemAdmin(admin.ModelAdmin):
    list_display = ("asset_tag", "equipment_type", "campus", "status") # important fields
    list_filter = ("status", "campus", "equipment_type") # filer by staus, campus and type
    search_fields = ("asset_tag", "notes") # search by asset tag or notes

# checkput admin 
@admin.register(Checkout)
class CheckoutAdmin(admin.ModelAdmin):
    list_display = ("item", "user", "checked_out_at", "due_at", "returned_at", "is_returned") #show the items, user, dates, and if returned
    list_filter = ("item__equipment_type", "user", "returned_at") # filter by equipment type, user and returned status
    search_fields = ("item__asset_tag", "user__username", "user__email") # search by item tag or user info
    date_hierarchy = "checked_out_at" # allows filtering by checout date

    #show the @property is_returned as a boolean in admin
    def is_returned(self, obj):
        return obj.is_returned # true if returned_at is not none
    is_returned.boolean = True #displays as a tick in admin
    is_returned.short_description = "Returned?" # columns label