# so that check_expired_waitlist()  doesn't run on every page load
# instead, apscheduler fires it every 5 minutes as a background job

# install: 
# pip install apscheduler django-apscheduler
# added already 'django_apscheduler' to settings
# do python manage.py migrate

# file is imported by AppConfig.ready() in apps.py so the scheduler
# starts automatically when Django boots.

from apscheduler.schedulers.background import BackgroundScheduler
from django_apscheduler.jobstores import DjangoJobStore
from django_apscheduler.models import DjangoJobExecution
import logging

logger = logging.getLogger(__name__)

def start():
    """
    Start the background scheduler.
    Called once from AppConfig.ready() — safe against double-start
    because APScheduler raises if you start an already-running scheduler.
    """
    from .views import check_expired_waitlist   # local import avoids circular imports

    scheduler = BackgroundScheduler()
    scheduler.add_jobstore(DjangoJobStore(), "default")

    # run every minute — expiry checks are cheap (indexed query)
    scheduler.add_job(
        check_expired_waitlist,
        trigger="interval",
        minutes=1,
        id="check_expired_waitlist",
        max_instances=1,         # never run two copies simultaneously
        replace_existing=True,   # on restart, replace the old job record
    )

    logger.info("Starting APScheduler — check_expired_waitlist every 5 minutes")

    try:
        scheduler.start()
    except Exception as e:
        logger.error(f"APScheduler failed to start: {e}")
        