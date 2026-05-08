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
    from .views import check_expired_waitlist

    # wrap in try/except so a DB lock error doesn't crash the scheduler thread
    def safe_check():
        try:
            check_expired_waitlist()
        except Exception as e:
            logger.error(f"check_expired_waitlist failed: {e}")

    scheduler = BackgroundScheduler()
    scheduler.add_jobstore(DjangoJobStore(), "default")

    scheduler.add_job(
        safe_check,                  # ← use safe_check instead of check_expired_waitlist
        trigger="interval",
        minutes=1,
        id="check_expired_waitlist",
        max_instances=1,
        replace_existing=True,
        misfire_grace_time=30,       # ← allows up to 30s delay before skipping a run
    )
    
   