# (ignore this for now) seed file for test users:

#   1) creates vaquero01@utrgv.edu / Vaquero01! 
#       on dashboard: 3 room reservations + 2 computer reservations + hdmi cable, headpbones, and mouse checked out
#       on history: 4 completeed reserbvations + 3 cancelled reservations + 3 returned items (projector, ipad, camera) + 3 canceled items (cds, dvds, mobile charger)

#   2) creates vaquero02@utrgv.edu / Vaquero02! ->
#        on dashboard:  3 room reservations + 2 computer reservations + laptop, graphing calculator, scientific calculator checked out
#        on history: 3 completed reservations + 3 canceled reservations + 2 returned items (camcorder and projector) + 3 cancelled items (headphone, hdmi cable, ipad)



# PRESENTATION SETUP: 
#           vaq2 has 1 study room booked for 11:30-1pm for may 11 (so it's show red on map during demo)
#           vaq3 has 1 computer booked 11:30-1pm for today for may 11 (so it's shown red on map during demo)
#           ** vaq1 has NO bookings between 11:30-1pm (free to demo live)

# 1) vaquero01@utrgv.edu
#   dashboard: 1 study room (different day) + 1 computer (different day) + 1 active checkout (NOTHING FOR MAY 11)
#   history: 1 completed room and 1 completed and cancelled computery
 
# 2) vaquero02@utrgv.edu
#   dashboard: 1 study room + 1 other day room + 1 active checkout 
#   history: 1 completed and cancelled room

# 3) vaqeuro03@utrgv.edu
#   dashboard: 1 computer + 1 other day room + 1 active checkout 
#   history: 1 completed and cancelled room

# thse 11:30–1pm bookings are computed from today's date in Central Time


# important note: all dates are relative to 'now' so reservations are always in the future

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from api.models import (
    Campus, Room, Reservation, EquipmentItem,
    EquipmentAsset, Checkout, Waitlist, WaitlistHold, Notification
)
from datetime import datetime
from zoneinfo import ZoneInfo


CENTRAL = ZoneInfo("America/Chicago")

