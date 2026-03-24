# Military Asset Management System

Full-stack assignment project for managing military vehicles, equipment, and ammunition across multiple bases with role-based access control.

## Tech Stack

- Frontend: React + Vite + Axios
- Backend: Node.js + Express
- Database: SQLite
- Auth: JWT-based session tokens with seeded demo users

## Features

- Login flow for `admin`, `commander`, and `logistics` roles
- Dashboard with asset balance filters by base, category, and name
- Net movement pop-up for recent purchases, transfers, assignments, and expenditures
- Purchase recording for inbound stock
- Base-to-base asset transfer workflow
- Assignment and expenditure logging with stock reduction
- RBAC-protected API routes and admin-only user directory

## Demo Credentials

- Admin: `admin` / `admin123`
- Commander: `commander.north` / `command123`
- Logistics: `logistics.south` / `logistics123`

## Project Structure

```text
military-asset-management/
├── backend/
│   ├── src/
│   │   ├── database.js
│   │   ├── index.js
│   │   ├── middleware/
│   │   └── routes/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   └── styles.css
└── README.md
```

## Setup Instructions

1. Install dependencies from the repository root:

```bash
npm install
```

2. Start the backend:

```bash
npm run dev:backend
```

3. Start the frontend in another terminal:

```bash
npm run dev:frontend
```

4. Open `http://localhost:5173`

## API Endpoints

- `POST /api/auth/login` - authenticate a user
- `GET /api/health` - health check
- `GET /api/assets` - list visible assets with optional filters
- `GET /api/assets/summary` - dashboard summaries and recent movements
- `POST /api/assets` - create an asset record
- `POST /api/purchases` - record a purchase
- `POST /api/transfers` - transfer stock to another base
- `POST /api/assignments` - record assignment or expenditure
- `GET /api/users` - admin-only user listing

## RBAC Rules

- `admin`: full visibility across all bases, can access all modules
- `commander`: can view and operate only on assets belonging to their own base
- `logistics`: can manage purchases, transfers, and assignments for their own base

## Notes

- The SQLite database is created automatically at `backend/data/military-assets.db` on first backend start.
- Seed data includes sample users and sample assets for three bases.
- For deployment, set the frontend API base URL and CORS origin to match your hosted services.
