from datetime import timedelta  # Used to calculate time windows
from django.conf import settings  # Access custom settings (like reminder hours)
from django.core.management.base import BaseCommand  # Base class for custom Django commands
from django.utils import timezone  # Timezone-aware datetime 

from api.models import Checkout, Reservation  # Models we query for reminders
from api.notifications import send_email_notification, send_sms_notification  # Our helper functions


class Command(BaseCommand):
    #Description shown when running 'python manage.py help'
    help = "Send automated room reservation and equipment-due reminders."

    def handle(self, *args, **options):
        #current time 
        now = timezone.now()
        
        # 1. Define reminder windows 
        room_window_end = now + timedelta(hours=settings.ROOM_REMINDER_HOURS)

        # Define for Equipment
        equipment_window_end = now + timedelta(hours=settings.EQUIPMENT_REMINDER_HOURS)

        # 2. Find reservations that need reminders
        room_candidates = Reservation.objects.filter(
            # Only active reservations (not cancelled)
            status__in=[Reservation.STATUS_PENDING, Reservation.STATUS_CONFIRMED],

            # Reservation starts in the future
            start_time__gte=now,

            # Reservation is within reminder window
            start_time__lte=room_window_end,

            # Reminder has NOT been sent yet
            reminder_sent_at__isnull=True,
        ).select_related("user", "room")
        # select_related = performance optimization (avoids extra DB queries) 

        #3. Find the equipment checkout for rweminders
        equipment_candidates = Checkout.objects.filter(
            # Only items that are still checked out
            returned_at__isnull=True,

            # Due date is in the future
            due_at__gte=now,

            # Due date is within reminder window
            due_at__lte=equipment_window_end,

            # Reminder has NOT been sent yet
            reminder_sent_at__isnull=True,
        ).select_related("user", "item", "assigned_asset")

        # Counter for reporting how many reminders were sent
        sent_room_count = 0
        
        #4. Process room reservations
        for reservation in room_candidates:

            # Create email/SMS subject
            subject = f"Reminder: upcoming room reservation for {reservation.room.name}"

            # Create message body
            message = (
                f"Hello {reservation.user.first_name or reservation.user.username},\n\n"
                f"This is a reminder that your room reservation is coming up soon.\n"
                f"Room: {reservation.room.name}\n"
                f"Start: {timezone.localtime(reservation.start_time):%Y-%m-%d %I:%M %p}\n"
                f"End: {timezone.localtime(reservation.end_time):%Y-%m-%d %I:%M %p}\n\n"
                f"Library Central"
            )

            # Send notifications
            email_sent = send_email_notification(
                subject,
                message,
                reservation.user.email
            )

            sms_sent = send_sms_notification(
                reservation.reminder_phone_number,
                message
            )

            # If at least one notification worked, mark as sent
            # This prevents duplicate reminders on future runs
            if email_sent or sms_sent:
                reservation.reminder_sent_at = now
                reservation.save(update_fields=["reminder_sent_at"])
                sent_room_count += 1

        # Counter for equipment reminders
        sent_equipment_count = 0

        #5. Process Equipment checkouts 
        for checkout in equipment_candidates:

            subject = f"Reminder: equipment due soon for {checkout.item.name}"

            message = (
                f"Hello {checkout.user.first_name or checkout.user.username},\n\n"
                f"This is a reminder that your equipment checkout is due soon.\n"
                f"Item: {checkout.item.name}\n"
                f"Asset: {checkout.assigned_asset.asset_tag if checkout.assigned_asset else 'N/A'}\n"
                f"Due: {timezone.localtime(checkout.due_at):%Y-%m-%d %I:%M %p}\n\n"
                f"Library Central"
            )

            # Send notifications
            email_sent = send_email_notification(
                subject,
                message,
                checkout.user.email
            )

            sms_sent = send_sms_notification(
                checkout.reminder_phone_number,
                message
            )

            # Mark reminder as sent
            if email_sent or sms_sent:
                checkout.reminder_sent_at = now
                checkout.save(update_fields=["reminder_sent_at"])
                sent_equipment_count += 1
            
        #6. Output Summary
        self.stdout.write(
            self.style.SUCCESS(
                f"Sent {sent_room_count} room reminder(s) and {sent_equipment_count} equipment reminder(s)."
            )
        )