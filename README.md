# Expense Voucher Management System

A web application that replaces the manual expense-voucher process: employees create and submit vouchers, the Director approves or rejects them with a signature, and the Accounts Team monitors approved vouchers for reimbursement.

- **Frontend:** React 18 (Vite), React Router, Axios
- **Backend:** Node.js, Express, JWT authentication, Multer (file upload), Zod (validation)
- **Database:** PostgreSQL

---

## 1. Features by role

| Role | Can do | Cannot do |
|---|---|---|
| **Employee** | Log in, create voucher, save as Draft, submit for approval, edit/delete Draft, upload signature, view only own vouchers, track status, see rejection reason | See others' vouchers, approve/reject, change submitted/approved/rejected vouchers |
| **Director** | Log in, view all submitted vouchers, view pending approvals, search/filter/sort, approve (with signature upload), reject (with mandatory reason) | Change any detail entered by the employee |
| **Accounts Team** | Log in, view all submitted vouchers, search/filter/sort, view details, employee + director signatures, approval status, print a voucher | Create, edit, delete, approve or reject |

Each role also has its own dashboard with the statistics listed in the assignment.

---

## 2. Project structure

```
expense-voucher-system/
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── uploads/                      # signature images (git-ignored)
│   └── src/
│       ├── server.js, app.js
│       ├── constants.js              # roles, statuses, departments, categories
│       ├── config/                   # env + PostgreSQL pool
│       ├── db/
│       │   ├── migrations/001_init.sql   # DATABASE SCHEMA
│       │   ├── migrate.js            # migration runner
│       │   └── seed.js               # demo users
│       ├── middleware/               # auth (JWT + roles), upload, error handler
│       ├── validators/               # Zod schemas
│       ├── controllers/              # auth, vouchers, dashboard, meta
│       ├── routes/
│       └── utils/
└── frontend/
    ├── .env.example
    ├── package.json
    └── src/
        ├── api/client.js             # Axios instance + error helpers
        ├── context/AuthContext.jsx   # session handling
        ├── components/               # ProtectedRoute, Layout, Modal, tables, etc.
        ├── pages/                    # Login, Dashboard, VoucherList, VoucherForm, VoucherDetails
        └── styles/app.css
```

---

## 3. Setup instructions

### Prerequisites
- Node.js 18 or newer
- PostgreSQL 13 or newer (running locally)

### Step 1 – Create the database
```bash
psql -U postgres -c "CREATE DATABASE expense_voucher_db;"
```
(Use any PostgreSQL user you like; just make sure it matches `DATABASE_URL` below.)

### Step 2 – Backend
```bash
cd backend
cp .env.example .env          # on Windows: copy .env.example .env
```
Open `.env` and set at least:
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/expense_voucher_db
JWT_SECRET=any_long_random_string
```
Then:
```bash
npm install
npm run migrate               # creates tables
npm run seed                  # creates demo users
npm run dev                   # API on http://localhost:5000
```
Use `npm start` instead of `npm run dev` for a non-watching server.

### Step 3 – Frontend
Open a second terminal:
```bash
cd frontend
cp .env.example .env          # VITE_API_URL=http://localhost:5000
npm install
npm run dev                   # App on http://localhost:5173
```

Open **http://localhost:5173** and log in.

> The backend only accepts requests from the origin in `CLIENT_URL` (default `http://localhost:5173`). Open the app using `localhost`, not `127.0.0.1`, or change `CLIENT_URL` in `backend/.env`.

### Demo accounts (created by `npm run seed`)
All use the password **`Password@123`**.

| Role | Email |
|---|---|
| Employee | employee@example.com |
| Employee (second, to verify data isolation) | employee2@example.com |
| Director | director@example.com |
| Accounts Team | accounts@example.com |

### Suggested walkthrough
1. Log in as **Employee** → *Create voucher* → fill in the form, upload a signature image → *Submit for approval*.
2. Log out, log in as **Director** → *Pending approvals* → open the voucher → *Approve* (upload signature) or *Reject* (enter a reason).
3. Log in as **Employee** again to see the status / rejection reason.
4. Log in as **Accounts Team** to see every submitted voucher, both signatures, and to print.

---

## 4. Database schema

Migration file: `backend/src/db/migrations/001_init.sql` (applied by `npm run migrate`; applied files are tracked in a `schema_migrations` table so it is safe to run repeatedly).

### `users`
| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| name | VARCHAR(100) | |
| email | VARCHAR(150) | unique |
| password_hash | VARCHAR(255) | bcrypt hash |
| role | VARCHAR(20) | `EMPLOYEE`, `DIRECTOR`, `ACCOUNTS` (CHECK constraint) |
| employee_code | VARCHAR(30) | optional Employee ID |
| created_at, updated_at | TIMESTAMPTZ | |

