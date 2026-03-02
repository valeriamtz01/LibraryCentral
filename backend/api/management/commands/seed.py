from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import Room, EquipmentItem, EquipmentType, Campus, Reservation
from datetime import date

class Command(BaseCommand):
    help = "Seed the database with all hardcoded data"

    def handle(self, *args, **kwargs):

        # --- going to delete old data first (first seed script filled with fake data)---
        Reservation.objects.all().delete()
        EquipmentItem.objects.all().delete()
        EquipmentType.objects.all().delete()
        Room.objects.all().delete()
        Campus.objects.all().delete()
        User.objects.exclude(is_superuser=True).delete()  # keep superusers if desired
        self.stdout.write(self.style.WARNING("Old data cleared"))


        
        # --- creating campuses ---
        campus, _ = Campus.objects.get_or_create(code="EDINBURG", defaults={"name": "Edinburg Campus"})
        self.stdout.write(self.style.SUCCESS(f"Campus ensured: {campus}"))

        campus, _ = Campus.objects.get_or_create(code="BROWNSVILLE", defaults={"name": "Brownsville Campus"})
        self.stdout.write(self.style.SUCCESS(f"Campus ensured: {campus}"))

        # --- creating rooms ---
        Room.objects.get_or_create(name="Study Room A", campus=campus, defaults={"is_active": True, "capacity": 4})
        Room.objects.get_or_create(name="Study Room B", campus=campus, defaults={"is_active": True, "capacity": 6})
        self.stdout.write(self.style.SUCCESS("Rooms ensured"))

        # --- creating some users to test ---
        if not User.objects.filter(username="admin").exists():
            User.objects.create_superuser(username="admin", password="admin123", email="admin@example.com")
        if not User.objects.filter(username="student1").exists():
            User.objects.create_user(username="student1", password="student123")
        if not User.objects.filter(username="student2").exists():
            User.objects.create_user(username="student2", password="student123")
        self.stdout.write(self.style.SUCCESS("Users ensured"))

        # --- creating equipment types ---
        media_type, _ = EquipmentType.objects.get_or_create(name="Media")
        electronics_type, _ = EquipmentType.objects.get_or_create(name="Electronics")
        accessories_type, _ = EquipmentType.objects.get_or_create(name="Accessories")
        supplies_type, _ = EquipmentType.objects.get_or_create(name="Supplies")
        laptop_type, _ = EquipmentType.objects.get_or_create(name="Laptop")
        camera_type, _ = EquipmentType.objects.get_or_create(name="Camera")
        self.stdout.write(self.style.SUCCESS("Equipment types ensured"))

        # --- creating the equipment listclear
        #  (catalog) ---
        items = [
            {"name": "DVDs", "category": "Media", "description": "Collection of educational and entertainment DVDs",
             "use": "Can be borrowed for personal viewing, classroom presentations, or research purposes",
             "loan_period": "7 days", "location": "Media Library - Shelf A1", "total_quantity": 25, "available_quantity": 25,
             "photo_url": "https://via.placeholder.com/400x300?text=DVDs"},
            {"name": "CDs", "category": "Media", "description": "Audio CDs including music, audiobooks, and educational content",
             "use": "For music listening, audiobook review, or audio project work",
             "loan_period": "7 days", "location": "Media Library - Shelf B2", "total_quantity": 25, "available_quantity": 25,
             "photo_url": "https://via.placeholder.com/400x300?text=CDs"},
            {"name": "Digital Camcorder", "category": "Media", "description": "Professional digital camcorders for video recording projects",
             "use": "Student projects, documentaries, and research video documentation",
             "loan_period": "3 days", "location": "Media Center - Equipment Room", "total_quantity": 10, "available_quantity": 10,
             "photo_url": "https://via.placeholder.com/400x300?text=Camcorder"},
            {"name": "Digital Camera", "category": "Media", "description": "Digital cameras for photography and image capture",
             "use": "Photography projects, presentations, research documentation",
             "loan_period": "3 days", "location": "Media Center - Equipment Room", "total_quantity": 8, "available_quantity": 0,
             "photo_url": "https://via.placeholder.com/400x300?text=Camera"},
            {"name": "Laptops (MacBook and PC)", "category": "Electronics", "description": "MacBook Pro and Dell XPS laptops for computing needs",
             "use": "Assignments, research, coding projects, and general computing",
             "loan_period": "24 hours (can be renewed)", "location": "Tech Center - Laptop Station",
             "total_quantity": 50, "available_quantity": 50, "photo_url": "https://via.placeholder.com/400x300?text=Laptops"},
            {"name": "Mobile Phone Charger", "category": "Accessories", "description": "Various phone chargers compatible with most devices",
             "use": "Charging mobile devices, emergency use",
             "loan_period": "24 hours", "location": "Tech Center - Accessories Counter",
             "total_quantity": 30, "available_quantity": 30, "photo_url": "https://via.placeholder.com/400x300?text=Charger"},
            {"name": "Projector", "category": "Electronics", "description": "High-definition projectors for presentations and screenings",
             "use": "Class presentations, events, movie screenings",
             "loan_period": "1 day", "location": "Presentation Room - Storage",
             "total_quantity": 15, "available_quantity": 15, "photo_url": "https://via.placeholder.com/400x300?text=Projector"},
            {"name": "Graphing Calculator (TI-84 CE Plus)", "category": "Supplies", "description": "TI-84 CE Plus graphing calculators for mathematics",
             "use": "Math courses, scientific calculations, engineering work",
             "loan_period": "Semester", "location": "Math Tutoring Center",
             "total_quantity": 65, "available_quantity": 0, "photo_url": "https://via.placeholder.com/400x300?text=Calculator"},
            {"name": "Graphing Calculator (models vary, batteries not included)", "category": "Supplies", "description": "Various graphing calculator models for mathematics courses",
             "use": "Math courses, scientific calculations, problem solving",
             "loan_period": "Semester", "location": "Math Tutoring Center",
             "total_quantity": 55, "available_quantity": 55, "photo_url": "https://via.placeholder.com/400x300?text=Calculator2"},
            {"name": "iPad", "category": "Electronics", "description": "iPad tablets for note-taking and academic work",
             "use": "Digital note-taking, research, multimedia projects",
             "loan_period": "24 hours (can be renewed)", "location": "Tech Center - Mobile Devices",
             "total_quantity": 20, "available_quantity": 20, "photo_url": "https://via.placeholder.com/400x300?text=iPad"},
            {"name": "Headphones", "category": "Accessories", "description": "Quality headphones for audio work and listening",
             "use": "Multimedia projects, language learning, audio editing",
             "loan_period": "24 hours", "location": "Tech Center - Accessories",
             "total_quantity": 7, "available_quantity": 7, "photo_url": "https://via.placeholder.com/400x300?text=Headphones"},
            {"name": "HDMI Cable", "category": "Accessories", "description": "HDMI cables for video and audio connections",
             "use": "Connecting devices to projectors, TVs, and displays",
             "loan_period": "24 hours", "location": "Tech Center - Cables",
             "total_quantity": 7, "available_quantity": 7, "photo_url": "https://via.placeholder.com/400x300?text=HDMI+Cable"},
            {"name": "Mouse", "category": "Accessories", "description": "Computer mice for desktop and laptop use",
             "use": "Computer navigation and work",
             "loan_period": "24 hours", "location": "Tech Center - Peripherals",
             "total_quantity": 20, "available_quantity": 20, "photo_url": "https://via.placeholder.com/400x300?text=Mouse"},
            {"name": "Screenflex Portable Display Panels", "category": "Supplies", "description": "Portable room dividers and display panels for events",
             "use": "Creating spaces for presentations, exhibitions, and events",
             "loan_period": "3 days", "location": "Event Space - Storage",
             "total_quantity": 5, "available_quantity": 5, "photo_url": "https://via.placeholder.com/400x300?text=Display+Panels"},
        ]

        for i, item in enumerate(items, start=1):
            eq_type = {
                "Media": media_type,
                "Electronics": electronics_type,
                "Accessories": accessories_type,
                "Supplies": supplies_type
            }[item["category"]]

            # give each item a unique asset_tag
            asset_tag = f"{eq_type.name.upper()}-{i:03d}"

            EquipmentItem.objects.update_or_create(
                asset_tag=asset_tag, # using the unique one from above
                defaults={
                    "equipment_type": eq_type,
                    "campus": campus,
                    "status" : EquipmentItem.STATUS_AVAILABLE,
                    "notes": f"{item['name']}\nCategory: {item['category']}\nDescription: {item['description']}\nUse: {item['use']}\nLoan Period: {item['loan_period']}\nLocation: {item['location']}\nTotal Quantity: {item['total_quantity']}\nAvailable Quantity: {item['available_quantity']}\nPhoto: {item['photo_url']}"
                }
            )

        self.stdout.write(self.style.SUCCESS("Equipment catalog ensured"))

        # --- Individual physical equipment items ---
        EquipmentItem.objects.get_or_create(
            equipment_type=laptop_type, campus=campus, asset_tag="LAPTOP-001", defaults={"status": EquipmentItem.STATUS_AVAILABLE}
        )
        EquipmentItem.objects.get_or_create(
            equipment_type=camera_type, campus=campus, asset_tag="CAMERA-001", defaults={"status": EquipmentItem.STATUS_AVAILABLE}
        )

        self.stdout.write(self.style.SUCCESS("Individual EquipmentItem assets ensured"))