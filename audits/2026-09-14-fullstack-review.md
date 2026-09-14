# Al Gani full-stack review

Date: 2026-09-14. Reviewed commit: 202606b. Site: https://algani.co.in/

## Assessment

Overall production readiness: 6.5/10 (engineering judgment, not a Lighthouse score or security certification).
Presentation: 8/10. Customer flows: 7.5/10. Backend reliability: 6/10. Security hardening: 5.5/10. Operations and regression protection: 5/10.

The application is a functional B2B catalog and inquiry portal. The important remaining work is operational reliability and security, not additional visual effects. This audit makes no application changes or production database writes.

## Fresh verification

- npm test: 83 passed, 0 failed.
- npm run build: passed.
- npm audit --omit=dev: zero reported production dependency vulnerabilities. This does not prove absence of application vulnerabilities.
- All 19 sitemap URLs: HTTP 200 with title and canonical markup.
- Unknown page: HTTP 404. Robots and sitemap: HTTP 200 with appropriate content types.
- Unauthenticated inquiries, orders and private products endpoints: HTTP 401.
- Health endpoint returned database=true and smtp=true. The latter only means a key is configured, not that mail delivery succeeds.
- Live browser: search filters, adding/removing a shortlist item, keyboard quantity editing, quantity handoff to contact, required-field validation, mobile menu, image dialog/Escape and light/dark switching passed.
- Desktop and 390px mobile checks did not reveal horizontal overflow in the tested pages.
- Local test shortlist item removed after verification. No inquiry was sent.
- Sample warm HTTP requests took approximately 213-447ms from this machine. These are not full page load times, mobile network benchmarks, cold-start measurements or Core Web Vitals.

## Priority findings

### High: Database certificate verification disabled in deployment blueprint
Evidence: render.yaml:13-14; backend/server.cjs:241.
The checked-in deployment config sets DB_SSL_REJECT_UNAUTHORIZED=false. This disables server certificate validation when that configuration is active. Configure the provider CA/trust correctly and require certificate validation. Actual hosting environment overrides were not inspected; production exposure remains unverified.

### High: Existing admin tokens survive password changes and logout
Evidence: backend/server.cjs:169, 933, 1496; frontend/src/firebase.js:35.
Tokens are signed for 12 hours, checked without a session-version lookup, and password changes update only the password hash. Logout clears browser storage only. A copied token can therefore remain usable until expiry. Add server-side revocation/session versions, revoke on password changes, and provide a revoke-all-sessions action. Consider MFA and HttpOnly cookie sessions with appropriate CSRF protection.
Reference: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html

### High: Email delivery has no durable queue or delivery tracking
Evidence: backend/lib/emailService.cjs:57-70; backend/server.cjs:1015.
Email tasks use setImmediate and failures are logged. A process restart can lose queued work; provider failures have no durable retry or admin-visible delivery state. Persist an outbox alongside the inquiry/order update, retry transient failures, and record delivery/bounce status. Verify a real end-to-end email in staging. The current SMTP health helper only checks configuration presence.

### Medium: Health checks can miss database failures
Evidence: backend/server.cjs:252-259.
The endpoint always returns HTTP 200 and uses an initialization flag rather than a fresh dependency check. A monitor checking HTTP success can miss database unavailability. Separate liveness from readiness and use a bounded database probe with HTTP 503 on readiness failure.

### Medium: Browser security policy disabled; CORS allowlist overly broad
Evidence: backend/server.cjs:48, 87-99. Live response has no Content-Security-Policy header.
Introduce a tested CSP, initially in report-only mode, and remove reliance on inline handlers where necessary. Restrict CORS to exact deployed origins; the current substring-based Render hostname matching admits more origins than intended. No working XSS exploit or authenticated cross-origin data leak was established in this audit. Browser-readable session storage increases the impact if script injection is introduced later.

### Medium: Missing deployment test gate and real integration coverage
Evidence: render.yaml:9; README.md validation section; no tracked .github workflow files found.
The build command does not run tests, and backend tests use database adapters rather than a real MySQL instance. Add CI with npm ci, tests and build before deploy, plus staging integration tests for inquiry creation, admin edits, order transitions and email outcomes. A green unit suite does not establish those real-world side effects.

### Medium: Hosting cold-start risk
Evidence: render.yaml:7 declares plan: free. Actual dashboard plan was not inspected.
If production uses this plan, Render documents sleeping after 15 minutes idle and roughly a minute to restart. Verify the deployed plan; use always-on hosting for dependable first visits.
Reference: https://render.com/docs/free

### Medium: Admin lists fetch all records
Evidence: backend/server.cjs:953, 1146.
Inquiries and orders are returned without pagination. Add bounded pagination, indexed filters and server-side search before volume grows. This is a scaling risk, not a measured current slowdown.

## Missing or incomplete product and operational elements

- Privacy notice linked beside the contact form explaining use and retention of inquiry details. Have the business approve its wording; this is a product recommendation, not a legal-compliance determination.
- Owner notifications for new inquiries. The submission handler sends to the customer, with no separate owner email in that flow.
- Real product specifications, model/brand information, approved supplier details and authentic project photography. Confirm existing claims such as certified manufacturers, 24/7 support and a 24-hour response promise before publishing them as commitments.
- Conversion measurement for quote starts, inquiries and contact clicks, with an appropriate privacy approach.
- Verified backup schedule, retention and a tested restore procedure. No repository evidence of these was found; provider-managed backups may exist and need verification.
- Error/uptime alerting, admin action audit trail, and documented incident recovery.
- Lazy-loaded admin code and automated visual checks across themes to reduce the risk of another contrast regression. The public entry currently imports the admin pages eagerly.
- Checkout, payments and customer accounts are optional business decisions. They are not required for the present quotation-based model.

## Limits

No production admin writes, password changes, real email delivery, payment flow, load test, penetration test, backup restore or authenticated hosting-console inspection was performed. No field Core Web Vitals or Lighthouse score was collected. The repository-audit plugin was unavailable; evidence came from local source inspection, fresh local commands and live browser/HTTP checks.

## Recommended order

1. Verify and fix database TLS configuration; implement admin session revocation.
2. Add durable email delivery, owner alerts and accurate readiness checks.
3. Add CI, staging integration tests and verified backup/restore monitoring.
4. Add the privacy notice and business-approved product information.
5. Measure real visitor performance and conversion before further visual expansion.
