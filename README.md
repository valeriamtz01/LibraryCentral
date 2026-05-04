# Library Central: Unified Reservation & Tracking System

## Project Overview
Library Central is a full-stack web application designed to streamline the student experience for library resources. It replaces fragmented systems with a singular, responsive dashboard for managing study rooms, inventory checkouts, and computer reservations.

### Key Features
* __Unified Student Dashboard:__ A single view for all active checkouts and upcoming reservations.
* __Interactive Room Map:__ A visual interface for all real-time study room and computer bookings.
* __Inventory Tracking:__ Searchable inventory for books, laptops, calculators, and other media equipment.
* __Staff Admin Portal:__ A secure backend for library staff to manage inventory and overrides.
* __Automated Notifications:__ SMS and email alerts for reservation confirmations and overdue items.
* __AI-Powered Library Clerk:__ Chat-based assistant to book/cancel study spaces, manage equipment checkouts/cancellations (physical returns are in-person), and join waitlists.

---

## Tech Stack
* __Backend:__ Django(Python) & Django REST Framework (DRF).
* __Frontend:__ React (TypeScript) powered by Vite.
* __Database:__ SQLite (Development) / PostgreSQL (Production).
* __API Communication:__ Axios with environment based routing.
* __AI Assistant RPC:__ OmniAgents (WebSocket JSON-RPC) + Python tool layer.
  
---

## Getting Started
### Prerequisites
* Python
* Node.js
* Git Bash

### __1. Clone the Repository__
    git clone https://github.com/Alondra371/library.git
    cd library

---

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

Backend should be at `http://127.0.0.1:8000`.
If running in codespace set port to 'public'.

In new terminal with Backend still running...

---

### 3. OmniAgent-powered Library Clerk
Run the OmniAgents RPC server (separate terminal):

Note: Prior to running the terminal, follow the instructions located in the *'frontend/.env.example'* and *'omniagent/.env.example'*  files.

    cd omniagent    

    # macOS/Linux virtual machine
    python -m venv venv
    source venv/bin/activate 
    # use 'source venv/Scripts/activate' for windows 

    #install dependencies
    pip install -r requirements.txt

    # If you see "workspace_root is required" errors in Codespaces,
    # ensure you're using the pinned OmniAgents version from requirements.txt.

    #start server and leave running in the terminal
    omniagents run --mode server --config agent.yml --host 127.0.0.1 --port 9000 --approvals skip

That starts a WebSocket server at `ws://127.0.0.1:9000/ws`.
If running in codespace set port to 'public'.

In new terminal with backend, and omniagent still running...

---

### __4. Frontend Setup (React + Vite)__
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
If running in codespace set port to 'public'.

---

### Project Structure 

*Note: Project file/folder heiarchy to be defined later*

 ```text
library/
|-- backend/    # Django REST API (Data & Logic)
|----|-- config/
|-------|-- settings.py
|----|-- api/
|-------|-- serializers.py
|-------|-- views.py
|
|-- frontend/   # React App (User Interface)
|----|-- package.json
|----|-- src/
|-------|-- omniagentRpc.ts
|-------|-- components/
|----------|-- Chatbot.tsx
|----------|-- FloatingAssistant.tsx
|----------|-- StudentHeader.tsx
|-------|-- pages/
|----------|-- Dashboard.tsx
|----------|-- Login.tsx
|
|-- omniagent/  # OmniAgents RPC server config + tools
|----|-- agent.yml
|----|-- instructions.md
|----|-- requirements.txt
|----|-- tools/
|-------|-- library_tools.py
|
|-- README.md
