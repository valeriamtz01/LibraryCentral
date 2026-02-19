from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import Room, EquipmentItem, EquipmentType, Campus
from datetime import datetime, timedelta

# a simple seed script to populate database

class Command(BaseCommand):
    help = "Seed the database with test data"

    def handle(self, *args, **kwargs):

        # step 1: create or get campus
        campus, created = Campus.objects.get_or_create(code="MAIN", defaults={"name": "Main Campus"})
        if created:
            self.stdout.write(self.style.SUCCESS(f"Created campus: {campus}"))

        # step 2: create rooms linked to the campus
        Room.objects.all().delete()  # clear previous rooms
        rooms = [
            Room.objects.create(name="Study Room A", is_active=True, campus=campus, capacity=4),
            Room.objects.create(name="Study Room B", is_active=True, campus=campus, capacity=6),
        ]
        self.stdout.write(self.style.SUCCESS("Created rooms"))

        # step 3: create users
        if not User.objects.filter(username="admin").exists():
            User.objects.create_superuser(username="admin", password="admin123", email="admin@example.com")
            self.stdout.write("Created superuser: admin/admin123")

        if not User.objects.filter(username="student1").exists():
            User.objects.create_user(username="student1", password="student123")
            self.stdout.write("Created student user: student1/student123")

        if not User.objects.filter(username="student2").exists():
            User.objects.create_user(username="student2", password="student123")
            self.stdout.write("Created student user: student2/student123")

        # step 4: create equipment types
        EquipmentType.objects.all().delete()  # clear previous types
        etype_laptop = EquipmentType.objects.create(name="Laptop")
        etype_camera = EquipmentType.objects.create(name="Camera")
        self.stdout.write(self.style.SUCCESS("Created equipment types"))

        # step 5: create equipment items
        EquipmentItem.objects.all().delete()  # clear previous items
        EquipmentItem.objects.create(
            equipment_type=etype_laptop,
            campus=campus,
            asset_tag="LAPTOP-001",
            status=EquipmentItem.STATUS_AVAILABLE,
        )
        EquipmentItem.objects.create(
            equipment_type=etype_camera,
            campus=campus,
            asset_tag="CAMERA-001",
            status=EquipmentItem.STATUS_AVAILABLE,
        )
        self.stdout.write(self.style.SUCCESS("Created equipment items"))

        self.stdout.write(self.style.SUCCESS("Database seeded successfully!"))