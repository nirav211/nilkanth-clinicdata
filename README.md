# Nilkanth Clinic — Patient Register & Clinical Ledger

Clinical management register, prescription pad, and financial billing ledger for **Nilkanth Clinic & Day Care Centre** in Navrangpura, Ahmedabad, Gujarat.

Single Owner: **Dr. Jignesh Chauhan (B.A.M.S.)**  
Clinic Contact: **+91 90336 63170**

---

## Features

- **Clinical Ledger Aesthetic**: Crisp white and medical sage green palette (`#F4F9F6`, `#CFE3D3`, `#0B6E4F`) with IBM Plex Sans and IBM Plex Mono typography.
- **Patient Register**: Fast daily register with `/` keyboard shortcut search, status indicators, vitals tracking (BP, pulse, temp, weight), and inline payment collection.
- **Printed Doctor Rx Pad**: Official A4 printable prescription slip with clinic header, doctor credentials, patient demographics, vitals strip, and prescribed medicines.
- **Financial Ledger & Final Reports**: Ruled financial summaries for OPD consultations, diagnostic reports, and combined totals with tabular Indian currency formatting (`₹1,25,000`).
- **Single Owner Authentication**: Secured JWT login for Dr. Jignesh Chauhan with bcrypt password hashing, 5-attempt brute-force rate limiter, and interactive CLI password reset.
- **MongoDB Atlas Backend**: REST API with Mongoose models (`Patient`, `Payment`, `User`, `AuditLog`) and audit logging.

---

## Project Structure

```
nilkanth-clinic/
├── client/                     # Vite + React 18 + Tailwind CSS frontend
│   ├── src/
│   │   ├── api/mockApi.js      # Hybrid REST API client + offline fallback
│   │   ├── components/         # AppShell, DataTable, Money, DateText, StatusText, etc.
│   │   ├── pages/              # Login, Patients, AddPatient, FinalReport, DesignSystem
│   │   ├── index.css           # Clinical theme styles & print stylesheet
│   │   └── App.jsx             # Routes & Global ErrorBoundary
│   ├── index.html
│   └── vite.config.js
│
└── server/                     # Node.js + Express + MongoDB Atlas backend
    ├── src/
    │   ├── config/             # Environment validation & Mongoose connection
    │   ├── models/             # Patient, Payment, User, AuditLog schemas
    │   ├── middleware/         # requireAuth JWT middleware
    │   ├── routes/             # auth, patients, reports REST endpoints
    │   ├── scripts/            # seed.js, resetPassword.js, testAuth.js
    │   └── server.js           # Express app & static SPA asset serving
    └── package.json
```

---

## Setup & Running

### 1. Backend Setup

```bash
cd server
cp .env.example .env
# Fill in MONGODB_URI and JWT_SECRET in server/.env
npm install
npm run seed     # Seeds single owner user and 10 sample Ahmedabad patients
npm start        # Starts server on http://localhost:5000
```

### 2. Frontend Setup

```bash
cd client
npm install
npm run dev      # Starts Vite dev server on http://localhost:5173
```

### 3. Production Build

```bash
cd client
npm run build    # Compiles assets into client/dist
cd ../server
npm start        # Serves API + client app at http://localhost:5000
```
