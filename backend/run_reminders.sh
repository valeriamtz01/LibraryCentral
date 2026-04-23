#!/bin/bash

# Loop forever
while true
do
    echo "Running reminders at $(date)"

    # Activate virtual environment
    source venv/bin/activate

    # Run Django command
    python manage.py send_reminders

    # Wait 1 minute (60 seconds)
    sleep 60
done