import re
from pathlib import Path

from django.core.management.base import BaseCommand
from api.models import Campus, Room


class Command(BaseCommand):
    #Seeds Room rows based on the hard-coded room names used in FloorMap.tsx.

    #Why this exists:
    # frontend map hotspots use exact strings like "Room 3.126D"
    # frontend statuses object is keyed by those exact strings
    # If backend Room.name doesn't match exactly, statuses won't line up

    
    #What this command does:
     # Reads the frontend FloorMap.tsx file
     # Extracts every room string passed into handleRoomClick("...")
     # Creates/updates Room rows for a campus (idempotent)
    

    help = "Seed Room entries into the DB by extracting room names from FloorMap.tsx"

    # edited the code and name 
    def add_arguments(self, parser):
        parser.add_argument(
            "--campus-code",
            type=str,
            default="E-UTRGV",
            help="Campus code to attach rooms to (default: E-UTRGV)",
        )
        parser.add_argument(
            "--campus-name",
            type=str,
            default="Edinburg Campus",
            help="Campus name to create if campus does not exist (default: Edinburg Campus)",
        )
        parser.add_argument(
            "--capacity",
            type=int,
            default=4,
            help="Default room capacity used for created rooms (default: 4)",
        )
        parser.add_argument(
            "--tsx",
            type=str,
            default="../frontend/src/components/FloorMap.tsx",
            help=(
                "Path to FloorMap.tsx relative to backend/ directory "
                "(default: ../frontend/src/components/FloorMap.tsx)"
            ),
        )

    def handle(self, *args, **options):
        campus_code = options["campus_code"]
        campus_name = options["campus_name"]
        default_capacity = options["capacity"]

        # run command from backend/ usually, so resolve TSX path from backend/
        tsx_path = Path(options["tsx"]).resolve()

        if not tsx_path.exists():
            self.stderr.write(self.style.ERROR(f"FloorMap.tsx not found at: {tsx_path}"))
            self.stderr.write(
                self.style.WARNING(
                    "Tip: run this command from backend/ or pass --tsx with the correct path."
                )
            )
            return

        tsx_text = tsx_path.read_text(encoding="utf-8", errors="replace")

        # Specifically look for: handleRoomClick("Room ...")
        # Example match: handleRoomClick("Room 3.126D")
        # CCTB — matches handleRoomClick("Room 2.111", "room") and handleRoomClick("Computer 2.1", "computer")
        # [^"]+ matches the room/computer name
        # ,\s*"[^"]*" optionally matches the second argument like , "room" or , "computer"
        pattern = r'handleRoomClick\("([^"]+)",\s*"(?:room|computer)"\)'
        room_names = re.findall(pattern, tsx_text)

        # De-duplicate while preserving order
        seen = set()
        unique_room_names = []
        for name in room_names:
            name = name.strip()
            if name and name not in seen:
                seen.add(name)
                unique_room_names.append(name)

        if not unique_room_names:
            self.stderr.write(self.style.ERROR("No room names found in FloorMap.tsx."))
            self.stderr.write(
                self.style.WARNING(
                    "Make sure FloorMap uses handleRoomClick(\"Room ...\") strings."
                )
            )
            return

        # Ensure campus exists
        campus, _ = Campus.objects.get_or_create(
            code=campus_code,
            defaults={"name": campus_name},
        )

        created = 0
        updated = 0

        # Room model has unique_together = ("campus", "name")
        for room_name in unique_room_names:
            # UPDATED — set meaningful defaults per room type
            is_computer = room_name.startswith("Computer")

            obj, was_created = Room.objects.update_or_create(
                campus=campus,
                name=room_name,
                defaults={
                    "capacity":      1 if is_computer else default_capacity,
                    "location_text": "Floor 2 Computer Lab" if is_computer else "",
                    "has_monitor":   is_computer,       # computers have monitors, rooms don't by default
                    "has_whiteboard":not is_computer,   # study rooms have whiteboards, computers don't
                    "has_power":     True,              # everything has power
                    "accessible":    False,             # update manually in admin for specific rooms
                    "is_active":     True,
                },
            )

            if was_created:
                created += 1
            else:
                updated += 1

     

        self.stdout.write(self.style.SUCCESS(" Seed complete."))
        self.stdout.write(f"Campus: {campus.code} ({campus.name})")
        self.stdout.write(f"Rooms extracted from TSX: {len(unique_room_names)}")
        self.stdout.write(f"Created: {created}")
        self.stdout.write(f"Updated: {updated}")

       