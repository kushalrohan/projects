<<<<<<< HEAD
# WareTrack — Inventory Management System
### Web Services Project | Node.js + MySQL + REST API

---

## 📋 Project Overview

A full-stack **Warehouse Inventory Management System** built as a REST API web service.
When stock falls below the threshold, the system **automatically alerts the manufacturer** via email.

---

## 🏗️ Architecture

```
Frontend (HTML/CSS/JS)
       ↓ HTTP REST API calls
Node.js + Express Server (REST API)
       ↓
  ┌────────────────────────┐
  │  /api/products         │  ← CRUD + stock update
  │  /api/manufacturers    │  ← CRUD
  │  /api/alerts           │  ← Read alert history
  │  /api/categories       │  ← Read categories
  └────────────────────────┘
       ↓
  MySQL Database
       ↓ (when stock < threshold)
  Nodemailer → Email to Manufacturer
```

---

## 📁 Project Structure

```
inventory-app/
├── backend/
│   ├── config/
│   │   ├── db.js          ← MySQL connection pool
│   │   ├── mailer.js      ← Email alert sender (nodemailer)
│   │   └── schema.sql     ← Database setup SQL file
│   ├── middleware/
│   │   └── alertService.js ← Low stock checker & alert trigger
│   ├── routes/
│   │   ├── products.js    ← Product REST API routes
│   │   ├── manufacturers.js ← Manufacturer REST API routes
│   │   └── alerts.js      ← Alerts & transactions routes
│   ├── server.js          ← Express entry point
│   ├── .env.example       ← Environment variables template
│   └── package.json
└── frontend/
    ├── index.html         ← Single page application
    ├── css/style.css      ← Dark industrial UI styles
    └── js/app.js          ← All frontend JS logic
```

---

## ⚙️ Setup Instructions

### Step 1 — Install MySQL & Create Database
Open MySQL Workbench or MySQL CLI and run:
```sql
source /path/to/backend/config/schema.sql
```
This creates the `inventory_db` database with all tables and sample data.

### Step 2 — Configure Environment
```bash
cd backend
cp .env.example .env
```
Edit `.env` and fill in:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=inventory_db

EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password   # (not your normal password — generate App Password from Google account)
```

### Step 3 — Install Dependencies
```bash
cd backend
npm install
```

### Step 4 — Start the Server
```bash
npm start
```
Or for development with auto-reload:
```bash
npm run dev
```

### Step 5 — Open the App
Visit: **http://localhost:3000**

---

## 🔌 REST API Endpoints

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List all products (supports `?search=`, `?category=`, `?status=low/out/ok`) |
| GET | `/api/products/stats` | Dashboard statistics |
| GET | `/api/products/:id` | Get single product |
| POST | `/api/products` | Create product |
| PUT | `/api/products/:id` | Update product details |
| PATCH | `/api/products/:id/stock` | Update stock quantity (triggers alert if low) |
| DELETE | `/api/products/:id` | Delete product |

### Manufacturers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/manufacturers` | List all manufacturers |
| GET | `/api/manufacturers/:id` | Get manufacturer + their products |
| POST | `/api/manufacturers` | Add manufacturer |
| PUT | `/api/manufacturers/:id` | Update manufacturer |
| DELETE | `/api/manufacturers/:id` | Delete manufacturer |

### Alerts & Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/alerts` | All alerts history |
| GET | `/api/alerts/recent` | Last 10 alerts |
| GET | `/api/alerts/transactions` | Stock movement log |
| GET | `/api/categories` | List categories |

---

## 📦 Stock Update Example (Postman)

**PATCH** `http://localhost:3000/api/products/3/stock`

```json
{
  "type": "OUT",
  "quantity": 4,
  "reason": "Dispatched to production",
  "performed_by": "Ravi Kumar"
}
```
→ If stock drops below threshold, an **email alert is sent to the manufacturer automatically**.

---

## 🔔 How Alerts Work

1. Staff updates stock via the UI or API
2. `alertService.js` runs after every stock change
3. If `quantity == 0` → `OUT_OF_STOCK` alert
4. If `quantity <= low_stock_threshold` → `LOW_STOCK` alert
5. Alert is saved in the `alerts` table
6. Email is sent to the manufacturer via Gmail SMTP
7. Alert status updated to `SENT` or `FAILED`

---

## 🗄️ Database Tables

| Table | Purpose |
|-------|---------|
| `products` | All products with stock levels and thresholds |
| `manufacturers` | Supplier details including email |
| `categories` | Product categories |
| `stock_transactions` | Every stock IN/OUT/ADJUSTMENT (audit trail) |
| `alerts` | Every alert created with status |

---

## 📧 Gmail App Password Setup
1. Go to your Google Account → Security
2. Enable 2-Step Verification
3. Go to App Passwords → Create new → Copy the 16-character password
4. Paste it in `.env` as `EMAIL_PASS`

---

## 🛠️ Technologies Used

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express.js |
| Database | MySQL + mysql2 driver |
| Email | Nodemailer (Gmail SMTP) |
| Frontend | HTML5 + CSS3 + Vanilla JS |
| REST API | Express Router |
| Environment | dotenv |
=======
# projects
>>>>>>> c9682cdd8b4c50e87f0bedabca49c7f397a8c979
