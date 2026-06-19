/**
 * emailService.cjs — Al Gani transactional email via Resend
 *
 * Why Resend instead of nodemailer + Gmail SMTP?
 * Render's free tier blocks outbound TCP on ports 25, 465, and 587 (SMTP).
 * Resend sends over HTTPS (port 443), which is never blocked.
 *
 * Setup:
 *  1. Sign up free at https://resend.com  (3,000 emails/month free)
 *  2. Add a "Sending Domain" (or use their shared domain onboarding.resend.dev for testing)
 *  3. Create an API key and paste it into Render → Environment → RESEND_API_KEY
 *  4. Set RESEND_FROM to e.g.  "Al Gani <noreply@yourdomain.com>"
 *     (For testing with the shared domain use:  "Al Gani <onboarding@resend.dev>")
 */

const { Resend } = require('resend');

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

let resend = null;

function readEnv(key, fallback = '') {
  const v = process.env[key];
  return v !== undefined && v !== null && String(v).trim() !== '' ? String(v).trim() : fallback;
}

function isEmailConfigured() {
  return Boolean(readEnv('RESEND_API_KEY'));
}

function getResendClient() {
  if (resend) return resend;
  const apiKey = readEnv('RESEND_API_KEY');
  if (!apiKey) return null;
  resend = new Resend(apiKey);
  return resend;
}

