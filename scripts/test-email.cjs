/**
 * Test SMTP after setting SMTP_PASS in .env:
 *   node scripts/test-email.cjs you@example.com
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const {
  isEmailConfigured,
  verifySmtpConnection,
  sendOrderStatusEmail,
  getSmtpConfig,
} = require('../lib/emailService.cjs');

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error('Usage: node scripts/test-email.cjs <recipient-email>');
    process.exit(1);
  }

  const cfg = getSmtpConfig();
  console.log('SMTP host:', cfg.host || '(missing)');
  console.log('SMTP user:', cfg.user || '(missing)');
  console.log('SMTP pass:', cfg.pass ? '******** (set)' : '(MISSING — add SMTP_PASS to .env)');

  if (!isEmailConfigured()) {
    console.error('\nEmail is not configured. Set SMTP_PASS in .env and try again.');
    process.exit(1);
  }

  const check = await verifySmtpConnection();
  if (!check.ok) {
    console.error('\nSMTP connection failed:', check.reason);
    process.exit(1);
  }
  console.log('\nSMTP connection OK. Sending test email...');

  const result = await sendOrderStatusEmail({
    to,
    customerName: 'Test Customer',
    productName: 'Insulation Materials',
    statusKey: 'pending',
  });

  if (result.sent) {
    console.log('Test email sent successfully.', result.messageId || '');
  } else {
    console.error('Send failed:', result.reason);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