class Command(BaseCommand):
    help = "Seeds two demo student accounts with rich reservations, checkouts, and history."

    def handle(self, *args, **kwargs):

        now = timezone.now()
        now_ct = now.astimezone(CENTRAL)


        # creating demo account (vaquero01, vaquero02, vaquero03)
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
            {
                "username":   "vaquero03@utrgv.edu",
                "email":      "vaquero03@utrgv.edu",
                "password":   "Vaquero03!",
                "first_name": "Vaquero",
                "last_name":  "Three",
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
        if not computers:
            self.stdout.write(self.style.WARNING(
                "No active computer rooms found."
            ))
 
        v01 = users["vaquero01@utrgv.edu"]
        v02 = users["vaquero02@utrgv.edu"]
        v03 = users["vaquero03@utrgv.edu"]
 
        CONFIRMED = Reservation.STATUS_CONFIRMED
        PENDING   = Reservation.STATUS_PENDING
        CANCELLED = Reservation.STATUS_CANCELLED

        # helper function: build a reservation using central time 
        def make_res(user, room, days_offset, hour_start, minute_start, duration_hrs, status):
            """
            Builds a Reservation object with times anchored to Central Time.
            days_offset: positive = future, negative = past
            """
            base_ct = now_ct.replace(
                hour=hour_start, minute=minute_start, second=0, microsecond=0
            )
            start_ct = base_ct + timedelta(days=days_offset)
            end_ct   = start_ct + timedelta(hours=duration_hrs)
            start    = start_ct.astimezone(ZoneInfo("UTC"))
            end      = end_ct.astimezone(ZoneInfo("UTC"))
            return Reservation(
                user=user, room=room,
                start_time=start, end_time=end,
                status=status,
            )

        reservations_to_create = []

        def r(user, room_list, idx, days, hour, minute, dur, status):
            if room_list and idx < len(room_list):
                reservations_to_create.append(
                    make_res(user, room_list[idx], days, hour, minute, dur, status)
                )

        # VAQUERO 01 
        # dashboard: 1 room tomorrow morning + 1 computer day after tomorrow
        # history:   1 completed room + 1 completed computer + 1 cancelled computer
        self.stdout.write("\nVaquero 01 reservations:")
 
        # upcoming (not overlapping 11:30–1pm today)
        r(v01, study_rooms, 0,  1,  9,  0, 2, CONFIRMED)   # tomorrow 9am–11am
        r(v01, computers,   0,  2, 14,  0, 1, CONFIRMED)   # day after tomorrow 2pm–3pm
 
        # completed (past)
        r(v01, study_rooms, 1, -3, 10,  0, 2, PENDING)     # 3 days ago, room
        r(v01, computers,   0, -5,  9,  0, 1, PENDING)     # 5 days ago, computer
 
        # cancelled (past)
        r(v01, computers,   1, -2, 11,  0, 1, CANCELLED)   # 2 days ago, computer cancelled

        # VAQUERO 02 
        self.stdout.write("\nVaquero 02 reservations:")
 
        # RED HOTSPOT: today 11:30am–1pm
        r(v02, study_rooms, 0,  0, 11, 30, 1.5, CONFIRMED)   # TODAY 11:30am–1pm → RED
 
        # other upcoming (different day, won't conflict with demo)
        r(v02, study_rooms, 1,  3, 15,  0, 2, CONFIRMED)   # 3 days from now 3pm–5pm
 
        # completed (past)
        r(v02, study_rooms, 2, -4, 10,  0, 2, PENDING)     # 4 days ago
 
        # cancelled (past)
        r(v02, study_rooms, 3, -6, 13,  0, 1, CANCELLED)   # 6 days ago
 
        # ── VAQUERO 03 — 1 computer TODAY 11:30AM–1PM (red hotspot) ──────────
        self.stdout.write("\nVaquero 03 reservations:")
 
        # RED HOTSPOT: today 11:30am–1pm
        r(v03, computers,   0,  0, 11, 30, 1.5, CONFIRMED)   # TODAY 11:30am–1pm → RED
 
        # other upcoming (different day)
        r(v03, computers,   1,  2, 10,  0, 1, CONFIRMED)   # 2 days from now 10am–11am
 
        # completed (past)
        r(v03, computers,   0, -3,  9,  0, 1, PENDING)     # 3 days ago, computer
 
        # cancelled (past)
        r(v03, study_rooms, 0, -7, 14,  0, 2, CANCELLED)   # 7 days ago, room cancelled
 
        Reservation.objects.bulk_create(reservations_to_create)
        self.stdout.write(self.style.SUCCESS(
            f"\nCreated {len(reservations_to_create)} demo reservations"
        ))


        self.stdout.write("\nSeeding waitlist notification for vaq1...")

        # pick a room by using a different room index so it's not the same room as vaq2 red slot
        notif_room = study_rooms[1] if len(study_rooms) > 1 else study_rooms[0] if study_rooms else None


        if notif_room:
            notif_start_ct = (now_ct + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0)
            notif_end_ct   = notif_start_ct + timedelta(hours=1, minutes=30)
            notif_start    = notif_start_ct.astimezone(ZoneInfo("UTC"))
            notif_end      = notif_end_ct.astimezone(ZoneInfo("UTC"))

            # deadline: requested start minus 30 minutes
            # since 11:30 minus 30 min = 11:00 which may already be past,
            # use now + 24 hours as the fallback so it stays visible during demo
            deadline = notif_start - timedelta(minutes=30)
            deadline_ct = deadline.astimezone(CENTRAL)
            deadline_str = deadline_ct.strftime("%b %d at %I:%M %p CT")

            # create the waitlist entry for vaq1 as notified
            waitlist_entry, _ = Waitlist.objects.get_or_create(
                user=v01,
                room=notif_room,
                defaults={
                    "status":                "notified",
                    "room_start_time":       notif_start,
                    "room_end_time":         notif_end,
                    "notification_time":     now,
                    "notification_deadline": deadline,
                }
            )
            # if it already existed, make sure it is notified
            if waitlist_entry.status != "notified":
                waitlist_entry.status = "notified"
                waitlist_entry.notification_time = now
                waitlist_entry.notification_deadline = deadline
                waitlist_entry.room_start_time = notif_start
                waitlist_entry.room_end_time   = notif_end
                waitlist_entry.save()

            # create the active WaitlistHold reserved for vaq1
            # deactivate any existing holds for this room first
            WaitlistHold.objects.filter(room=notif_room, is_active=True).update(is_active=False)
            WaitlistHold.objects.create(
                room=notif_room,
                held_start=notif_start,
                held_end=notif_end,
                reserved_for=v01,
                expires_at=deadline,
                is_active=True,
                cancelled_by=v02,   # simulates that vaq2 cancelled
            )

            # create the bell notification message
            notif_start_display = notif_start_ct.strftime("%b %d, %I:%M %p CT")
            Notification.objects.filter(user=v01, room=notif_room, is_read=False).delete()
            Notification.objects.create(
                user=v01,
                room=notif_room,
                message=(
                    f"{notif_room.name} is now available! "
                    f"Your requested time was {notif_start_display}. "
                    f"You have until {deadline_str} to book it. "
                    f"Click to reserve or decline your spot."
                ),
                is_read=False,
            )

            self.stdout.write(self.style.SUCCESS(
                f"  [NOTIFICATION] vaq1 notified for {notif_room.name} — deadline {deadline_str}"
            ))
        else:
            self.stdout.write(self.style.WARNING(
                "  No study room found — skipping waitlist notification seed"
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
            checked_out = now - timedelta(days=days_ago + 1)
            returned_at = now - timedelta(days=days_ago)
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
        # 1 active, 1 returned (history), 1 cancelled (history)
        self.stdout.write("\nVaquero 01 checkouts:")
        checkout_active(v01,    "HDMI Cable",            due_days=2)
        checkout_returned(v01,  "Projector",             days_ago=4)
        checkout_cancelled(v01, "Headphones",            days_ago=3)  

        #  VAQUERO 02 
        # 1 active
        self.stdout.write("\nVaquero 02 checkouts:")
        checkout_active(v02,    "Laptop",                due_days=3)

        # VAQUERO 03
        # 1 active
        self.stdout.write("\nVaquero 03 checkouts:")
        checkout_active(v03,    "Mouse",                 due_days=1)

        # print out done
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(self.style.SUCCESS("Demo seed complete!"))
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write("")
        self.stdout.write("  vaquero01@utrgv.edu  /  Vaquero01!")
        self.stdout.write("  vaquero02@utrgv.edu  /  Vaquero02!")
        self.stdout.write("  vaquero03@utrgv.edu  /  Vaquero03!")
        self.stdout.write("")
        self.stdout.write("  PRESENTATION SETUP:")
        self.stdout.write("  ─────────────────────────────────────────────────")
        self.stdout.write("  vaq2 → study room RED  11:30AM–1PM today")
        self.stdout.write("  vaq3 → computer   RED  11:30AM–1PM today")
        self.stdout.write("  vaq1 → nothing booked 11:30–1PM (free to demo live)")
        self.stdout.write("")
        self.stdout.write("  vaq1 dashboard:  1 room (tomorrow) + 1 computer (day after)")
        self.stdout.write("  vaq1 history:    1 completed room + 1 completed computer + 1 cancelled computer")
        self.stdout.write("  vaq1 equipment:  1 active (HDMI) + 1 returned (Projector) + 1 cancelled (Headphones)")
        self.stdout.write("")
        self.stdout.write("  vaq2 dashboard:  RED room today + 1 future room + 1 active checkout")
        self.stdout.write("  vaq3 dashboard:  RED computer today + 1 future computer + 1 active checkout")
        self.stdout.write("")