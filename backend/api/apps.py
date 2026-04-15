from django.apps import AppConfig
import sys


# one single AppConfig for the entire 'api' app
# handles both the admin label and the scheduler startup:

# call scheduler.start() when django is fully loaded
# without this, the scheduler never starts

class LibraryConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "api" # matches the folder name
    verbose_name = "Library Management"  # replaces 'api' everywhere in admin panel

    def ready(self):
        # dont't start scheduler during manage.py migrate / makemigrations / test
        if "runserver" in sys.argv or "gunicorn" in sys.argv[0:1]: # import prevents it firing during migrate
            from . import scheduler
            scheduler.start()