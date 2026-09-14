# Audit remediation

Core application fixes: ce69aa05f4d3cfe31dd89b7d6a48c4d518108ae8, followed by gallery fallback and copy cleanups.

## Implemented

- Enforced MySQL certificate validation, with an optional provider CA certificate.
- Added server-side logout revocation and password-version checks. Password updates also clear the browser session after the server confirms success.
- Saved customer notifications in a database outbox within the inquiry/order transaction. Added persistent retries, provider idempotency keys, queue counts and failed-job retries in admin Settings.
- Separated process liveness from a bounded, current database readiness check. Database outages return HTTP 503.
- Enforced a Content Security Policy, removed inline event attributes and replaced broad CORS matching with exact origins.
- Added CI with a disposable MySQL database, tests, build and production dependency audit. The Render blueprint also runs tests during its build; protecting main and verifying dashboard overrides remain hosting/repository configuration tasks.
- Added indexed cursor pagination for inquiries and orders. Admin metrics and search explicitly describe the loaded-record scope.
- Added an admin action log without copying form bodies into it. The log is best-effort operational history, not an immutable compliance ledger.
- Deferred the admin JavaScript download until needed, reducing the public JavaScript bundle from approximately 134 KB to 111 KB before compression.
- Added a privacy page and contact/footer links, and softened selected unverified service promises.
- Added optional owner notification support, disabled until a recipient is configured.
- Added hourly public health checks and a manual encrypted export workflow, plus an empty-local-database restore tool and recovery documentation.
- Unexpected schema migration errors now fail readiness instead of being silently ignored.

## Verification

- 90 unit/regression tests passed; production build passed.
- Final CI passed: https://github.com/amaan0605ats-debug/e-commerce/actions/runs/34872745375.
- Real MySQL integration covered inquiry creation, acceptance email jobs, pagination, password invalidation and logout revocation.
- Deliberately making the test outbox unavailable caused inquiry creation to fail and roll back, without leaving a saved inquiry.
- An encrypted snapshot restored into an empty disposable database. A tampered snapshot and a nonempty restore target were rejected.
- Browser checks covered the privacy page in dark mode and at 390px, the mobile contact menu, required-field validation and the admin sign-in page. No overflow was observed on the tested mobile pages. No CSP script errors were observed.
- Local browser tests used the production build with no database credentials; write-path verification used CI's disposable MySQL instance. No production inquiries, emails, passwords or admin records were changed for testing.
- Live database readiness passed after deployment with certificate validation enabled, and the new CSP header is present.
- All 20 sitemap pages returned HTTP 200 with title, description and canonical markup. Robots, favicon and the privacy page returned HTTP 200; an unknown page returned HTTP 404.
- Live inquiries, orders, email operations and audit endpoints returned HTTP 401 without an authenticated session.
- Live gallery thumbnail switching, modal open/Escape and quote-list add/remove passed. The test shortlist item was removed, and no browser errors were recorded during those checks.

## Still requires configuration or business input

- Confirm inquiry retention and the owner notification recipient. Do not enable automatic deletion or send owner alerts to an assumed destination.
- Configure backup credentials/key storage, verify provider-managed backup schedule and retention, and perform a provider-specific recovery drill. Passing the disposable MySQL drill is not proof that production is backed up.
- Confirm real email receipt and sender-domain setup. The outbox's sent state means provider acceptance; bounce/delivery webhooks and inbox delivery have not been verified.
- Verify the actual Render plan and approve a budget before an always-on hosting upgrade. The checked-in blueprint still uses the free plan.
- Configure who receives workflow-failure alerts. Hourly checks are not continuous monitoring and may run late.
- Confirm product specifications, supplier/warranty claims and authentic project photography. No invented reviews, certifications or business commitments were added.
- Decide whether conversion analytics are wanted. No third-party visitor tracking was enabled.
- MFA/HttpOnly cookie migration, server-side search across all historical records, field Core Web Vitals and large-scale load testing remain further improvements, not claims of completed work.

These changes address the identified engineering issues; they are not a guarantee that every possible defect has been eliminated.
