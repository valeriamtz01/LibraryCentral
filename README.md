# Library Central: Unified Reservation & Tracking System

## Project Overview
Library Central is a full-stack web application designed to streamline the student experience for library resources. It replaces fragmented systems with a singular, responsive dashboard for managing study rooms, inventory checkouts, and computer reservations.

### Key Features
* __Unified Student Dashboard:__ A single view for all active checkouts and upcoming reservations.
* __Interactive Room Map:__ A visual interface for all real-time study room and computer bookings.
* __Inventory Tracking:__ Searchable inventory for books, laptops, calculators, and other media equipment.
* __Staff Admin Portal:__ A secure backend for library staff to manage inventory and overrides.
* __Automated Notifications:__ SMS and email alerts for reservation confirmations and overdue items.

---

## Tech Stack
* __Backend:__ Django(Python) & Django REST Framework (DRF).
* __Frontend:__ React (TypeScript) powered by Vite.
* __Database:__ SQLite (Development) / PostgreSQL (Production).
* __API Communication:__ Axios with environment based routing.
  
---

## Getting Started
### Prerequisites
* Python
* Node.js
* Git Bash

### __1. Clone the Repository__
    git clone https://github.com/Alondra371/library.git
    cd library

### __2. Backend Setup (Django)__
    cd backend

    # Create and activate virtual environment (Windows/Git Bash)
    python -m venv venv
    source venv/Scripts/activate

    # Install dependencies
    pip install django djangorestframework 
    pip install django-cors-headers
    # Or, once created: pip install -r requirements.txt

    # Setup database
    python manage.py migrate

    # Start server
    python manage.py runserver

Backend API runs at: http://127.0.0.1:8000/

*Note: 404 is normal for now as current empty path does not exist as no (/) route is defined.
we can route to admin login if deemed good idea*


In new terminal with Backend still running...

### __3. Frontend Setup (React + Vite)__
    cd library/frontend

    # Install dependencies
    npm install

    # Set up environment variables
    # Create a .env file and add: 
    # VITE_API_BASE_URL=http://127.0.0.1:8000/api/

    # Start development server
    npm run dev

Frontend UI runs at: http://localhost:5173

---

### Project Structure 

*Note: Project file/folder heiarchy to be defined later*

    library/
    |-- backend/    # Django REST API (Data & Logic)
    |-- frontend/   # React App (User Interface)
    |__ README.md


