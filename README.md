# OBES — Marks Management

This repository contains a **Django (backend)** + **React (frontend)** application.

## Prerequisites (Install these first)

- **Git**
- **VS Code**
- **Python 3.10+** (recommended)
- **Node.js 18+** (recommended) and npm
- **PostgreSQL 13+**

Optional but recommended:
- VS Code extensions: **Python**, **ESLint**, **Prettier**
- PostgreSQL GUI: pgAdmin / DBeaver

---

## 1) Clone and open in VS Code

```bash
git clone https://github.com/Punithb2/OBES.git
cd OBES
code .
```

---

## 2) Database Setup (PostgreSQL)

1. Open PostgreSQL and create a database (and user if needed).

Example commands (psql):
```sql
CREATE DATABASE obes_db;
CREATE USER obes_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE obes_db TO obes_user;
```

2. Keep these values ready:
- DB name
- DB user
- DB password
- DB host (usually `localhost`)
- DB port (usually `5432`)

---

## 3) Backend (Django) Setup — Terminal 1

Open **Terminal 1** in VS Code.

### 3.1 Go to backend
```bash
cd backend
```

### 3.2 Create and activate virtual environment

**Windows (PowerShell / CMD):**
```bash
python -m venv venv
venv\Scripts\activate
```

**macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3.3 Install dependencies
```bash
pip install -r requirements.txt
```

### 3.4 Configure environment variables (IMPORTANT)

Create a `.env` file inside `backend/` (if your project uses env variables).

Example `backend/.env`:
```env
DJANGO_SECRET_KEY=replace_me
DEBUG=True

DB_NAME=obes_db
DB_USER=obes_user
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
```

> If your `settings.py` does not use `.env`, then update the database credentials directly in `backend/settings.py` instead.

### 3.5 Run migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### 3.6 (Optional) Create admin user
```bash
python manage.py createsuperuser
```

### 3.7 Start the backend server
```bash
python manage.py runserver
```

Backend should run at:
- http://127.0.0.1:8000/

---

## 4) Frontend (React) Setup — Terminal 2

Open **Terminal 2** in VS Code.

### 4.1 Go to frontend
```bash
cd frontend
```

### 4.2 Install dependencies
```bash
npm install
```

### 4.3 Configure frontend environment (if needed)

If your frontend needs an API URL, create:

`frontend/.env` (Vite projects commonly use `VITE_` prefix)
```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

> If the project is not using Vite env variables, search in the frontend code for the API base URL and update it accordingly.

### 4.4 Start the frontend dev server
```bash
npm run dev
```

Open the URL printed in the terminal (commonly):
- http://localhost:5173/

---

## 5) Common Fixes / Troubleshooting

### A) CORS issues (Frontend cannot call backend)
If your React app cannot access Django API:
- Install and configure `django-cors-headers` (if not already).
- Allow `http://localhost:5173` (or your frontend port) in Django CORS settings.

Typical allowed origins:
- `http://localhost:5173`
- `http://127.0.0.1:5173`

### B) PostgreSQL connection errors
Check:
- PostgreSQL service is running
- DB credentials are correct
- Port is correct (`5432`)
- Database exists

### C) Running in a new terminal later
Every time you restart your machine / reopen VS Code:
1. Activate backend venv again:
   - Windows: `backend\venv\Scripts\activate`
2. Start backend: `python manage.py runserver`
3. Start frontend: `npm run dev`

### D) If migrations act weird
Try (only if required):
```bash
python manage.py makemigrations --empty app_name
python manage.py migrate --run-syncdb
```

---

## 6) Recommended VS Code Terminal Layout

- Terminal 1: **Backend**
  - `cd backend`
  - `venv activate`
  - `python manage.py runserver`

- Terminal 2: **Frontend**
  - `cd frontend`
  - `npm run dev`

---
