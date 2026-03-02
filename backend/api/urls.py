from django.urls import path, include
from .views import (
    health, 
    register,
    login,
    studyspaces_statuses,
    ReservationViewSet,
    CheckoutViewSet,
    RoomViewSet,
    EquipmentItemViewSet
)
from rest_framework.routers import DefaultRouter

router = DefaultRouter() #default router automatically creates REST URLs for viewsets
router.register(r"reservations", ReservationViewSet, basename="reservations") #created reservations/ reseervations/{id}
router.register(r"checkouts", CheckoutViewSet, basename="checkouts") #created checkouts/
router.register(r"rooms", RoomViewSet) #creates /rooms/
router.register(r"equipment", EquipmentItemViewSet) #creates /equipment/


urlpatterns = [
    path("health/", health),
    path("auth/register/", register),
    path("auth/login/", login),
    path("studyspaces/statuses/", studyspaces_statuses),
    
    path("", include(router.urls)), #include all router-generated urls
]
