# OBES — Marks Management

This repository contains a **Django (backend)** + **React (frontend)** application for an Outcome-Based Education System (OBES) Marks Management platform.

## Prerequisites (Install these first)

- **Git**
- **VS Code** (or your preferred IDE)
- **Python 3.10+** (recommended)
- **Node.js 18+** (recommended) and npm
- **PostgreSQL 13+**

*Optional but recommended:*
- VS Code extensions: **Python**, **ESLint**, **Prettier**
- PostgreSQL GUI: **pgAdmin** or **DBeaver**

---

## 1) Clone and open in VS Code

```bash
git clone https://github.com/Punithb2/OBES.git
cd OBES
code .
```

---

## 2) Database Setup (PostgreSQL)

Open PostgreSQL (via `psql` CLI or pgAdmin) and create a database and user.

Example commands (psql):

```sql
CREATE DATABASE obes_db;
CREATE USER obes_user WITH PASSWORD 'obes@1234';
GRANT ALL PRIVILEGES ON DATABASE obes_db TO obes_user;
```

Keep these values ready for your environment variables:

- DB name  
- DB user  
- DB password  
- DB host (usually `localhost`)  
- DB port (usually `5432`)

---

## 3) Backend (Django) Setup — Terminal 1

Open Terminal 1 in VS Code.

### 3.1 Go to the backend directory

```bash
cd backend
```

### 3.2 Create and activate the virtual environment

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

### 3.4 Configure Environment Variables (IMPORTANT)

This project uses environment variables to keep sensitive credentials secure. You must create a local `.env` file before running the server.

Copy the provided template file:

**Windows:**
```dos
copy .env.example .env
```

**macOS / Linux:**
```bash
cp .env.example .env
```

Open the newly created `.env` file in VS Code and update it with your local PostgreSQL credentials and a secure Django Secret Key.

### 3.5 Run migrations

Generate the database tables:

```bash
python manage.py makemigrations
python manage.py migrate
```

---

## 4) Initialize the Platform (Database Seeding)

Instead of manually creating a superuser, this project includes a custom setup command that bootstraps the database with default departments, necessary global configurations, and an initial Super Admin account so you can log into the React dashboards immediately.

Run the setup command:

```bash
python manage.py setup_obes
```

### Default Login Credentials

Once initialized, you can log in to the frontend portals using the following test account:

- Email: `admin@obe.com`
- Password: `password123`

*(Note: Change this password immediately after your first login if deploying to a live server).*

### Start the backend server

```bash
python manage.py runserver
```

The backend API should now be running at: http://localhost:8000/

---

## 5) Frontend (React) Setup — Terminal 2

Open Terminal 2 in VS Code.

### 5.1 Go to the frontend directory

```bash
cd frontend
```

### 5.2 Install dependencies

```bash
npm install
```

### 5.3 Configure frontend environment (if needed)

If your frontend needs an API URL, create a `.env` file inside `frontend/` (Vite projects commonly use the `VITE_` prefix):

`frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:8000
```

*(Note: If the project is not using Vite env variables, the `src/app/services/api.js` file defaults to `http://localhost:8000/api`)*

### 5.4 Start the frontend dev server

```bash
npm run dev
```

Open the URL printed in the terminal (commonly):

http://localhost:5173/

---

## 6) Common Fixes / Troubleshooting

### A) CORS issues (Frontend cannot call backend)

If your React app cannot access the Django API:

- Ensure `django-cors-headers` is installed.
- Ensure `http://localhost:5173` is added to `CORS_ALLOWED_ORIGINS` in `backend/core/settings.py`.

### B) PostgreSQL connection errors

Check:

- The PostgreSQL service is actively running on your machine.
- The DB credentials in your `backend/.env` file exactly match your PostgreSQL setup.
- Port is correct (`5432`).
- The database `obes_db` actually exists.

### C) Running the app in a new terminal later

Every time you restart your machine or reopen VS Code, you must reactivate the backend:

Activate backend venv again:

- Windows: `venv\Scripts\activate`
- Mac/Linux: `source venv/bin/activate`

Start backend: `python manage.py runserver`

Start frontend (in a new terminal): `npm run dev`

### D) If migrations act weird

Try *(only if strictly required to reset the database schema)*:

```bash
python manage.py makemigrations --empty api
python manage.py migrate --run-syncdb
```

---

## 7) Recommended VS Code Terminal Layout

We recommend keeping two split terminals open during development:

**Terminal 1 (Left): Backend**
- `cd backend`
- Activate venv
- `python manage.py runserver`

**Terminal 2 (Right): Frontend**
- `cd frontend`
- `npm run dev`
