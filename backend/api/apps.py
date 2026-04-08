from django.apps import AppConfig
import sys


class ApiConfig(AppConfig):
    name = "api"

# call scheduler.start() when django is fully loaded
# without this, the scheduler never starts

class LibraryConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "api"   

    def ready(self):
        # dont't start scheduler during manage.py migrate / makemigrations / test
        if "runserver" in sys.argv or "gunicorn" in sys.argv[0:1]: # import prevents it firing during migrate
            from . import scheduler
            scheduler.start()