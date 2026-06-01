# 🌾 Al Gani - Premium B2B E-Commerce & Supply Chain Portal

Welcome to the **Al Gani** B2B Supply Chain & Catalog Platform. This is a high-fidelity, high-performance web application designed for regional Jammu & Kashmir businesses, offering premium dark-chocolate and gold-accented styling, low-latency animations, dynamic catalog custom offerings, and interactive B2B partner registration.

---

## 🛠️ Technology Stack

* **Frontend:** Vanilla HTML5, CSS3, & Modern ES6 JavaScript built on **Vite**.
* **Backend:** **Node.js (Express)** serving dynamic APIs.
* **Database:** **MySQL** storing catalog products, custom services, corporate partners, and B2B inquiries.
* **Mock Firebase Client Layer:** Drop-in simulated Firebase Auth and Firestore queries mapping seamlessly to local Express APIs.
* **Styling & Assets:** Harmony-based Vanilla CSS with hardware-accelerated (`will-change`) page loading transitions operating at exactly 250ms.

---

## ✨ Features & Capabilities

1. **🌾 Dynamic Custom Catalog Offerings:**
   * Dynamic catalog items added via the admin dashboard instantly update the MySQL database and synchronize with the public navigation bar categories, the mobile-responsive menu, the Services Index page, and dynamic service detail pages.
   * Auto-generates search-friendly slug strings, localized WhatsApp inquiry actions, and custom detail features lists.

2. **🤝 B2B Corporate Partners Module:**
   * Real-time tracking of corporate B2B partners.
   * Dynamic status pills with action hooks (approve pending partners instantly).
   * Manual partner addition with responsive modal forms.

3. **⚡ High-Performance Animations:**
   * Custom page transition animations triggering and resolving in exactly 250ms (well under the 300ms network budget designed to accommodate unstable J&K connections).

4. **🛡️ Image Resiliency Systems:**
   * Automated, context-aware image placeholder fallbacks across the client to prevent broken image grids under slow or dropping internet connections.

5. **📧 Order Management & Email Notifications:**
   * Contact / quick-inquiry forms create an inquiry with status **pending** and email: *"We have received your request for [Product Name]."*
   * Admin **Accept** sets status **accepted** and emails: *"Your order for [Product Name] has been accepted!"*
   * Admin **Delivered** (Deliveries tab, after convert) sets status **delivered** and emails: *"Your order for [Product Name] has been delivered!"*

---

## 🚀 Getting Started Locally

### 1. Prerequisites
Ensure you have **Node.js (v18+)** and a **MySQL** server active on your system.

### 2. Environment Setup
Create a `.env` file at the root of the project (`/algani-website/.env`):
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=algani_db
JWT_SECRET=supersecretkey

# SMTP — automated order status emails (Gmail, SendGrid, etc.)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Al Gani General Suppliers <your-email@gmail.com>"
```

### 3. Installation
Install the project dependencies:
```bash
npm install
```

### 4. Running the Application
To run the server and the client development server concurrently:

* **Start the Express API & Seed Database:**
  ```bash
  node server.cjs
  ```
  *(This will automatically migrate the schemas and seed the initial catalog/partners tables if they do not exist)*

* **Start the Vite Frontend:**
  ```bash
  npm run dev
  ```

---

## 📦 Production Deployment

### 1. Build Static Assets
Compile the Vite client files for production:
```bash
npm run build
```
This builds standard optimized static files inside the `dist/` directory.

### 2. Run API Server in Production
Keep the Express backend API running robustly in the background using a Node process manager like **PM2**:
```bash
pm2 start server.cjs --name "algani-api"
```

### 3. Web Server Configuration
Configure **Nginx** or **Apache** to serve the built `dist/` directory and proxy request headers matching `/api/*` directly to `http://localhost:5000`.

---

## ☁️ Deploy on Render (Free Web Service)

Render’s **free web service** can host this app (site + API in one process). Render does **not** include free MySQL—you need a free MySQL-compatible database elsewhere (recommended: [TiDB Cloud Serverless](https://tidbcloud.com/) — MySQL compatible, free tier).

### 1. Push code to GitHub
Ensure `main` is up to date on your GitHub repo.

### 2. Create the web service on Render
1. Sign in at [render.com](https://render.com/) → **New** → **Blueprint**.
2. Connect repository `amaan0605ats-debug/e-commerce`.
3. Render detects `render.yaml` → **Apply**.

Or manually: **New** → **Web Service** → connect repo → settings:
- **Build command:** `npm install && npm run build`
- **Start command:** `npm start`
- **Plan:** Free

### 3. Environment variables (Render dashboard → Environment)

| Variable | Example / notes |
|----------|-----------------|
| `MYSQL_URL` | `mysql://user:pass@host:4000/dbname` from TiDB (or other host) |
| `DB_SSL` | `true` (set `DB_SSL_REJECT_UNAUTHORIZED=false` only if TLS errors) |
| `ADMIN_PASSWORD_1` | Your admin login password |
| `JWT_SECRET` | Long random string (or use Render “Generate”) |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `alganigeneralsupplier@gmail.com` |
| `SMTP_PASS` | Gmail app password |
| `SMTP_FROM` | `"Al Gani General Suppliers <alganigeneralsupplier@gmail.com>"` |

Do **not** commit `.env` to GitHub.

### 4. Deploy
Click **Deploy**. When the build finishes, open your `*.onrender.com` URL.

**Free tier notes:** The service sleeps after ~15 minutes of no traffic (first visit may take 30–60s to wake). Database and SMTP must stay configured in the dashboard.

---

## 📄 License
This project is proprietary and reserved for Al Gani B2B operations. All rights reserved.
