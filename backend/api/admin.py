from django.contrib import admin
from .models import Campus, Room, Reservation, EquipmentItem, Checkout, EquipmentAsset, EquipmentType, Waitlist, WaitlistHold, Notification
from django.db.models import Count

# Register your models here.

# site headers
admin.site.site_header = "LibraryCentral Administration"
admin.site.site_title  = "LibraryCentral Admin"
admin.site.index_title = "Welcome to LibraryCentral"

#campus admin - register the campus model in admin
@admin.register(Campus)
class CampusAdmin(admin.ModelAdmin):
    list_display = ("code", "name") #shown in the list view
    search_fields = ("code", "name") #search by in the admin search bar

    def get_queryset(self, request):
        # names match exactly what seed.py stores: "Edinburg Campus" and "Brownsville Campus"
        return super().get_queryset(request).filter(
            name__in=["Edinburg Campus", "Brownsville Campus"]
        )
    
#room admin
@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ( # columns in admin list view
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
    

# equipment type - shows total items per category
@admin.register(EquipmentType)
class EquipmentTypeAdmin(admin.ModelAdmin):
    # item_count is a custom column defined below — counts EquipmentItems
    # that belong to each EquipmentType row
    list_display = ("name", "category", "item_count")
    search_fields = ("name", "category")

    def get_queryset(self, request):
        # annotate each equipmentypes with a count of its related eqipmentitems
        # _item_count is then available on each obj in item_count() below
        return super().get_queryset(request).annotate(
            _item_count=Count("equipmentitem")
        )

    # uses Django's 'annotate(Count(..))' on the queryset so it's a single efficient DB query (no loop)
    # counts equipmentitem rows per type 
    @admin.display(description="# Items", ordering="_item_count")
    def item_count(self, obj):
        # returns the annotated count such as supplies shows 3
        return obj._item_count

# # waitlist visible in admin panel
# class WaitlistAdmin(admin.ModelAdmin):
#     list_display = ["id", "user", "room", "status", "created_at", "notification_time", "notification_deadline"]
#     list_filter = ["status", "room"]
#     search_fields = ["user__email", "room__name"]


# waitlist as inline inside "WaitlistHold" is not possible without a direct foreignkey
# so added a custom read-only column on waitlistholdadmin that
# queries waitlist by room and displays the results as text
@admin.register(WaitlistHold)
class WaitlistHoldAdmin(admin.ModelAdmin):
    list_display  = ["id", "room", "held_start", "held_end",
                     "reserved_for", "expires_at", "is_active", "waitlist_entries"]
    list_filter   = ["is_active", "room"]
    search_fields = ["reserved_for__email", "room__name"]

    # adds a 'waitlist entries' column to the list view
    # shows active waiters for the same room as this hold
    @admin.display(description="Waitlist entries (same room)")
    def waitlist_entries(self, obj):
        # query waitlist for waiting/notified entries in the hold's room
        entries = Waitlist.objects.filter(
            room=obj.room,
            status__in=[Waitlist.STATUS_WAITING, Waitlist.STATUS_NOTIFIED]
        ).select_related("user")

        if not entries.exists():
            return "None"

        # format each entry as "username (status)"
        return ", ".join(
            f"{e.user.username} ({e.status})" for e in entries
        )

    # also show it on the detail/edit page as a readonly field
    readonly_fields = ["waitlist_entries"]

# waitlist still has its own page for full management
@admin.register(Waitlist)
class WaitlistAdmin(admin.ModelAdmin):
    list_display  = ["id", "user", "room", "status", "created_at",
                     "notification_time", "notification_deadline"]
    list_filter   = ["status", "room"]
    search_fields = ["user__email", "room__name"]


# notification visible in admin panel
@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "room", "message", "is_read", "created_at"]
    list_filter = ["is_read"]
    search_fields = ["user__email", "message"]


