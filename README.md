# Manufacturing Sales & Inventory Management System

Final-year B.Tech CSE full-stack project by **Ansu Kumar**.

A working sales and inventory application for a manufacturing company implementing the
complete business workflow:

```
Customer -> Enquiry -> Quotation -> Sales Order -> Inventory Reservation -> Dispatch
```

All data is stored in **PostgreSQL** through **Prisma ORM**. All business rules
(totals, stock availability, status transitions, permissions) are enforced in the
**backend**, never in React.

---

## 1. Features

- JWT login with bcrypt password hashing
- Two roles with backend role authorization: `ADMIN` and `SALES_USER`
- Customer master (create / list)
- Enquiries with multiple products (`NEW / QUOTED / WON / LOST`)
- Quotations with discount % and GST %, **totals calculated on the server**
- Quotation statuses (`DRAFT / SENT / ACCEPTED / REJECTED`)
- Only an `ACCEPTED` quotation can be converted to a Sales Order, exactly once
- Sales Orders (`PENDING / CONFIRMED / DISPATCHED / CANCELLED`)
- Inventory with physical, reserved and calculated available quantity
- Inventory reservation on order confirmation inside a **transaction** with row locking
- Dispatch that reduces both physical and reserved quantity inside a transaction
- Order cancellation that releases reserved stock
- Centralized error handling with proper status codes (400/401/403/404/409/500)
- Jest + Supertest tests for the important business rules
- Postman collection for all major APIs

---

## 2. Technology stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, React Router |
| Backend | Node.js + Express.js |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` |
| Testing | Jest + Supertest |
| API testing | Postman |

---

## 3. Folder structure

```
manufacturing-sales-inventory/
|-- frontend/
|   |-- public/favicon.svg
|   |-- src/
|   |   |-- components/   Layout, ProtectedRoute, Ui (badge/alerts/helpers)
|   |   |-- context/      AuthContext.jsx
|   |   |-- pages/        Login, Dashboard, Customers, Enquiries,
|   |   |                 Quotations, SalesOrders, Inventory
|   |   |-- api.js        fetch wrapper that attaches the JWT
|   |   |-- App.jsx       routes
|   |   |-- main.jsx
|   |   +-- styles.css
|   |-- index.html
|   |-- vite.config.js
|   |-- .env.example
|   +-- package.json
|
|-- backend/
|   |-- prisma/
|   |   |-- schema.prisma   all models
|   |   +-- seed.js         users, customers, products, inventory, enquiries, quotations
|   |-- src/
|   |   |-- controllers/    auth, customer, catalog, enquiry, quotation, salesOrder
|   |   |-- middleware/     auth (JWT + roles), errorHandler
|   |   |-- routes/index.js all REST routes
|   |   |-- services/       calc.js (totals), numbering.js (document numbers)
|   |   |-- utils/          AppError.js, validate.js
|   |   |-- app.js          Express app
|   |   |-- prismaClient.js
|   |   +-- server.js
|   |-- tests/              calc.test.js, api.test.js
|   +-- package.json
|
|-- docs/ER-Diagram.md
|-- postman/collection.json
|-- README.md
|-- .env.example
|-- .gitignore
+-- package.json
```

---

## 4. Setup instructions

### 4.1 Prerequisites

- Node.js 18 or newer
- PostgreSQL 13 or newer installed and running

### 4.2 PostgreSQL setup

```sql
CREATE DATABASE manufacturing_db;
```

Or from the terminal: `createdb manufacturing_db`

### 4.3 Environment variables

```bash
cp .env.example backend/.env
cp frontend/.env.example frontend/.env
```

`backend/.env`:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/manufacturing_db?schema=public
JWT_SECRET=any_long_random_string_for_local_use
PORT=4000
FRONTEND_URL=http://localhost:5173
```

`frontend/.env`:

```
VITE_API_URL=http://localhost:4000/api
```

### 4.4 Install dependencies

```bash
cd manufacturing-sales-inventory
npm run install:all
```

(or `cd backend && npm install` then `cd ../frontend && npm install`)

### 4.5 Prisma migration

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

### 4.6 Seed data

```bash
cd backend
npm run seed
```

### 4.7 Start the backend

```bash
cd backend
npm run dev          # http://localhost:4000
```

Health check: http://localhost:4000/api/health

### 4.8 Start the frontend

```bash
cd frontend
npm run dev          # http://localhost:5173
```

### 4.9 Run tests

