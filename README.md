# Al Gani — supply catalog and inquiry portal

A Vite/vanilla JavaScript website and Express/MySQL admin API for a B2B general supplier serving Kashmir and Leh.

## Public website

- Editorial homepage with sector previews and featured offerings
- Searchable collection with combined category filters and alphabetical sorting
- Offering detail pages with image galleries and accessible enlargement dialogs
- Persistent quote shortlist with quantities and measures, carried into an editable inquiry
- Company information, contact form and direct phone/WhatsApp/email links
- Responsive navigation, keyboard focus handling, reduced-motion support and recovery pages

The quote list is an inquiry planning tool. Prices, specifications, stock, delivery and installation are confirmed by the supplier; the site does not process payments.

## Local setup

Use Node.js 22.12+ and npm. From the repository root:

```sh
npm ci
npm run dev
```

The frontend runs at http://localhost:5173 and proxies `/api` to the backend on port 5000. The public built-in collection can be browsed without a database; submissions and admin operations require MySQL.

Copy `.env.example` to `.env` and configure:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, or `MYSQL_URL`
- `JWT_SECRET`: a long random secret
- `ADMIN_PASSWORD_1`: a unique password for the initial `aftab@algani` administrator (8+ characters, at most 72 UTF-8 bytes)
- SMTP or Resend settings for email delivery; see `backend/lib/emailService.cjs`

Never commit `.env`. Existing admin accounts are preserved. Startup does not create fictional business activity by default. `SEED_DEMO_DATA=true` is available only outside production for a disposable demo database.

## Validation and build

```sh
npm test
npm run build
npm start
```

`npm test` runs focused route, catalog, shortlist, client-state and backend-handler regression tests. Backend tests use recorded database adapters; they do not replace integration testing with MySQL and email services.

The production build is written to `frontend/dist`. `npm start` runs `backend/server.cjs` and serves both the frontend build and `/api`. Deployment configuration is included in `render.yaml` and `railway.toml`; configure the database, admin password and mail service before deployment.

## Inventory behavior

Creating an inquiry or converting it into a delivery does not deduct a fabricated quantity from inventory. Administrators manage counts explicitly. Inquiry conversion and linked delivery updates use transactions; shipped and delivered are distinct states.

## Structure

- `frontend/src/pages`: public pages and admin dashboard
- `frontend/src/components`: navigation, offering cards and shortlist state
- `frontend/src/redesign.css`: public editorial design
- `frontend/src/quote.css`: quote-list layout
- `backend/server.cjs`: API and startup
- `backend/lib`: validation and email helpers
- `tests`: focused regression coverage
- `REVIEW.md`: changes, validation evidence and outstanding integration checks

All rights reserved by Al Gani.
