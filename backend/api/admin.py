from django.contrib import admin
from .models import Campus, Room, Reservation, EquipmentItem, Checkout, EquipmentAsset, EquipmentType, Waitlist, WaitlistHold, Notification


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

#equipment asset  - shows all assets under each equipmentitem
class EquipmentAssetInline(admin.TabularInline):
    model = EquipmentAsset
    extra = 0  # no extra empty rows
    readonly_fields = ['asset_tag', 'status', 'notes']

# equipmentitem admin
@admin.register(EquipmentItem)
class EquipmentItemAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "equipment_type",
        "total_quantity",
        "available_quantity",
    )

    list_filter = ("equipment_type",)
    search_fields = ("name",)

    inlines = [EquipmentAssetInline] #connect to equipment item to the inline assets (instead of managing assets separately, they appear directly under the equipment item n)

# checkput admin 
@admin.register(Checkout)
class CheckoutAdmin(admin.ModelAdmin):
    list_display = ['user', 'item', 'assigned_asset', 'checked_out_at', 'due_at', 'returned_at']
    readonly_fields = ['assigned_asset']  # hide the dropdown for manual assignment
    list_filter = ['item', 'checked_out_at', 'due_at', 'returned_at']

    def save_model(self, request, obj, form, change):
        # this will call the model's save() method which auto-assigns the asset
        super().save_model(request, obj, form, change)
    


@admin.register(EquipmentType)
class EquipmentTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "category")
    search_fields = ("name", "category")


# waitlist visible in admin panel
class WaitlistAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "room", "status", "created_at", "notification_time", "notification_deadline"]
    list_filter = ["status", "room"]
    search_fields = ["user__email", "room__name"]

# the waitlist hold now visible in admin panel
class WaitlistHoldAdmin(admin.ModelAdmin):
    list_display = ["id", "room", "held_start", "held_end", "reserved_for", "expires_at", "is_active"]
    list_filter = ["is_active", "room"]
    search_fields = ["reserved_for__email", "room__name"]

# notification visible in admin panel
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "room", "message", "is_read", "created_at"]
    list_filter = ["is_read"]
    search_fields = ["user__email", "message"]

admin.site.register(Waitlist, WaitlistAdmin)
admin.site.register(WaitlistHold, WaitlistHoldAdmin)
admin.site.register(Notification, NotificationAdmin)

