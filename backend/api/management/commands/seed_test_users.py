# seed file for test users:

#   1) creates vaquero01@utrgv.edu / Vaquero01! 
#       on dashboard: 3 room reservations + 2 computer reservations + hdmi cable, headpbones, and mouse checked out
#       on history: 4 completeed reserbvations + 3 cancelled reservations + 3 returned items (projector, ipad, camera) + 3 canceled items (cds, dvds, mobile charger)

#   2) creates vaquero02@utrgv.edu / Vaquero02! ->
#        on dashboard:  3 room reservations + 2 computer reservations + laptop, graphing calculator, scientific calculator checked out
#        on history: 3 completed reservations + 3 canceled reservations + 2 returned items (camcorder and projector) + 3 cancelled items (headphone, hdmi cable, ipad)

# important note: all dates are relative to 'now' so reservations are always in the future

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from api.models import (
    Campus, Room, Reservation, EquipmentItem,
    EquipmentAsset, Checkout
)
from datetime import datetime
from zoneinfo import ZoneInfo


CENTRAL = ZoneInfo("America/Chicago")

class Command(BaseCommand):
    help = "Seeds two demo student accounts with rich reservations, checkouts, and history."

    def handle(self, *args, **kwargs):

        now = timezone.now()

        # creating demo account
        demo_users = [
            {
                "username":   "vaquero01@utrgv.edu",
                "email":      "vaquero01@utrgv.edu",
                "password":   "Vaquero01!",
                "first_name": "Vaquero",
                "last_name":  "One",
            },
            {
                "username":   "vaquero02@utrgv.edu",
                "email":      "vaquero02@utrgv.edu",
                "password":   "Vaquero02!",
                "first_name": "Vaquero",
                "last_name":  "Two",
            },
        ]

        users = {}
        for u in demo_users:
            user, created = User.objects.get_or_create(
                username=u["username"],
                defaults={
                    "email":      u["email"],
                    "first_name": u["first_name"],
                    "last_name":  u["last_name"],
                }
            )
            user.set_password(u["password"])
            user.save()
            users[u["email"]] = user
            label = "created" if created else "updated"
            self.stdout.write(self.style.SUCCESS(f"  {u['email']} — {label}"))

        self.stdout.write(self.style.SUCCESS("Demo users ready"))

        # clearing existing demo data only
        for user in users.values():
            active = Checkout.objects.filter(
                user=user, returned_at__isnull=True
            ).select_related("assigned_asset")
            for c in active:
                if c.assigned_asset:
                    c.assigned_asset.status = EquipmentAsset.STATUS_AVAILABLE
                    c.assigned_asset.save(update_fields=["status"])
            Checkout.objects.filter(user=user).delete()
            Reservation.objects.filter(user=user).delete()

        self.stdout.write(self.style.SUCCESS("Old demo data cleared"))

        # do the rooms
        study_rooms = list(
            Room.objects.filter(has_monitor=False, is_active=True).order_by("name")
        )
        computers = list(
            Room.objects.filter(has_monitor=True, is_active=True).order_by("name")
        )

        if not study_rooms:
            self.stdout.write(self.style.WARNING(
                "No active study rooms found — run seed_rooms_from_floormap first."
            ))

        v01 = users["vaquero01@utrgv.edu"]
        v02 = users["vaquero02@utrgv.edu"]

        # seed the reservations
        #
        # A) UPCOMING  — future, CONFIRMED  → shows on dashboard
        # B) COMPLETED — past end_time, PENDING → "Completed" in history
        # C) CANCELLED — STATUS_CANCELLED   → "Cancelled" in history
        CONFIRMED = Reservation.STATUS_CONFIRMED
        PENDING   = Reservation.STATUS_PENDING
        CANCELLED = Reservation.STATUS_CANCELLED

        def make_res(user, room, days_offset, hour_start, duration_hrs, status):
            # build the datetime in Central Time directly so it displays correctly
            base_ct = now.astimezone(CENTRAL).replace(
                hour=hour_start, minute=0, second=0, microsecond=0
            )
            start_ct = base_ct + timedelta(days=days_offset)
            end_ct   = start_ct + timedelta(hours=duration_hrs)
            # convert back to UTC for storage (since Django stores everything in UTC)
            start = start_ct.astimezone(ZoneInfo("UTC"))
            end   = end_ct.astimezone(ZoneInfo("UTC"))
            return Reservation(
                user=user, room=room,
                start_time=start, end_time=end,
                status=status,
            )

        reservations_to_create = []

        def r(user, room_list, idx, days, hour, dur, status):
            if room_list and idx < len(room_list):
                reservations_to_create.append(
                    make_res(user, room_list[idx], days, hour, dur, status)
                )

        # VAQUERO 01 
        # upcoming
        r(v01, study_rooms, 0,  1, 10, 2, CONFIRMED)
        r(v01, study_rooms, 1,  2, 14, 2, CONFIRMED)
        r(v01, study_rooms, 2,  4,  9, 2, CONFIRMED)
        r(v01, computers,   0,  3,  9, 1, CONFIRMED)
        r(v01, computers,   1,  5, 11, 1, CONFIRMED)
        # completed
        r(v01, study_rooms, 0, -3, 10, 2, PENDING)
        r(v01, study_rooms, 1, -5, 14, 1, PENDING)
        r(v01, computers,   0, -2,  9, 1, PENDING)
        r(v01, study_rooms, 3, -8, 13, 2, PENDING)
        # cancelled
        r(v01, study_rooms, 2, -1, 13, 1, CANCELLED)
        r(v01, study_rooms, 0, -7, 10, 1, CANCELLED)
        r(v01, computers,   1, -4, 11, 1, CANCELLED)

        # VAQUERO 02 
        # upcoming
        r(v02, study_rooms, 3,  1, 13, 1, CONFIRMED)
        r(v02, study_rooms, 4,  3, 15, 2, CONFIRMED)
        r(v02, computers,   0,  2, 11, 1, CONFIRMED)
        r(v02, computers,   1,  4, 14, 1, CONFIRMED)
        r(v02, study_rooms, 5,  6,  9, 2, CONFIRMED)
        # completed
        r(v02, study_rooms, 0, -4, 10, 2, PENDING)
        r(v02, computers,   0, -6,  9, 1, PENDING)
        r(v02, study_rooms, 1, -9, 14, 1, PENDING)
        # cancelled
        r(v02, study_rooms, 2, -2, 14, 1, CANCELLED)
        r(v02, study_rooms, 3, -8, 11, 2, CANCELLED)
        r(v02, computers,   1, -3, 10, 1, CANCELLED)

        Reservation.objects.bulk_create(reservations_to_create)
        self.stdout.write(self.style.SUCCESS(
            f"Created {len(reservations_to_create)} demo reservations"
        ))

        # seed equipment checkouts
        #
        # A) ACTIVE    — returned_at=None,  is_cancelled=False → dashboard
        # B) RETURNED  — returned_at set,   is_cancelled=False → "Returned"
        # C) CANCELLED — returned_at set,   is_cancelled=True  → "Cancelled"
        checkouts_created = 0

        def get_asset(item_name):
            item = EquipmentItem.objects.filter(name__icontains=item_name).first()
            if not item:
                self.stdout.write(self.style.WARNING(f"  '{item_name}' not found — skipping"))
                return None, None
            asset = EquipmentAsset.objects.filter(
                equipment_item=item,
                status=EquipmentAsset.STATUS_AVAILABLE
            ).first()
            if not asset:
                self.stdout.write(self.style.WARNING(f"  No available asset for '{item_name}' — skipping"))
                return None, None
            return item, asset

        def checkout_active(user, item_name, due_days):
            nonlocal checkouts_created
            item, asset = get_asset(item_name)
            if not item:
                return
            asset.status = EquipmentAsset.STATUS_UNAVAILABLE
            asset.save(update_fields=["status"])
            Checkout.objects.create(
                user=user, item=item, assigned_asset=asset,
                checked_out_at=now - timedelta(hours=3),
                due_at=now + timedelta(days=due_days),
                returned_at=None,
                is_cancelled=False,
            )
            checkouts_created += 1
            self.stdout.write(self.style.SUCCESS(
                f"  [ACTIVE]    {item.name} → {user.email} (due in {due_days}d)"
            ))

        def checkout_returned(user, item_name, days_ago):
            nonlocal checkouts_created
            item, asset = get_asset(item_name)
            if not item:
                return
            checked_out  = now - timedelta(days=days_ago + 1)
            returned_at  = now - timedelta(days=days_ago)
            Checkout.objects.create(
                user=user, item=item, assigned_asset=asset,
                checked_out_at=checked_out,
                due_at=checked_out + timedelta(days=3),
                returned_at=returned_at,
                is_cancelled=False,
            )
            checkouts_created += 1
            self.stdout.write(self.style.SUCCESS(
                f"  [RETURNED]  {item.name} → {user.email} ({days_ago}d ago)"
            ))

        def checkout_cancelled(user, item_name, days_ago):
            nonlocal checkouts_created
            item, asset = get_asset(item_name)
            if not item:
                return
            checked_out  = now - timedelta(days=days_ago + 1)
            cancelled_at = now - timedelta(days=days_ago)
            Checkout.objects.create(
                user=user, item=item, assigned_asset=asset,
                checked_out_at=checked_out,
                due_at=checked_out + timedelta(days=3),
                returned_at=cancelled_at,
                is_cancelled=True,
            )
            checkouts_created += 1
            self.stdout.write(self.style.SUCCESS(
                f"  [CANCELLED] {item.name} → {user.email} ({days_ago}d ago)"
            ))

        #  VAQUERO 01 
        self.stdout.write("")
        self.stdout.write("Vaquero 01 checkouts:")
        checkout_active(v01,   "HDMI Cable",               due_days=1)
        checkout_active(v01,   "Headphones",               due_days=1)
        checkout_active(v01,   "Mouse",                    due_days=1)
        checkout_returned(v01, "Projector",                days_ago=3)
        checkout_returned(v01, "iPad",                     days_ago=5)
        checkout_returned(v01, "Digital Camera",           days_ago=8)
        checkout_cancelled(v01, "CDs",                     days_ago=2)
        checkout_cancelled(v01, "DVDs",                    days_ago=6)
        checkout_cancelled(v01, "Mobile Phone Charger",    days_ago=10)

        #  VAQUERO 02 
        self.stdout.write("")
        self.stdout.write("Vaquero 02 checkouts:")
        checkout_active(v02,   "Laptop",                   due_days=1)
        checkout_active(v02,   "Graphing",                 due_days=90)
        checkout_active(v02,   "Scientific",               due_days=90)
        checkout_returned(v02, "Digital Camcorder",        days_ago=4)
        checkout_returned(v02, "Projector",                days_ago=7)
        checkout_cancelled(v02, "Headphones",              days_ago=3)
        checkout_cancelled(v02, "HDMI Cable",              days_ago=9)
        checkout_cancelled(v02, "iPad",                    days_ago=12)

        # print out done
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 55))
        self.stdout.write(self.style.SUCCESS("Demo seed complete!"))
        self.stdout.write(self.style.SUCCESS("=" * 55))
        self.stdout.write("")
        self.stdout.write("  vaquero01@utrgv.edu  /  Vaquero01!")
        self.stdout.write("  vaquero02@utrgv.edu  /  Vaquero02!")
        self.stdout.write("")
        self.stdout.write("  Dashboard  — upcoming reservations + active equipment")
        self.stdout.write("  History    — completed, cancelled reservations")
        self.stdout.write("               returned, cancelled equipment")
        self.stdout.write("")