import json
import urllib.request

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone  
from datetime import timedelta  

#reusable function to send emails.
def send_email_notification(subject: str, message: str, recipient_email: str) -> bool:
    #Send an email using Django's built-in email system.
    # Returns:
    #   True if an email was attempted
    #   False if there is no recipient email
    
    if not recipient_email:
        return False

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[recipient_email],
        fail_silently=False,
    )
    return True


def send_sms_notification(phone_number: str, message: str) -> bool:
    #Send an SMS through a webhook-based provider.
    # Why this helper exists:
    #  Django has built-in email support.
    
    # Expected webhook payload:
    #  { "to": "+1956...",
    # "message": "Your reminder text here",
    # "token": "optional" }

    # If there is no phone number or no configured SMS endpoint, skip SMS safely
    if not phone_number or not settings.SMS_WEBHOOK_URL:
        return False

    payload = json.dumps({
        "to": phone_number,
        "message": message,
        "token": settings.SMS_WEBHOOK_TOKEN,
    }).encode("utf-8")

    request = urllib.request.Request(
        settings.SMS_WEBHOOK_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=10) as response:
        return 200 <= response.status < 300


def maybe_send_reservation_reminder(reservation) -> bool:
    #Send reminder immediately ONLY if reservation is inside the reminder window.
    #This prevents sending reminders too early.

    now = timezone.now()
    room_window_end = now + timedelta(hours=settings.ROOM_REMINDER_HOURS)

    # Only valid statuses
    if reservation.status not in ["PENDING", "CONFIRMED"]:
        return False

    # Skip if already reminded
    if reservation.reminder_sent_at is not None:
        return False

    # Check if reservation is within reminder window
    if not (now <= reservation.start_time <= room_window_end):
        return False

    subject = f"Reminder: upcoming room reservation for {reservation.room.name}"

    message = (
        f"Hello {reservation.user.first_name or reservation.user.username},\n\n"
        f"This is a reminder that your room reservation is coming up soon.\n"
        f"Room: {reservation.room.name}\n"
        f"Start: {timezone.localtime(reservation.start_time):%Y-%m-%d %I:%M %p}\n"
        f"End: {timezone.localtime(reservation.end_time):%Y-%m-%d %I:%M %p}\n\n"
        f"Library Central"
    )

    email_sent = send_email_notification(
        subject,
        message,
        reservation.user.email
    )

    sms_sent = send_sms_notification(
        reservation.reminder_phone_number,
        message
    )

    if email_sent or sms_sent:
        reservation.reminder_sent_at = now
        reservation.save(update_fields=["reminder_sent_at"])
        return True

    return False


def maybe_send_checkout_reminder(checkout) -> bool:
    #Send reminder immediately ONLY if checkout due date is inside the reminder window.

    now = timezone.now()
    equipment_window_end = now + timedelta(hours=settings.EQUIPMENT_REMINDER_HOURS)

    # Skip if already returned
    if checkout.returned_at is not None:
        return False

    # Skip if already reminded
    if checkout.reminder_sent_at is not None:
        return False

    # Check if due date is within reminder window
    if not (now <= checkout.due_at <= equipment_window_end):
        return False

    subject = f"Reminder: equipment due soon for {checkout.item.name}"

    message = (
        f"Hello {checkout.user.first_name or checkout.user.username},\n\n"
        f"This is a reminder that your equipment checkout is due soon.\n"
        f"Item: {checkout.item.name}\n"
        f"Asset: {checkout.assigned_asset.asset_tag if checkout.assigned_asset else 'N/A'}\n"
        f"Due: {timezone.localtime(checkout.due_at):%Y-%m-%d %I:%M %p}\n\n"
        f"Library Central"
    )

    email_sent = send_email_notification(
        subject,
        message,
        checkout.user.email
    )

    sms_sent = send_sms_notification(
        checkout.reminder_phone_number,
        message
    )

    if email_sent or sms_sent:
        checkout.reminder_sent_at = now
        checkout.save(update_fields=["reminder_sent_at"])
        return True

    return False