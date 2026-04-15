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
    pip install djangorestframework-simplejwt 
    pip install django-cors-headers
    # Or, once created: pip install -r requirements.txt

    # Install new dependencies (2)
    pip install apscheduler django-apscheduler
    pip install django-jazzmin

    # Setup database
    python manage.py migrate
    
    # Update Database - if already created and need to simply update with new work
    python manage.py makemigrations
    python manage.py migrate
    python manage.py seed
    python manage.py seed_rooms_from_floormap

    # Start server - and leave runnning in this terminal
    python manage.py runserver

Backend API runs at: http://127.0.0.1:8000/

*Note: 404 is normal for now as current empty path does not exist as no (/) route is defined.
we can route to admin login if deemed good idea* for now if you want to see admin page for Backend side add /admin address



In new terminal with Backend still running...

### __3. Frontend Setup (React + Vite)__
    cd library/frontend

    # Install dependencies
    npm install

    # Install packages: react-bootstrap (components) + bootstrap (CSS styles)
    npm install react-bootstrap bootstrap
    # documentation found at : https://react-bootstrap.netlify.app/

    # Install react router: This is standard library React uses to handle navigation
    npm install react-router-dom

    # Note: CSS is imported to our apps entry point (main.tsx)
    # via this line at the top, above our other CSS imports
    # import 'bootstrap/dist/css/bootstrap.min.css';


    # Start development server
    npm run dev

Frontend UI runs at: http://localhost:5173

---

### Project Structure 

*Note: Project file/folder heiarchy to be defined later*

    library/
    |-- backend/    # Django REST API (Data & Logic)
    |-- frontend/   # React App (User Interface)
    |----|--src/
    |-------|--components/
    |----------|--Header.tsx
    |----------|--Header.css
    |----------|--Footer.tsx
    |----------|--Footer.css
    |-------|--pages/
    |----------|--Home.tsx
    |----------|--Home.css
    |----------|--SignUp.tsx
    |----------|--SignUp.css
    |----------|--Login.tsx
    |----------|--Login.css
    |__ README.md


