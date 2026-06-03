const nodemailer = require('nodemailer');

let transporter = null;

function readEnv(key, fallback = '') {
  const v = process.env[key];
  return v !== undefined && v !== null && String(v).trim() !== '' ? String(v).trim() : fallback;
}

function getSmtpConfig() {
  const user =
    readEnv('SMTP_USER') ||
    readEnv('MAIL_USER') ||
    readEnv('EMAIL_USER');

  const pass =
    readEnv('SMTP_PASS') ||
    readEnv('SMTP_PASSWORD') ||
    readEnv('MAIL_PASSWORD') ||
    readEnv('EMAIL_PASSWORD');

  const host =
    readEnv('SMTP_HOST') ||
    readEnv('MAIL_HOST') ||
    (user && user.includes('@gmail.com') ? 'smtp.gmail.com' : '');

  const port = parseInt(
    readEnv('SMTP_PORT') || readEnv('MAIL_PORT') || '587',
    10
  );

  const secure =
    readEnv('SMTP_SECURE') === 'true' ||
    readEnv('MAIL_SECURE') === 'true' ||
    port === 465;

  const from =
    readEnv('SMTP_FROM') ||
    readEnv('MAIL_FROM') ||
    (user ? `"Al Gani General Suppliers" <${user}>` : '');

  return { host, port, secure, user, pass, from };
}

function isEmailConfigured() {
  const { host, user, pass } = getSmtpConfig();
  return Boolean(host && user && pass);
}

function getTransporter() {
  if (!isEmailConfigured()) return null;
  if (transporter) return transporter;

  const { host, port, secure, user, pass } = getSmtpConfig();

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    // Force IPv4 — Render's outbound IPv6 connectivity is unreliable
    family: 4,
    pool: true,
    maxConnections: 5,
    maxMessages: 250,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  return transporter;
}

/** Fire-and-forget: respond to HTTP immediately, send mail on next tick */
function enqueueOrderStatusEmail(payload) {
  setImmediate(() => {
    sendOrderStatusEmail(payload).catch((err) => {
      console.error('[email] Background send failed:', err.message || err);
    });
  });
}

async function verifySmtpConnection() {
  if (!isEmailConfigured()) {
    return { ok: false, reason: 'smtp-not-configured' };
  }
  try {
    const transport = getTransporter();
    await transport.verify();
    return { ok: true };
  } catch (err) {
    transporter = null;
    return { ok: false, reason: err.message };
  }
}

function slugToDisplayName(slug) {
  if (!slug) return 'your selected product';
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

async function resolveProductName(pool, { slug, productName }) {
  if (productName && String(productName).trim()) {
    return String(productName).trim();
  }
  if (!slug) return 'your selected product';

  try {
    const [customRows] = await pool.query(
      'SELECT name FROM custom_services WHERE slug = ? LIMIT 1',
      [slug]
    );
    if (customRows.length > 0 && customRows[0].name) {
      return customRows[0].name;
    }
  } catch (err) {
    console.error('[email] custom_services lookup failed:', err.message);
  }

  return slugToDisplayName(slug);
}

const TEMPLATES = {
  pending: {
    subject: (productName) => `Request received — ${productName}`,
    text: (name, productName) =>
      `Hello${name ? ` ${name}` : ''},\n\nWe have received your request for ${productName}.\n\nOur team will review it and get back to you shortly.\n\nThank you,\nAl Gani General Suppliers`,
    html: (name, productName) =>
      `<p>Hello${name ? ` ${name}` : ''},</p>
       <p>We have received your request for <strong>${productName}</strong>.</p>
       <p>Our team will review it and get back to you shortly.</p>
       <p>Thank you,<br><strong>Al Gani General Suppliers</strong></p>`,
  },
  accepted: {
    subject: (productName) => `Order accepted — ${productName}`,
    text: (name, productName) =>
      `Hello${name ? ` ${name}` : ''},\n\nYour order for ${productName} has been accepted!\n\nWe will keep you updated as fulfillment progresses.\n\nThank you,\nAl Gani General Suppliers`,
    html: (name, productName) =>
      `<p>Hello${name ? ` ${name}` : ''},</p>
       <p>Your order for <strong>${productName}</strong> has been accepted!</p>
       <p>We will keep you updated as fulfillment progresses.</p>
       <p>Thank you,<br><strong>Al Gani General Suppliers</strong></p>`,
  },
  approved: {
    subject: (productName) => `Order approved — ${productName}`,
    text: (name, productName) =>
      `Hello${name ? ` ${name}` : ''},\n\nYour order for ${productName} has been approved!\n\nOur team is preparing your products for dispatch from our Srinagar hub. You will receive another update when your order is shipped.\n\nThank you,\nAl Gani General Suppliers`,
    html: (name, productName) =>
      `<p>Hello${name ? ` ${name}` : ''},</p>
       <p>Your order for <strong>${productName}</strong> has been approved!</p>
       <p>Our team is preparing your products for dispatch from our Srinagar hub. You will receive another update when your order is shipped.</p>
       <p>Thank you,<br><strong>Al Gani General Suppliers</strong></p>`,
  },
  delivered: {
    subject: (productName) => `Order delivered — ${productName}`,
    text: (name, productName) =>
      `Hello${name ? ` ${name}` : ''},\n\nYour order for ${productName} has been delivered!</p>\n\nThank you for choosing Al Gani.\n\nAl Gani General Suppliers`,
    html: (name, productName) =>
      `<p>Hello${name ? ` ${name}` : ''},</p>
       <p>Your order for <strong>${productName}</strong> has been delivered!</p>
       <p>Thank you for choosing Al Gani.</p>
       <p><strong>Al Gani General Suppliers</strong></p>`,
  },
};

// Fix typo in delivered text template
TEMPLATES.delivered.text = (name, productName) =>
  `Hello${name ? ` ${name}` : ''},\n\nYour order for ${productName} has been delivered!\n\nThank you for choosing Al Gani.\n\nAl Gani General Suppliers`;

/**
 * @param {'pending'|'accepted'|'approved'|'delivered'} statusKey
 */
async function sendOrderStatusEmail({ to, customerName, productName, statusKey }) {
  if (!to) {
    console.warn('[email] Skipped — no recipient address');
    return { sent: false, reason: 'no-recipient' };
  }

  const template = TEMPLATES[statusKey];
  if (!template) {
    console.warn(`[email] Unknown status key: ${statusKey}`);
    return { sent: false, reason: 'unknown-status' };
  }

  if (!isEmailConfigured()) {
    console.warn(
      `[email] NOT SENT (SMTP missing) ${statusKey} → ${to}: ${template.subject(productName)}`
    );
    console.warn(
      '[email] Add SMTP_HOST, SMTP_USER, and SMTP_PASS to algani-website/.env then restart the server.'
    );
    return { sent: false, reason: 'smtp-not-configured' };
  }

  const transport = getTransporter();
  const { from } = getSmtpConfig();

  try {
    const info = await transport.sendMail({
      from,
      to,
      subject: template.subject(productName),
      text: template.text(customerName, productName),
      html: template.html(customerName, productName),
    });
    console.log(`[email] Sent ${statusKey} notification to ${to} (${info.messageId})`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[email] Failed to send ${statusKey} to ${to}:`, err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = {
  isEmailConfigured,
  getSmtpConfig,
  verifySmtpConnection,
  resolveProductName,
  sendOrderStatusEmail,
  enqueueOrderStatusEmail,
  slugToDisplayName,
};