```bash
cd backend
npm test
```

> The API tests use the real database and clear the tables before running, so run
> `npm run seed` again afterwards if you want the demo data back.

---

## 5. Login credentials (demo)

| Role | Email | Password |
|---|---|---|
| ADMIN | `admin@demo.com` | `Admin@123` |
| SALES_USER | `sales@demo.com` | `Sales@123` |

Passwords are stored only as bcrypt hashes.

---

## 6. User roles

| Action | ADMIN | SALES_USER |
|---|---|---|
| View customers / enquiries / quotations / orders / inventory | Yes | Yes |
| Create customer | Yes | Yes |
| Create enquiry | No | Yes |
| Create quotation, change quotation status | No | Yes |
| Convert ACCEPTED quotation to Sales Order | No | Yes |
| Confirm Sales Order (reserve stock) | Yes | No |
| Dispatch Sales Order | Yes | No |
| Cancel Sales Order | Yes | No |
| Update physical stock | Yes | No |

Roles are enforced by the `authorize()` middleware in `backend/src/middleware/auth.js`.
Hiding buttons in React is only a convenience; the API returns **403** regardless.

---

## 7. API list

Base URL: `http://localhost:4000/api`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/auth/login` | public | login, returns JWT |
| GET | `/auth/me` | any logged-in | current user |
| POST | `/customers` | both roles | create customer |
| GET | `/customers` | both roles | list customers |
| GET | `/products` | both roles | list products |
| GET | `/inventory` | both roles | physical / reserved / available |
| PATCH | `/inventory/:productId` | ADMIN | update physical stock |
| POST | `/enquiries` | SALES_USER | create enquiry with items |
| GET | `/enquiries` | both roles | list enquiries |
| POST | `/quotations` | SALES_USER | create quotation (totals calculated on server) |
| GET | `/quotations` | both roles | list quotations |
| PATCH | `/quotations/:id/status` | SALES_USER | DRAFT / SENT / ACCEPTED / REJECTED |
| POST | `/quotations/:id/convert` | SALES_USER | convert ACCEPTED quotation to Sales Order |
| GET | `/sales-orders` | both roles | list sales orders |
| POST | `/sales-orders/:id/confirm` | ADMIN | confirm + reserve stock (transaction) |
| POST | `/sales-orders/:id/cancel` | ADMIN | cancel + release reservation |
| POST | `/sales-orders/:id/dispatch` | ADMIN | dispatch (transaction) |
| GET | `/health` | public | server status |

Status codes: `400` validation/business error, `401` not authenticated,
`403` not authorized, `404` not found, `409` conflict (duplicate action),
`500` server error.

---

## 8. Quotation total calculation

Implemented in `backend/src/services/calc.js`. Any `totalAmount` sent by the client is ignored.

```
baseAmount     = quantity x unitPrice
discountAmount = baseAmount x discountPct / 100
taxableAmount  = baseAmount - discountAmount
gstAmount      = taxableAmount x gstPct / 100
lineAmount     = taxableAmount + gstAmount
totalAmount    = sum of all lineAmount
```

Example: quantity 10, unit price 100, discount 10%, GST 18%

```
1000 -> 10% discount -> 900 -> 18% GST -> 1062.00
```

---

## 9. Inventory reservation explained

Each product has one `Inventory` row:

```
Available = physicalQty - reservedQty
```

When ADMIN confirms a Sales Order, `confirmSalesOrder` runs one Prisma transaction:

1. Start transaction
2. Load the order and check its status is `PENDING`
3. Lock the inventory rows with `SELECT ... FOR UPDATE` so two simultaneous
   confirmations cannot over-reserve the same stock
4. For each item compute `available = physicalQty - reservedQty`
5. If `available < quantity`, throw a 400 error -> the whole transaction rolls back,
   so no partial inventory update happens and the order stays `PENDING`
6. Otherwise `reservedQty += quantity` (**`physicalQty` is not changed**)
7. Set the order status to `CONFIRMED` and commit

Example (matching the case study):

| Step | Physical | Reserved | Available |
|---|---|---|---|
| Start | 100 | 30 | 70 |
| Order of 80 -> **rejected** | 100 | 30 | 70 |
| Order of 60 -> confirmed | 100 | 90 | 10 |
| Dispatch of 60 | 40 | 30 | 10 |

On dispatch both quantities decrease, so stock can never go negative.
On cancellation of a `CONFIRMED` order, the reservation is released.

---

## 10. Business rules enforced by the backend

1. Quotation totals are always recalculated on the server.
2. Only an `ACCEPTED` quotation can be converted to a Sales Order (`DRAFT` / `SENT` /
   `REJECTED` fail with 400).
3. A quotation can be converted only once (`SalesOrder.quotationId` is unique -> 409).
4. Quotation status transitions: `DRAFT -> SENT/REJECTED`, `SENT -> ACCEPTED/REJECTED`;
   `ACCEPTED` and `REJECTED` are final.
5. Only a `PENDING` order can be confirmed, and only with sufficient stock.
6. `reservedQty` can never exceed `physicalQty`; neither can be negative.
7. Only a `CONFIRMED` order can be dispatched; dispatch cannot exceed reserved quantity.
8. One dispatch per order (`Dispatch.salesOrderId` is unique -> 409).
9. A `DISPATCHED` order cannot be cancelled.
10. Role permissions are checked on every protected route.
11. Required fields, ids, quantities, prices, discount % and GST % are validated.

---

## 11. Demo workflow / checklist

Use this order when recording your demo:

1. **Login as SALES_USER** (`sales@demo.com / Sales@123`) - dashboard shows real counts.
2. **Customers** - add a new customer and see it appear in the table.
3. **Enquiries** - create an enquiry with 2 products (status `NEW`).
4. **Quotations** - create a quotation from that enquiry with discount and GST.
   Point out that the total shown comes from the backend.
5. Click **Send**, then **Accept**.
6. Click **Convert to Sales Order** -> order created with status `PENDING`.
7. Try **Convert** again in Postman -> **409 Conflict** (duplicate conversion blocked).
8. Create another quotation with a very large quantity, accept it and convert it
   (used to show the stock failure).
9. **Logout, login as ADMIN** (`admin@demo.com / Admin@123`).
10. **Inventory** - show physical / reserved / available columns.
11. **Sales Orders** - **Confirm** the normal order -> reserved increases,
    physical stays the same (check the Inventory page).
12. **Confirm** the large order -> red error message, stock unchanged, order still `PENDING`.
13. **Dispatch** the confirmed order (vehicle number + driver) -> physical and reserved
    both decrease, order becomes `DISPATCHED`.
14. Try dispatching again in Postman -> **409 Conflict**.
15. **Cancel** a pending order -> status `CANCELLED`.
16. In Postman call `POST /sales-orders/:id/confirm` with the SALES_USER token ->
    **403 Forbidden** (proves backend RBAC).
17. Run `npm test` in `backend/` to show the passing test suite.

---

## 12. Tests

`backend/tests/calc.test.js` (pure unit tests, no database):

- base amount = quantity x unit price
- discount and GST applied correctly
- total = sum of line amounts
- rounding to 2 decimals

`backend/tests/api.test.js` (Jest + Supertest against the real API):

- login fails with a wrong password; protected route without a token returns 401
- quotation total is calculated by the backend (client total ignored)
- `DRAFT` quotation cannot become a Sales Order
- `REJECTED` quotation cannot become a Sales Order
- duplicate conversion of the same quotation is prevented
- insufficient inventory cannot be reserved (available 70, order 80) and nothing changes
- confirm reserves stock without reducing physical; dispatch reduces both; duplicate
  dispatch blocked
- an unconfirmed order cannot be dispatched
- `SALES_USER` cannot confirm an order or update inventory (403)
- validation and 404 handling

---

## 13. Seed data

- 1 ADMIN and 1 SALES_USER
- 4 customers
- 7 industrial products with inventory
- 3 sample enquiries (ENQ-1001 QUOTED, ENQ-1002 NEW, ENQ-1003 NEW)
- 2 sample quotations (QT-2001 SENT, QT-2002 ACCEPTED and ready to convert)

Document numbers are generated automatically: `ENQ-1001`, `QT-2001`, `SO-3001`, `DSP-4001`.

---

## 14. Known limitations

- Partial dispatch is not supported: a dispatch always ships the full order.
- No user registration screen; users come from the seed script.
- No edit/delete screens for customers, products, enquiries or quotations.
- No pagination, search or filters on the list pages (small demo data set).
- The JWT is stored in `localStorage`, fine for a local demo but not ideal for production.
- Single warehouse only; no batch, serial number or multi-location stock.
- No PDF generation for quotations or dispatch notes.
- API tests share the same database as the app, so they clear the tables before running.