### `vouchers`
| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| voucher_number | VARCHAR(30) | **unique**, auto-generated by the database, e.g. `EV-2026-00001` (from sequence `voucher_number_seq`) |
| employee_id | FK → users | owner of the voucher |
| voucher_date | DATE | defaults to the creation date |
| expense_date | DATE | required |
| department | VARCHAR(100) | required |
| expense_title | VARCHAR(150) | required |
| expense_category | VARCHAR(50) | optional |
| expense_description | TEXT | optional |
| amount | NUMERIC(12,2) | required, `CHECK (amount > 0)` |
| status | VARCHAR(20) | `DRAFT` (default), `PENDING_APPROVAL`, `APPROVED`, `REJECTED` |
| employee_signature | VARCHAR(255) | stored file name |
| submitted_at | TIMESTAMPTZ | set when submitted |
| director_id | FK → users | director who approved/rejected |
| director_signature | VARCHAR(255) | stored file name |
| approval_date | TIMESTAMPTZ | set on approval |
| rejected_date | TIMESTAMPTZ | set on rejection |
| rejection_reason | TEXT | required when rejected |
| created_at, updated_at | TIMESTAMPTZ | audit information |

**Database-level safety nets (CHECK constraints):** a non-draft voucher must have an employee signature; an approved voucher must have a director signature; a rejected voucher must have a non-empty rejection reason.

Indexes exist on `employee_id`, `status` and `created_at`.

---

## 5. Voucher workflow

```
DRAFT ──submit──▶ PENDING_APPROVAL ──approve──▶ APPROVED  (visible to Accounts)
                         │
                         └────reject────▶ REJECTED  (employee sees the reason)
```

State changes are enforced on the server with conditional `UPDATE ... WHERE status = ...` statements, so two simultaneous actions cannot both succeed.

---

## 6. API documentation

Base URL: `http://localhost:5000/api`
All endpoints except `POST /auth/login` and `GET /health` require the header `Authorization: Bearer <token>`.

Errors use this shape (field errors only for validation problems):
```json
{ "message": "Please correct the highlighted fields.", "errors": { "amount": "Amount must be greater than zero" } }
```
Status codes: `400` validation, `401` not logged in / bad token, `403` wrong role, `404` not found (or not yours), `409` action not allowed in current status, `500` server error.

