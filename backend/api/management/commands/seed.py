from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import Room, EquipmentItem, EquipmentType, Campus, Reservation, EquipmentAsset, Checkout
from datetime import date

class Command(BaseCommand):
    help = "Seed the database with all hardcoded data"

    def handle(self, *args, **kwargs):

        # --- going to delete old data first (first seed script filled with fake data)---
        # can comment out if you don't want to delete or can use flush to delete everything 
        Reservation.objects.all().delete()
        Checkout.objects.all().delete()
        EquipmentItem.objects.all().delete()
        EquipmentType.objects.all().delete()

        User.objects.exclude(is_superuser=True).delete()  # keep superusers 
        self.stdout.write(self.style.WARNING("Old data cleared"))


        
        # --- creating campuses ---
        edinburg, _ = Campus.objects.get_or_create(code="E-UTRGV", defaults={"name": "Edinburg Campus"})
        self.stdout.write(self.style.SUCCESS(f"Campus ensured: {edinburg}"))

        brownsville, _ = Campus.objects.get_or_create(code="B-UTRGV", defaults={"name": "Brownsville Campus"})
        self.stdout.write(self.style.SUCCESS(f"Campus ensured: {brownsville}"))

        # --- creating equipment types ---
        types_to_create = ["Media", "Electronics", "Accessories", "Supplies"]
        type_map = {t: EquipmentType.objects.get_or_create(name=t, defaults={"category": t})[0] for t in types_to_create}

        self.stdout.write(self.style.SUCCESS(f"Equipment types ensured: {list(type_map.keys())}"))



        # --- creating some users to test (SUPERUSER INCLUDED)---
        if not User.objects.filter(username="admin").exists():
            User.objects.create_superuser(username="admin", password="admin123", email="admin@example.com")
        if not User.objects.filter(username="student1").exists():
            User.objects.create_user(username="student1", password="student123")
        if not User.objects.filter(username="student2").exists():
            User.objects.create_user(username="student2", password="student123")
        self.stdout.write(self.style.SUCCESS("Users ensured"))

        
        
        # --- creating the equipment list , received from fe
        #  (catalog) ---
        items = [
            {"name": "DVDs", "category": "Media", "description": "Collection of educational and entertainment DVDs",
             "use": "Can be borrowed for personal viewing, classroom presentations, or research purposes",
             "loan_period": "7 days", "location": "Media Library - Shelf A1", "total_quantity": 25, 
             "photo_url": "/media/equipment/dvds.jpg"},

            {"name": "CDs", "category": "Media", "description": "Audio CDs including music, audiobooks, and educational content",
             "use": "For music listening, audiobook review, or audio project work",
             "loan_period": "7 days", "location": "Media Library - Shelf B2", "total_quantity": 25, 
             "photo_url": "/media/equipment/cds.jpg"},

            {"name": "Digital Camcorder", "category": "Media", "description": "Professional digital camcorders for video recording projects",
             "use": "Student projects, documentaries, and research video documentation",
             "loan_period": "3 days", "location": "Media Center - Equipment Room", "total_quantity": 10, 
             "photo_url": "/media/equipment/digitalcamcorder.jpg"},

            {"name": "Digital Camera", "category": "Media", "description": "Digital cameras for photography and image capture",
             "use": "Photography projects, presentations, research documentation",
             "loan_period": "3 days", "location": "Media Center - Equipment Room", "total_quantity": 8, 
             "photo_url": "/media/equipment/digitalcamera.jpg"},

            {"name": "Laptops (MacBook and PC)", "category": "Electronics", "description": "MacBook Pro and Dell XPS laptops for computing needs",
             "use": "Assignments, research, coding projects, and general computing",
             "loan_period": "24 hours (can be renewed)", "location": "Tech Center - Laptop Station",
             "total_quantity": 50, "photo_url": "/media/equipment/laptops.jpg"},

            {"name": "Mobile Phone Charger", "category": "Accessories", "description": "Various phone chargers compatible with most devices",
             "use": "Charging mobile devices, emergency use",
             "loan_period": "24 hours", "location": "Tech Center - Accessories Counter",
             "total_quantity": 30, "photo_url": "/media/equipment/charger.jpg"},

            {"name": "Projector", "category": "Electronics", "description": "High-definition projectors for presentations and screenings",
             "use": "Class presentations, events, movie screenings",
             "loan_period": "1 day", "location": "Presentation Room - Storage",
             "total_quantity": 15, "photo_url": "/media/equipment/projector.jpg"},

            {"name": "Graphing Calculator (TI-84 CE Plus)", "category": "Supplies", "description": "TI-84 CE Plus graphing calculators for mathematics",
             "use": "Math courses, scientific calculations, engineering work",
             "loan_period": "Semester", "location": "Math Tutoring Center",
             "total_quantity": 65, "photo_url": "/media/equipment/graphingcalculator.jpg"},

            {"name": "Scientific Calculator (models vary, batteries not included)", "category": "Supplies", "description": "Various graphing calculator models for mathematics courses",
             "use": "Math courses, scientific calculations, problem solving",
             "loan_period": "Semester", "location": "Math Tutoring Center",
             "total_quantity": 55, "photo_url": "/media/equipment/scientificalculator.jpg"},

            {"name": "iPad", "category": "Electronics", "description": "iPad tablets for note-taking and academic work",
             "use": "Digital note-taking, research, multimedia projects",
             "loan_period": "24 hours (can be renewed)", "location": "Tech Center - Mobile Devices",
             "total_quantity": 20,  "photo_url": "/media/equipment/ipad.jpg"},

            {"name": "Headphones", "category": "Accessories", "description": "Quality headphones for audio work and listening",
             "use": "Multimedia projects, language learning, audio editing",
             "loan_period": "24 hours", "location": "Tech Center - Accessories",
             "total_quantity": 7,  "photo_url": "/media/equipment/headphones.jpg"},

            {"name": "HDMI Cable", "category": "Accessories", "description": "HDMI cables for video and audio connections",
             "use": "Connecting devices to projectors, TVs, and displays",
             "loan_period": "24 hours", "location": "Tech Center - Cables",
             "total_quantity": 7,  "photo_url": "/media/equipment/hdmicable.png"},

            {"name": "Mouse", "category": "Accessories", "description": "Computer mice for desktop and laptop use",
             "use": "Computer navigation and work",
             "loan_period": "24 hours", "location": "Tech Center - Peripherals",
             "total_quantity": 20, "photo_url": "/media/equipment/mouse.jpg"},

            {"name": "Screenflex Portable Display Panels", "category": "Supplies", "description": "Portable room dividers and display panels for events",
             "use": "Creating spaces for presentations, exhibitions, and events",
             "loan_period": "3 days", "location": "Event Space - Storage",
             "total_quantity": 5, "photo_url": "/media/equipment/screenflex.jpg"},

        ]


        # after creating EquipmentItem
        for i, item_data in enumerate(items, start=1):
            eq_type = type_map[item_data["category"]]

            # get quantities from the current item
            total_qty = item_data.get("total_quantity", 0)
            
            # create EquipmentItem type
            eq_item, created = EquipmentItem.objects.update_or_create(
                name=item_data["name"],
                defaults={
                    "equipment_type": eq_type,
                    "description": item_data.get("description", ""),
                    "use": item_data.get("use", ""),
                    "loan_period": item_data.get("loan_period", ""),
                    "location": item_data.get("location", ""),
                    "photo_url": item_data.get("photo_url", ""),
                    "total_quantity": total_qty,
                }
            )


            # create individual assets
            for j in range(1, total_qty + 1):
                asset_tag = f"CAT-{eq_type.name[:3].upper()}-{i:03d}-{j:03d}"
                status =  EquipmentAsset.STATUS_AVAILABLE

                EquipmentAsset.objects.update_or_create(
                    asset_tag=asset_tag,
                    defaults={
                        "equipment_item": eq_item,
                        "status": status,
                        "notes": f"{eq_item.name} - {eq_item.description}"
                    }
                )

        self.stdout.write(self.style.SUCCESS("Equipment catalog ensured"))

        self.stdout.write(self.style.SUCCESS("Individual EquipmentItem assets ensured"))