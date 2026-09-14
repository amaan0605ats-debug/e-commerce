# Operations and recovery

The deploy build runs npm ci, unit/regression tests and the production build. The Verify GitHub workflow additionally tests a real disposable MySQL database. Protect main with the Verify check in GitHub settings; branch protection itself is not configured by repository files.

## Health and notifications

- /api/live checks the running process. /api/health performs a bounded database probe and returns 503 when unavailable. emailConfigured is configuration presence, not inbox delivery.
- The hourly Live health workflow fails on failed checks. Configure GitHub workflow-failure notifications for the business owner, or connect a dedicated uptime service for faster alerts.
- Admin Settings shows email queue counts and failed jobs; Retry requeues a failed job. Sent means accepted by Resend. Confirm sender-domain DNS in Resend and perform a consenting end-to-end test before relying on delivery.
- Set OWNER_NOTIFICATION_EMAIL only after the business confirms the recipient. The feature remains disabled otherwise.
- Existing admin sessions need a new sign-in after this release. Password changes invalidate all previously issued sessions; sign out revokes that session server-side.

## Backups

Use the database provider's automated backups as the primary scheduled recovery system. Verify the configured schedule, retention, point-in-time recovery support and account ownership in the provider dashboard. These cannot be inferred from the repository.

An additional encrypted export is available through the manual Encrypted backup workflow. Configure GitHub secrets BACKUP_DATABASE_URL (prefer a read-only backup user), BACKUP_ENCRYPTION_KEY (32 random bytes encoded as 64 hex characters) and DB_SSL_CA only if a custom CA is required. The artifact is encrypted with AES-256-GCM and retained for seven days. Keep the key in a password manager separately from exports. Do not enable recurring exports until the business confirms storage and retention policy.

Local command: node backend/scripts/backup.cjs backup PATH.enc with the same environment variables.

A restore drill accepts only an empty local database whose name ends in _restore. Point BACKUP_DATABASE_URL at that database, provide the matching key, and run node backend/scripts/backup.cjs restore PATH.enc. Inspect inquiry/order counts and application behavior before any real recovery. Restoring to production is intentionally excluded from this helper.

## Deployment and TLS

Database TLS certificate verification is mandatory. If the provider uses a private CA, set DB_SSL_CA to its PEM certificate. Do not bypass validation. The legacy DB_SSL_REJECT_UNAUTHORIZED=false setting no longer weakens validation.

The blueprint still declares the free hosting plan. Verify the actual dashboard plan and upgrade to always-on hosting only with the owner's budget approval. A code change cannot guarantee absence of cold starts on a sleeping plan.

## Business decisions still required

Confirm inquiry retention, owner email recipient, actual manufacturer/warranty claims, real project images and product specifications. A factual privacy/contact notice is present without inventing a retention period. No third-party analytics or customer tracking has been enabled.
