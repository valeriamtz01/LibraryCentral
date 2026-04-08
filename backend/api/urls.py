from django.urls import path, include
from .views import (
    health, 
    register,
    login,
    studyspaces_statuses,
    ReservationViewSet,
    CheckoutViewSet,
    RoomViewSet,
    EquipmentItemViewSet,
    dashboard_summary,
    join_waitlist,
    get_notifications,
    mark_notifications_read,
    decline_waitlist,
    room_schedule,
)
from rest_framework.routers import DefaultRouter

router = DefaultRouter() #default router automatically creates REST URLs for viewsets
router.register(r"reservations", ReservationViewSet, basename="reservations") #created reservations/ reseervations/{id}
router.register(r"checkouts", CheckoutViewSet, basename="checkouts") #created checkouts/
router.register(r"rooms", RoomViewSet) #creates /rooms/
router.register(r"equipment", EquipmentItemViewSet, basename = "equipment") #creates /equipment/


urlpatterns = [
    path("health/", health),
    path("auth/register/", register), #creates new user
    path("auth/login/", login), #issues JWT tokem
    path("studyspaces/statuses/", studyspaces_statuses), #returns room statuses
    path("user/dashboard-summary/", dashboard_summary), #summary for dashboard (updates)
    path("waitlist/join/", join_waitlist),
    path("waitlist/decline/", decline_waitlist),
    path("notifications/", get_notifications),
    path("notifications/mark-read/", mark_notifications_read),
    path("studyspaces/<int:room_id>/schedule/", room_schedule),
        
    path("", include(router.urls)), #include all router-generated urls
]