### Authentication
| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/auth/login` | `{ "email", "password" }` | Returns `{ token, user }` |
| GET | `/auth/me` | – | Returns the logged-in user |

### Reference data & dashboard
| Method | Endpoint | Roles | Description |
|---|---|---|---|
| GET | `/health` | public | Health check |
| GET | `/meta` | all | Departments, expense categories, statuses |
| GET | `/dashboard` | all | Statistics for the caller's role (see section 8) |

### Vouchers
| Method | Endpoint | Roles | Description |
|---|---|---|---|
| GET | `/vouchers` | all | List (scoped by role). Supports filters/sorting below |
| GET | `/vouchers/:id` | all | Voucher details |
| POST | `/vouchers` | Employee | Create a voucher as **Draft**. `multipart/form-data` |
| PUT | `/vouchers/:id` | Employee (owner) | Edit a **Draft**. `multipart/form-data` |
| DELETE | `/vouchers/:id` | Employee (owner) | Delete a **Draft** |
| POST | `/vouchers/:id/submit` | Employee (owner) | Draft → Pending approval (employee signature required) |
| POST | `/vouchers/:id/approve` | Director | Approve. `multipart/form-data` with `signature` file (required) |
| POST | `/vouchers/:id/reject` | Director | Reject. JSON `{ "reason": "..." }` (required) |

**Create / edit fields (multipart):** `department`*, `expenseTitle`*, `expenseDate`* (`YYYY-MM-DD`), `amount`* (> 0, max 2 decimals), `expenseCategory`, `expenseDescription`, `signature` (image file: PNG/JPG/WEBP, max 2 MB). `*` = required.

**List query parameters (all optional):**
`voucherNumber`, `employeeName` (partial, case-insensitive), `department`, `category`, `status`, `dateFrom`, `dateTo` (voucher date, `YYYY-MM-DD`), `minAmount`, `maxAmount`, `sortBy` (`voucherNumber | voucherDate | expenseDate | employeeName | department | amount | status | createdAt | updatedAt`), `sortOrder` (`asc | desc`, default `desc` by `createdAt`).

Example:
```
GET /api/vouchers?status=APPROVED&department=Sales&minAmount=500&sortBy=amount&sortOrder=desc
```

**Voucher object (response):**
```json
{
  "id": 1, "voucherNumber": "EV-2026-00001",
  "voucherDate": "2026-10-10", "expenseDate": "2026-10-08",
  "department": "Sales", "expenseTitle": "Client visit taxi fare",
  "expenseCategory": "Travel", "expenseDescription": "…", "amount": 842.5,
  "status": "APPROVED",
  "employee": { "id": 2, "name": "Rahul Sharma", "employeeCode": "EMP001" },
  "employeeSignatureUrl": "/uploads/<uuid>.png",
  "director": { "id": 4, "name": "Anita Desai" },
  "directorSignatureUrl": "/uploads/<uuid>.png",
  "submittedAt": "…", "approvalDate": "…", "rejectedDate": null, "rejectionReason": null,
  "createdAt": "…", "updatedAt": "…"
}
```

Signature images are served from `GET /uploads/<file>`.

---

## 7. Validation and business rules

| Rule | Where enforced |
|---|---|
| Department, Expense Title, Expense Date, Amount are mandatory | Frontend form + Zod schema + DB `NOT NULL` |
| Amount > 0 | Frontend + Zod + DB `CHECK` |
| Employee signature mandatory before submission | Frontend + `submit` endpoint + DB `CHECK` |
| Director signature mandatory before approval | Frontend + `approve` endpoint + DB `CHECK` |
| Rejection reason mandatory | Frontend + Zod + DB `CHECK` |
| Unique, auto-generated voucher number | DB sequence + `UNIQUE` |
| New vouchers always start as Draft | `POST /vouchers` |
| Edit/delete only in Draft | `PUT` / `DELETE` return `409` otherwise |
| Submitted, approved, rejected vouchers are read-only | Same as above; only the Director can approve/reject a pending voucher |
| Employees see only their own vouchers | Query scoped by `employee_id`; other users' vouchers return `404` |
| Director and Accounts see every voucher | See assumption 2 about drafts |

Security: passwords hashed with bcrypt; JWT-protected API; role checks on every protected route; image uploads restricted by type and size and saved under random file names; parameterised SQL everywhere.

---

## 8. Dashboards

- **Employee:** total, draft, pending approval, approved, rejected vouchers, total amount claimed.
- **Director:** pending approval count, approved today, rejected today, total pending amount, recent voucher activity.
- **Accounts:** total, pending, approved, rejected vouchers, total approved expense amount, recent approved vouchers.

---

## 9. Assumptions made during development

1. **"Submitted" and "Pending Approval".** The workflow lists both. A voucher moves from Submitted to Pending Approval instantly, so they are stored as one status, `PENDING_APPROVAL`, together with a `submitted_at` timestamp. The UI shows it as "Pending approval".
2. **Drafts are private to the employee.** "All vouchers" for the Director and Accounts means every *submitted* voucher (pending, approved, rejected). A draft is unfinished work the employee may still change, so it is not visible to others until submitted.
3. **Signatures are uploaded per voucher.** The employee uploads a signature image on each voucher; the Director uploads one each time they approve.
4. **Total Amount Claimed** (employee dashboard) is the sum of all submitted vouchers (pending + approved + rejected); drafts are excluded.
5. **Date range filter** applies to the Voucher Date.
6. **"Today"** on the Director dashboard uses the database server's current date.
7. **Expense category** is optional (it is not in the assignment's mandatory list); department and category are chosen from fixed lists defined in `backend/src/constants.js`.
8. **No self-registration.** User accounts are created by the seed script (the assignment does not describe user management). Employee ID is optional.
9. **Rejected vouchers are final.** The assignment says rejected vouchers cannot be modified, so employees cannot resubmit them; they create a new voucher instead.
10. **Signature file access.** Images are served as static files with random, unguessable names rather than behind an authenticated download endpoint. For a production deployment I would serve them through an authenticated route or signed URLs.
11. **Token storage.** The JWT is kept in `localStorage` and expires after 8 hours (`JWT_EXPIRES_IN`).
12. **Currency** is Indian Rupees (INR) for display.
13. **Search and filters** are applied when the user presses *Apply filters*. The same filter panel appears for all roles, but the Employee Name filter is hidden for employees because they only see their own vouchers.

---

## 10. Scripts

| Location | Command | Purpose |
|---|---|---|
| backend | `npm run dev` | Start API with auto-restart |
| backend | `npm start` | Start API |
| backend | `npm run migrate` | Apply SQL migrations |
| backend | `npm run seed` | Create demo users |
| frontend | `npm run dev` | Start the dev server |
| frontend | `npm run build` | Production build into `dist/` |

## 11. Environment variables

`backend/.env.example`: `PORT`, `NODE_ENV`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL`, `UPLOAD_DIR`, `MAX_FILE_SIZE_MB`.
`frontend/.env.example`: `VITE_API_URL`.