function getFromAddress() {
  return (
    readEnv('RESEND_FROM') ||
    readEnv('EMAIL_FROM') ||
    'Al Gani General Suppliers <onboarding@resend.dev>'
  );
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
    return { ok: false, reason: 'resend-not-configured' };
  }
  // Resend has no "verify" step — just confirm the key is present
  return { ok: true };
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
    subject: (productName) => productName && productName !== 'your selected product'
      ? `Request received — ${productName}`
      : `New inquiry received — Al Gani General Suppliers`,
    html: (name, productName) => {
      const hasProduct = productName && productName !== 'your selected product';
      const productBlock = hasProduct
        ? `<div style="background:#1a1a2e;border-left:3px solid #e0b050;border-radius:6px;padding:14px 18px;margin:20px 0;">
             <div style="font-size:11px;color:#a09070;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">Product / Service Selected</div>
             <div style="font-size:18px;color:#e0b050;font-weight:700;">${productName}</div>
           </div>`
        : `<p style="line-height:1.7;color:#a09070;">No specific product was selected — our team will follow up to understand your requirements.</p>`;
      return `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0d0d0d;color:#e8e0cc;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:32px 40px;text-align:center;">
          <h1 style="font-size:26px;color:#e0b050;margin:0;letter-spacing:1px;">Al Gani General Suppliers</h1>
          <p style="color:#a09070;font-size:13px;margin:6px 0 0;">Kashmir & Leh Region</p>
        </div>
        <div style="padding:32px 40px;">
          <h2 style="color:#e0b050;font-size:20px;margin-top:0;">Request Received ✅</h2>
          <p style="line-height:1.7;">Hello${name ? ` <strong>${name}</strong>` : ''},</p>
          <p style="line-height:1.7;">We have received your inquiry${hasProduct ? ' for:' : '.'}</p>
          ${productBlock}
          <p style="line-height:1.7;">Our team will review it and get back to you within 24 hours.</p>
          <div style="border-top:1px solid #2a2a2a;margin-top:28px;padding-top:20px;font-size:13px;color:#707070;">
            <p>Thank you for choosing Al Gani.</p>
          </div>
        </div>
      </div>
    `;}},

  accepted: {
    subject: (productName) => `Order accepted — ${productName}`,
    html: (name, productName) => `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0d0d0d;color:#e8e0cc;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:32px 40px;text-align:center;">
          <h1 style="font-size:26px;color:#e0b050;margin:0;letter-spacing:1px;">Al Gani General Suppliers</h1>
          <p style="color:#a09070;font-size:13px;margin:6px 0 0;">Kashmir & Leh Region</p>
        </div>
        <div style="padding:32px 40px;">
          <h2 style="color:#4caf50;font-size:20px;margin-top:0;">Order Accepted 🎉</h2>
          <p style="line-height:1.7;">Hello${name ? ` <strong>${name}</strong>` : ''},</p>
          <p style="line-height:1.7;">Your order for:</p>
          <div style="background:#1a1a2e;border-left:3px solid #4caf50;border-radius:6px;padding:14px 18px;margin:16px 0;">
            <div style="font-size:11px;color:#a09070;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">Product / Service</div>
            <div style="font-size:18px;color:#e0b050;font-weight:700;">${productName}</div>
          </div>
          <p style="line-height:1.7;">has been <strong style="color:#4caf50;">accepted!</strong> We will keep you updated as fulfillment progresses.</p>
          <div style="border-top:1px solid #2a2a2a;margin-top:28px;padding-top:20px;font-size:13px;color:#707070;">
            <p>Thank you for choosing Al Gani.</p>
          </div>
        </div>
      </div>
    `,
  },
  approved: {
    subject: (productName) => `Order approved — ${productName}`,
    html: (name, productName) => `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0d0d0d;color:#e8e0cc;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:32px 40px;text-align:center;">
          <h1 style="font-size:26px;color:#e0b050;margin:0;letter-spacing:1px;">Al Gani General Suppliers</h1>
          <p style="color:#a09070;font-size:13px;margin:6px 0 0;">Kashmir & Leh Region</p>
        </div>
        <div style="padding:32px 40px;">
          <h2 style="color:#e0b050;font-size:20px;margin-top:0;">Order Approved ✅</h2>
          <p style="line-height:1.7;">Hello${name ? ` <strong>${name}</strong>` : ''},</p>
          <p style="line-height:1.7;">Your order for:</p>
          <div style="background:#1a1a2e;border-left:3px solid #e0b050;border-radius:6px;padding:14px 18px;margin:16px 0;">
            <div style="font-size:11px;color:#a09070;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">Product / Service</div>
            <div style="font-size:18px;color:#e0b050;font-weight:700;">${productName}</div>
          </div>
          <p style="line-height:1.7;">has been <strong>approved!</strong> Our team is preparing your products for dispatch from our Srinagar hub. You will receive another update when your order is shipped.</p>
          <div style="border-top:1px solid #2a2a2a;margin-top:28px;padding-top:20px;font-size:13px;color:#707070;">
            <p>Thank you for choosing Al Gani.</p>
          </div>
        </div>
      </div>
    `,
  },
  delivered: {
    subject: (productName) => `Order delivered — ${productName}`,
    html: (name, productName) => `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0d0d0d;color:#e8e0cc;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:32px 40px;text-align:center;">
          <h1 style="font-size:26px;color:#e0b050;margin:0;letter-spacing:1px;">Al Gani General Suppliers</h1>
          <p style="color:#a09070;font-size:13px;margin:6px 0 0;">Kashmir & Leh Region</p>
        </div>
        <div style="padding:32px 40px;">
          <h2 style="color:#4caf50;font-size:20px;margin-top:0;">Order Delivered 📦</h2>
          <p style="line-height:1.7;">Hello${name ? ` <strong>${name}</strong>` : ''},</p>
          <p style="line-height:1.7;">Your order for:</p>
          <div style="background:#1a1a2e;border-left:3px solid #4caf50;border-radius:6px;padding:14px 18px;margin:16px 0;">
            <div style="font-size:11px;color:#a09070;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">Product / Service</div>
            <div style="font-size:18px;color:#e0b050;font-weight:700;">${productName}</div>
          </div>
          <p style="line-height:1.7;">has been <strong style="color:#4caf50;">delivered!</strong> Thank you for choosing Al Gani — we look forward to serving you again.</p>
          <div style="border-top:1px solid #2a2a2a;margin-top:28px;padding-top:20px;font-size:13px;color:#707070;">
            <p>Al Gani General Suppliers</p>
          </div>
        </div>
      </div>
    `,
  },
};

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
      `[email] NOT SENT (Resend not configured) ${statusKey} → ${to}: ${template.subject(productName)}`
    );
    console.warn(
      '[email] Add RESEND_API_KEY to your .env / Render environment variables.'
    );
    return { sent: false, reason: 'resend-not-configured' };
  }

  const client = getResendClient();
  const from = getFromAddress();

  try {
    const escapedName = customerName ? escapeHtml(customerName) : '';
    const escapedProduct = productName ? escapeHtml(productName) : '';
    const { data, error } = await client.emails.send({
      from,
      to: [to],
      subject: template.subject(productName),
      html: template.html(escapedName, escapedProduct),
    });

    if (error) {
      console.error(`[email] Resend error for ${statusKey} → ${to}:`, error);
      return { sent: false, reason: error.message || JSON.stringify(error) };
    }

    console.log(`[email] Sent ${statusKey} notification to ${to} (id: ${data?.id})`);
    return { sent: true, messageId: data?.id };
  } catch (err) {
    console.error(`[email] Failed to send ${statusKey} to ${to}:`, err.message);
    return { sent: false, reason: err.message };
  }
}

// Legacy compat: getSmtpConfig is referenced in server.cjs startup log
function getSmtpConfig() {
  return {
    host: 'resend-api',
    port: 443,
    secure: true,
    user: readEnv('RESEND_API_KEY') ? '(resend key present)' : '',
    pass: readEnv('RESEND_API_KEY') || '',
    from: getFromAddress(),
  };
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
