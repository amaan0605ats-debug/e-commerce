const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
// Load environment variables from repo root as early as possible
const envPath = path.join(__dirname, '..', '.env');
const dotenvResult = dotenv.config({ path: envPath });

if (process.env.NODE_ENV !== 'production') {
  console.log(`[debug] Dotenv loading from: ${envPath}`);
  if (dotenvResult.error) {
    console.error('[debug] Dotenv error:', dotenvResult.error);
  } else {
    console.log('[debug] Dotenv loaded successfully. Keys found:', Object.keys(dotenvResult.parsed || {}));
  }
  console.log('[debug] process.env.RESEND_API_KEY exists:', Boolean(process.env.RESEND_API_KEY));
}

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const crypto = require('crypto');
const { ORDER_STATUSES, INQUIRY_STATUSES, isBoolean, isEmail, validateInventory } = require('./lib/validation.cjs');
const {
  resolveProductName,
  enqueueOrderStatusEmail,
  slugToDisplayName,
  isEmailConfigured,
  verifySmtpConnection,
} = require('./lib/emailService.cjs');

const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');

const app = express();
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ── SECURITY MIDDLEWARES & UTILITIES ──

// Helmet headers configuration
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP to maintain full compatibility with Vite scripts & styles
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

// CORS configuration (limit to production domain & local dev)
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://algani-website.onrender.com',
  'https://e-commerce-webite.onrender.com',
  'https://e-commerce-website.onrender.com',
  'https://ecommerce.onrender.com',
  'https://algani.co.in',
  'https://www.algani.co.in'
];
app.use(cors((req, callback) => {
  const origin = req.header('Origin');
  let isAllowed = false;

  if (!origin) {
    isAllowed = true;
  } else if (process.env.NODE_ENV !== 'production') {
    isAllowed = true;
  } else if (allowedOrigins.indexOf(origin) !== -1) {
    isAllowed = true;
  } else {
    try {
      const originUrl = new URL(origin);
      // Same-origin check
      if (originUrl.host === req.header('Host')) {
        isAllowed = true;
      }
      // Render subdomains wildcard check
      else if (originUrl.hostname.endsWith('.onrender.com') &&
               (originUrl.hostname.includes('e-commerce-webite') ||
                originUrl.hostname.includes('e-commerce-website') ||
                originUrl.hostname.includes('algani-website') ||
                originUrl.hostname.includes('ecommerce'))) {
        isAllowed = true;
      }
      // Custom domain check
      else if (originUrl.hostname === 'algani.co.in' ||
               originUrl.hostname.endsWith('.algani.co.in')) {
        isAllowed = true;
      }
    } catch (e) {}
  }

  const corsOptions = {
    origin: isAllowed ? origin : false,
    credentials: true
  };
  callback(null, corsOptions);
}));

// JSON body size limit (prevent DoS)
app.use(express.json({ limit: '100kb' }));
app.use('/api', (req, res, next) => {
  // These actions take their complete input from the route, and the dashboard
  // intentionally sends them without a request body.
  const bodylessAction = req.method === 'PUT' &&
    /^\/(?:alerts\/[^/]+\/read|partners\/[^/]+\/approve)\/?$/.test(req.path);
  if (bodylessAction && req.body === undefined) return next();
  if (['POST', 'PUT', 'PATCH'].includes(req.method) &&
      (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))) {
    return res.status(400).json({ error: 'A JSON object request body is required.' });
  }
  next();
});

// Rate Limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300, // Accommodate four dashboard subscriptions polling every 30 seconds.
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again after 15 minutes.' }
});

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many contact submissions, please try again later.' }
});

// Apply general rate limit to all /api routes
app.use('/api/', generalLimiter);

// JWT Secret Key
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  JWT_SECRET = crypto.randomBytes(32).toString('hex');
  console.log('[security] JWT_SECRET env var is not set. Generated a cryptographically secure random secret key for this session.');
}

// Authentication guard middleware for admin routes
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 'auth/unauthorized', error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    if (!decoded.id || !decoded.email) throw new Error('Invalid admin session');
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ code: 'auth/invalid-token', error: 'Invalid or expired token' });
  }
}

// Input sanitization helper
function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Parse DB_HOST/DB_*, Railway MYSQL* vars, or cloud MYSQL_URL (TiDB, Railway, etc.)
function parseDbConfig() {
  const rawUrl = process.env.MYSQL_URL || process.env.DATABASE_URL || process.env.DB_URL;
  if (rawUrl && /^mysql2?:\/\//i.test(rawUrl)) {
    const url = new URL(rawUrl);
    const database =
      decodeURIComponent(url.pathname.replace(/^\//, '').split('/')[0] || '') ||
      'algani_db';
    return {
      host: url.hostname,
      port: parseInt(url.port || '3306', 10),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database,
      isManaged: true,
    };
  }

  const railwayHost = process.env.MYSQLHOST || process.env.MYSQL_HOST;
  if (railwayHost) {
    return {
      host: railwayHost,
      port: parseInt(process.env.MYSQLPORT || process.env.MYSQL_PORT || '3306', 10),
      user: process.env.MYSQLUSER || process.env.MYSQL_USER || 'root',
      password: process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || '',
      database:
        process.env.MYSQLDATABASE ||
        process.env.MYSQL_DATABASE ||
        process.env.MYSQL_DB ||
        'railway',
      isManaged: true,
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'algani_db',
    isManaged: process.env.DB_MANAGED === 'true',
  };
}

function getDbSslOptions() {
  if (process.env.DB_SSL === 'false') return undefined;
  if (
    process.env.DB_SSL === 'true' ||
    process.env.MYSQL_URL ||
    process.env.DATABASE_URL
  ) {
    return { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' };
  }
  return undefined;
}

let pool;
let databaseReady = false;
let lastDbError = null;

// Enable database health checks

app.get('/api/health', (req, res) => {
  // Always 200 so Render health checks pass while TiDB is still connecting
  res.status(200).json({
    ok: databaseReady,
    database: databaseReady,
    smtp: isEmailConfigured(),
    ...(databaseReady || process.env.NODE_ENV === 'production'
      ? {}
      : {
          fix:
            'Set MYSQL_URL (cloud) or link Railway MySQL (MYSQLHOST vars). For TiDB/Render add DB_SSL=true, then redeploy.',
          lastError: lastDbError || 'Database pool not initialized',
        }),
  });
});


// Database connectivity verification middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') && req.path !== '/api/health' && !databaseReady) {
    return res.status(503).json({
      code: 'auth/database-error',
      error: 'Database not connected. Please contact support or check server logs.',
      detail: process.env.NODE_ENV !== 'production' ? (lastDbError || undefined) : undefined,
    });
  }
  next();
});

// ── DATABASE INITIALIZATION & SCHEMA CREATION ──
async function initDatabase() {
  databaseReady = false;
  const dbConfig = parseDbConfig();
  const ssl = getDbSslOptions();

  try {
    console.log(
      `Connecting to MySQL at ${dbConfig.host}:${dbConfig.port} (database: ${dbConfig.database})...`
    );

    // Local/dev only — managed cloud databases already have a database provisioned
    if (!dbConfig.isManaged) {
      const conn = await mysql.createConnection({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password,
        ssl,
      });

      console.log(`Creating database '${dbConfig.database}' if it doesn't exist...`);
      await conn.query('CREATE DATABASE IF NOT EXISTS ??', [dbConfig.database]);
      await conn.end();
    }

    pool = mysql.createPool({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      ssl,
      waitForConnections: true,
      connectionLimit: dbConfig.isManaged ? 5 : 10,
      queueLimit: 0,
      connectTimeout: 20000,
      enableKeepAlive: true,
    });

    console.log('Connected to MySQL pool. Initializing tables...');

    // 1. Create Admins Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        displayName VARCHAR(255) NOT NULL
      )
    `);

    // 2. Create Inquiries Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inquiries (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(255) DEFAULT '',
        subject VARCHAR(255) DEFAULT '',
        service VARCHAR(255) DEFAULT '',
        location VARCHAR(255) DEFAULT '',
        message TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        createdAt VARCHAR(255) NOT NULL
      )
    `);

    // 3. Create Orders Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(255) PRIMARY KEY,
        clientName VARCHAR(255) NOT NULL,
        service VARCHAR(255) NOT NULL,
        region VARCHAR(255) NOT NULL,
        notes TEXT,
        status VARCHAR(50) DEFAULT 'new',
        createdAt VARCHAR(255) NOT NULL,
        updatedAt VARCHAR(255) NOT NULL
      )
    `);

    // 4. Create Products Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        slug VARCHAR(255) PRIMARY KEY,
        stockStatus VARCHAR(50) DEFAULT 'in-stock',
        visible TINYINT(1) DEFAULT 1,
        inventoryCount INT DEFAULT 100,
        lowStockThreshold INT DEFAULT 10,
        supplierEmail VARCHAR(255) DEFAULT 'supplier@algani.com'
      )
    `);

    // 5. Create Inventory Alerts Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory_alerts (
        id VARCHAR(50) PRIMARY KEY,
        slug VARCHAR(255) NOT NULL,
        message TEXT,
        emailSentTo VARCHAR(255),
        status VARCHAR(50) DEFAULT 'unread',
        createdAt VARCHAR(255) NOT NULL
      )
    `);

    // 6. Create Corporate Partners Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS partners (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(255) DEFAULT '',
        timeAgo VARCHAR(255) DEFAULT '',
        logo VARCHAR(10) DEFAULT '🌐',
        status VARCHAR(50) DEFAULT 'pending'
      )
    `);

    // 7. Create Custom Services Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS custom_services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        icon VARCHAR(10) DEFAULT '📦',
        category VARCHAR(255) NOT NULL,
        tag VARCHAR(255) DEFAULT 'Dynamic Offering',
        shortDesc TEXT NOT NULL,
        longDesc TEXT NOT NULL,
        features TEXT,
        gallery TEXT
      )
    `);

    console.log('Database tables generated successfully.');

    // Automated DB Migration: ensure location column exists
    try {
      await pool.query('ALTER TABLE inquiries ADD COLUMN location VARCHAR(255) DEFAULT ""');
      console.log('Successfully completed inquiries table migration: added location column.');
    } catch (err) {
      // Column might already exist, ignore error
    }

    // Automated DB Migration: ensure inventory columns exist in products table
    try {
      await pool.query('ALTER TABLE products ADD COLUMN inventoryCount INT DEFAULT 100');
    } catch (err) {}
    try {
      await pool.query('ALTER TABLE products ADD COLUMN lowStockThreshold INT DEFAULT 10');
    } catch (err) {}
    try {
      await pool.query('ALTER TABLE products ADD COLUMN supplierEmail VARCHAR(255) DEFAULT "supplier@algani.com"');
    } catch (err) {}

    // Automated DB Migration: ensure convertedToOrder column exists in inquiries table
    try {
      await pool.query('ALTER TABLE inquiries ADD COLUMN convertedToOrder INT DEFAULT 0');
      console.log('Successfully completed inquiries table migration: added convertedToOrder column.');
    } catch (err) {}

    // Automated DB Migration: ensure isDeleted column exists in inquiries table
    try {
      await pool.query('ALTER TABLE inquiries ADD COLUMN isDeleted INT DEFAULT 0');
      console.log('Successfully completed inquiries table migration: added isDeleted column.');
    } catch (err) {}

    // Order management: product display name on inquiries
    try {
      await pool.query('ALTER TABLE inquiries ADD COLUMN productName VARCHAR(255) DEFAULT ""');
      console.log('Successfully completed inquiries table migration: added productName column.');
    } catch (err) {}

    // Order management: link deliveries back to customer inquiries
    try {
      await pool.query('ALTER TABLE orders ADD COLUMN inquiryId VARCHAR(255) DEFAULT NULL');
    } catch (err) {}
    try {
      await pool.query('ALTER TABLE orders ADD COLUMN customerEmail VARCHAR(255) DEFAULT ""');
    } catch (err) {}
    try {
      await pool.query('ALTER TABLE orders ADD COLUMN productName VARCHAR(255) DEFAULT ""');
    } catch (err) {}

    if (isEmailConfigured()) {
      const smtpCheck = await verifySmtpConnection();
      if (smtpCheck.ok) {
        console.log('✉️  Resend email client connected — customer order emails will be sent.');
      } else {
        console.error('✉️  Resend connection failed:', smtpCheck.reason);
        console.error('    Check your RESEND_API_KEY in .env.');
      }
    } else {
      console.warn('✉️  RESEND EMAIL NOT CONFIGURED — customer order/inquiry emails are NOT sent.');
      console.warn('    Add RESEND_API_KEY to your .env file and restart the server.');
    }

    // ── DATABASE SEEDING ──
    await seedDatabase();
    databaseReady = true;
    lastDbError = null;

  } catch (error) {
    lastDbError = error.message || String(error);
    if (pool) await pool.end().catch(() => {});
    pool = null;
    console.error('❌ Database Initialization Failed!');
    console.error(error);
    console.error(
      '\n⚠️ Set MYSQL_URL + DB_SSL=true (TiDB/Render), Railway MYSQL* vars, or DB_* for local MySQL.'
    );
  }
}

// Helper to seed standard tables with realistic high-fidelity data
async function seedDatabase() {
  try {
    // Provision an administrator only with an explicitly configured password.
    // Preserve existing accounts and passwords across application restarts.
    const adminEmail = 'aftab@algani';
    const adminPass = process.env.ADMIN_PASSWORD_1;
    const adminName = 'Syed Mir Aftab';
    const [existingAdmins] = await pool.query('SELECT * FROM admins WHERE email = ?', [adminEmail]);
    const validConfiguredPassword = adminPass && adminPass.length >= 8 && Buffer.byteLength(adminPass, 'utf8') <= 72;
    if (existingAdmins.length === 0 && validConfiguredPassword) {
      console.log('Seeding default administrator credentials for aftab@algani...');
      await pool.query(
        'INSERT INTO admins (id, email, password, displayName) VALUES (?, ?, ?, ?)',
        ['admin-1', adminEmail, await bcrypt.hash(adminPass, 10), adminName]
      );
    } else if (existingAdmins.length > 0 && validConfiguredPassword) {
      const admin = existingAdmins[0];
      const isDbPasswordDefault = await bcrypt.compare('admin123', admin.password);
      if (isDbPasswordDefault || process.env.FORCE_ADMIN_PASSWORD_SYNC === 'true') {
        console.log('Syncing administrator password with ADMIN_PASSWORD_1 environment variable...');
        await pool.query(
          'UPDATE admins SET password = ? WHERE email = ?',
          [await bcrypt.hash(adminPass, 10), adminEmail]
        );
      }
    } else if (existingAdmins.length === 0) {
      console.warn('No administrator provisioned. Configure ADMIN_PASSWORD_1 with 8 characters minimum and at most 72 UTF-8 bytes.');
    }

    // Example stock counts, customers, deliveries and partners are opt-in demo data.
    if (process.env.SEED_DEMO_DATA !== 'true' || process.env.NODE_ENV === 'production') return;

    // B. Seed default stock and visibility profiles for all service products
    const [productRows] = await pool.query('SELECT COUNT(*) as count FROM products');
    const defaultServices = [
      'interior-paneling', 'flooring-solutions', 'modular-kitchens', 'insulation-materials', 'general-commercial-supplies',
      'vending-machine-solutions', 'agriculture-implements', 'laboratory-setup-equipment', 'beekeeping-equipment',
      'furniture-solutions', 'iot-sensor-agri-solutions', 'dairy-equipment-commissioning',
      'fisheries-harvesting-equipment', 'high-density-sensor-systems', 'cold-storage-engineering'
    ];

    if (productRows[0].count === 0) {
      console.log('Seeding default service product profiles...');
      const insertPromises = defaultServices.map((slug, index) => {
        let initialInventory = 100;
        let threshold = 10;
        let status = 'in-stock';
        if (slug === 'insulation-materials') {
          initialInventory = 8;
          status = 'low-stock';
        } else if (slug === 'flooring-solutions') {
          initialInventory = 5;
          status = 'low-stock';
        } else if (slug === 'cold-storage-engineering') {
          initialInventory = 0;
          status = 'out-of-stock';
        } else if (slug === 'beekeeping-equipment') {
          initialInventory = 150;
        } else {
          initialInventory = 30 + (index * 12);
        }
        
        return pool.query(
          'INSERT INTO products (slug, stockStatus, visible, inventoryCount, lowStockThreshold, supplierEmail) VALUES (?, ?, ?, ?, ?, ?)',
          [slug, status, 1, initialInventory, threshold, 'supplier@algani.com']
        );
      });
      await Promise.all(insertPromises);
    } else {
      // Ensure modular-kitchens exists if existing DB was seeded prior
      try {
        await pool.query(
          'INSERT IGNORE INTO products (slug, stockStatus, visible, inventoryCount, lowStockThreshold, supplierEmail) VALUES (?, ?, ?, ?, ?, ?)',
          ['modular-kitchens', 'in-stock', 1, 45, 10, 'supplier@algani.com']
        );
      } catch (e) {}
    }

    // C. Seed realistic inquiries for premium B2B mockup visuals
    const [inquiryRows] = await pool.query('SELECT COUNT(*) as count FROM inquiries');
    if (inquiryRows[0].count === 0) {
      console.log('Seeding high-fidelity mock inquiries...');
      const mockInquiries = [
        {
          id: 'inq-1',
          name: 'Jane Doe',
          email: 'jane@company.com',
          phone: '9876543210',
          subject: 'General',
          service: 'vending-machine-solutions',
          location: 'No Location',
          message: 'Hello! I would like to inquire about bulk ordering vending machines. Thank you!',
          status: 'pending',
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
        },
        {
          id: 'inq-2',
          name: 'amaan',
          email: 'amaan@example.com',
          phone: '7780901374',
          subject: 'CafeVend Espresso',
          service: 'vending-machine-solutions',
          location: 'srinagar',
          message: 'Can you provide quotation for 5 CafeVend Espresso machines to Srinagar location?',
          status: 'pending',
          createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
        },
        {
          id: 'inq-3',
          name: 'Hilal Ahmad',
          email: 'hilal@kashmirdairy.com',
          phone: '+91 94190 12345',
          subject: 'Bulk Milk Processing Plant Setup',
          service: 'dairy-equipment-commissioning',
          location: 'Pulwama',
          message: 'We are looking to set up a 10,000 LPD pasteurization and packing plant in Pulwama. Please share availability and technical consulting charges.',
          status: 'quote_sent',
          createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
        },
        {
          id: 'inq-4',
          name: 'Sajad Dar',
          email: 'sajad@valleycoldchain.in',
          phone: '+91 70061 98765',
          subject: 'Controlled Atmosphere Cold Storage Inquiry',
          service: 'cold-storage-engineering',
          location: 'Sopore',
          message: 'Inquiring about paneling and refrigeration systems for our apple cold storage facility in Sopore. Need a quote for a 5,000 MT capacity setup.',
          status: 'confirmed',
          createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
        }
      ];

      for (const msg of mockInquiries) {
        await pool.query(
          'INSERT INTO inquiries (id, name, email, phone, subject, service, location, message, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [msg.id, msg.name, msg.email, msg.phone, msg.subject, msg.service, msg.location, msg.message, msg.status, msg.createdAt]
        );
      }
    }

    // D. Seed realistic distribution deliveries for B2B dashboards
    const [orderRows] = await pool.query('SELECT COUNT(*) as count FROM orders');
    if (orderRows[0].count === 0) {
      console.log('Seeding B2B distribution orders...');
      const mockOrders = [
        {
          id: 'ord-1',
          clientName: 'Kashmir Agri Farms Ltd',
          service: 'iot-sensor-agri-solutions',
          region: 'Baramulla',
          notes: 'Express delivery for high-density apple orchards microclimate sensors.',
          status: 'new',
          createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
          updatedAt: new Date(Date.now() - 3600000 * 4).toISOString()
        },
        {
          id: 'ord-2',
          clientName: 'Srinagar Beekeeping Cooperative',
          service: 'beekeeping-equipment',
          region: 'Srinagar',
          notes: '150 wooden hive frames and honey extractors distribution route.',
          status: 'approved',
          createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
          updatedAt: new Date(Date.now() - 3600000 * 36).toISOString()
        },
        {
          id: 'ord-3',
          clientName: 'Ladakh Cold Chain Supplies',
          service: 'cold-storage-engineering',
          region: 'Leh / Ladakh',
          notes: 'Polyurethane insulation sandwich panels transport via Zojila Pass.',
          status: 'shipped',
          createdAt: new Date(Date.now() - 3600000 * 120).toISOString(),
          updatedAt: new Date(Date.now() - 3600000 * 96).toISOString()
        }
      ];

      for (const ord of mockOrders) {
        await pool.query(
          'INSERT INTO orders (id, clientName, service, region, notes, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [ord.id, ord.clientName, ord.service, ord.region, ord.notes, ord.status, ord.createdAt, ord.updatedAt]
        );
      }
    }

    // E. Seed corporate partners
    const [partnerRows] = await pool.query('SELECT COUNT(*) as count FROM partners');
    if (partnerRows[0].count === 0) {
      console.log('Seeding corporate partners...');
      await pool.query(
        'INSERT INTO partners (id, name, type, timeAgo, logo, status) VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)',
        [
          'pt-ecocorp', 'ECOCORP', 'Signed contract', '1d ago', '🌾', 'active',
          'pt-natura', 'NATURA FOODS', 'Company Partner', '1d ago', '🌱', 'active',
          'pt-global', 'GLOBAL LOGISTICS', 'Distribution Network', '3d ago', '🌐', 'pending',
          'pt-pureblend', 'PUREBLEND INC.', 'Supplements Principal', '3d ago', '🌿', 'pending'
        ]
      );
    }

  } catch (err) {
    console.error('⚠️ Seeding Failed:', err);
  }
}


// ── API ROUTES ──

// Fetch Corporate Partners List
app.get('/api/partners', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM partners ORDER BY status ASC, name ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch corporate partners' });
  }
});

// Approve Corporate Partner Status
app.put('/api/partners/:id/approve', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE partners SET status = "active" WHERE id = ?', [id]);
    res.json({ success: true, id, status: 'active' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to approve partner' });
  }
});

// Delete/Remove Corporate Partner
app.delete('/api/partners/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM partners WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete partner' });
  }
});

// Add Manually a Corporate Partner
app.post('/api/partners', requireAuth, async (req, res) => {
  let { name, type, logo, status } = req.body;
  
  if (!name || typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 200) {
    return res.status(400).json({ error: 'Partner Name is required and must be under 200 chars' });
  }
  if (type && (typeof type !== 'string' || type.trim().length > 200)) {
    return res.status(400).json({ error: 'Type is too long' });
  }
  if (logo && (typeof logo !== 'string' || logo.trim().length > 50)) {
    return res.status(400).json({ error: 'Logo is too long' });
  }
  if (status && (typeof status !== 'string' || status.trim().length > 50)) {
    return res.status(400).json({ error: 'Status is too long' });
  }

  name = sanitizeInput(name.trim());
  type = type ? sanitizeInput(type.trim()) : '';
  logo = logo ? sanitizeInput(logo.trim()) : '🌐';
  status = status ? sanitizeInput(status.trim()) : 'pending';
  
  const id = 'pt-' + crypto.randomUUID();
  const timeAgo = 'Just now';
  
  try {
    await pool.query(
      'INSERT INTO partners (id, name, type, timeAgo, logo, status) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, type, timeAgo, logo, status]
    );
    res.json({ id, name, type, timeAgo, logo, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add corporate partner' });
  }
});

// Fetch Custom Dynamic Services/Offerings
app.get('/api/custom-services', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM custom_services');
    const formatted = rows.map(r => ({
      ...r,
      features: JSON.parse(r.features || '[]'),
      gallery: JSON.parse(r.gallery || '[]')
    }));
    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch custom services' });
  }
});

// Add Manually a Custom Service/Offering & matching catalog product record
app.put('/api/custom-services/:slug', requireAuth, async (req, res) => {
  const { name, category, shortDesc, longDesc, features = [], gallery = [] } = req.body;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(req.params.slug) || req.params.slug.length > 200) return res.status(400).json({ error: 'Invalid offering URL' });
  for (const [value, limit] of [[name,200],[category,200],[shortDesc,1000],[longDesc,5000]]) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > limit) return res.status(400).json({ error: 'Offering fields are missing or exceed their length limits' });
  }
  if (!Array.isArray(features) || features.length > 30 || features.some(f => typeof f !== 'string' || f.length > 500)) return res.status(400).json({ error: 'Use at most 30 features, each under 500 characters' });
  if (!Array.isArray(gallery) || gallery.length > 20 || gallery.some(image => {
    const value = typeof image === 'string' ? image : image?.url;
    try { return typeof value !== 'string' || value.length > 2048 || !['http:','https:'].includes(new URL(value).protocol); } catch { return true; }
  })) return res.status(400).json({ error: 'Use at most 20 valid HTTP or HTTPS image URLs' });
  try {
    const [rows] = await pool.query('SELECT slug FROM custom_services WHERE slug = ?', [req.params.slug]);
    if (!rows.length) {
      // A saved definition can override a built-in offering without replacing its stock profile.
      await pool.query('INSERT INTO custom_services (slug, name, category, shortDesc, longDesc, features, gallery, tag) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [req.params.slug, name.trim(), category.trim(), shortDesc.trim(), longDesc.trim(), JSON.stringify(features), JSON.stringify(gallery), 'Offering']);
    } else {
      await pool.query('UPDATE custom_services SET name = ?, category = ?, shortDesc = ?, longDesc = ?, features = ?, gallery = ? WHERE slug = ?', [name.trim(), category.trim(), shortDesc.trim(), longDesc.trim(), JSON.stringify(features), JSON.stringify(gallery), req.params.slug]);
    }
    res.json({ success:true, slug:req.params.slug });
  } catch (error) { console.error(error); res.status(500).json({ error: 'Unable to save offering details' }); }
});

app.post('/api/custom-services', requireAuth, async (req, res) => {
  let { name, category, icon, shortDesc, longDesc, features, gallery, inventoryCount, lowStockThreshold } = req.body;
  if (!name || !category || !shortDesc || !longDesc) {
    return res.status(400).json({ error: 'Name, Category, Short Description, and Long Description are required' });
  }
  
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 200 ||
      typeof category !== 'string' || !category.trim() || category.trim().length > 200 ||
      typeof shortDesc !== 'string' || !shortDesc.trim() || shortDesc.trim().length > 1000 ||
      typeof longDesc !== 'string' || !longDesc.trim() || longDesc.trim().length > 5000) {
    return res.status(400).json({ error: 'Inputs are invalid or exceed length limits' });
  }

  if (features && !Array.isArray(features)) {
    return res.status(400).json({ error: 'Features must be an array' });
  }
  if (gallery && !Array.isArray(gallery)) {
    return res.status(400).json({ error: 'Gallery must be an array' });
  }
  const inventoryError = validateInventory({ inventoryCount, lowStockThreshold });
  if (inventoryError) return res.status(400).json({ error: inventoryError });
  if (icon !== undefined && (typeof icon !== 'string' || [...icon].length > 10)) {
    return res.status(400).json({ error: 'Icon must contain at most 10 characters' });
  }
  if ((features || []).length > 30 || (features || []).some(f => typeof f !== 'string' || f.length > 500)) {
    return res.status(400).json({ error: 'Features must contain at most 30 text entries of 500 characters each' });
  }
  if ((gallery || []).length > 20 || (gallery || []).some(g => {
    const url = typeof g === 'string' ? g : g?.url;
    try { return typeof url !== 'string' || url.length > 2048 || !['https:', 'http:'].includes(new URL(url).protocol); }
    catch { return true; }
  })) {
    return res.status(400).json({ error: 'Gallery must contain at most 20 valid HTTP or HTTPS image URLs' });
  }

  name = sanitizeInput(name.trim());
  category = sanitizeInput(category.trim());
  icon = icon ? sanitizeInput(String(icon).trim()) : '📦';
  shortDesc = sanitizeInput(shortDesc.trim());
  longDesc = sanitizeInput(longDesc.trim());

  const sanitizedFeatures = (features || []).map(f => (typeof f === 'string' ? sanitizeInput(f) : ''));
  const sanitizedGallery = (gallery || []).map(g => {
    if (g && typeof g === 'object') {
      return {
        caption: g.caption ? sanitizeInput(String(g.caption)) : '',
        url: g.url ? sanitizeInput(String(g.url)) : ''
      };
    }
    return typeof g === 'string' ? sanitizeInput(g) : '';
  });

  const slug = name.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
    
  const tag = 'Dynamic Offering';
  if (!slug) return res.status(400).json({ error: 'Offering name must include a letter or number for its URL' });
  const featuresJSON = JSON.stringify(sanitizedFeatures);
  const galleryJSON = JSON.stringify(sanitizedGallery);
  
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    // Save the offering and its inventory profile atomically.
    await connection.query(
      'INSERT INTO custom_services (slug, name, icon, category, tag, shortDesc, longDesc, features, gallery) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [slug, name, icon, category, tag, shortDesc, longDesc, featuresJSON, galleryJSON]
    );
    
    // 2. Synchronize with products table for inventory catalog status tracking
    const count = inventoryCount ?? 0;
    const threshold = lowStockThreshold ?? 10;
    await connection.query(
      'INSERT INTO products (slug, stockStatus, visible, inventoryCount, lowStockThreshold, supplierEmail) VALUES (?, ?, 1, ?, ?, "")',
      [slug, count === 0 ? 'out-of-stock' : count <= threshold ? 'low-stock' : 'in-stock', count, threshold]
    );
    
    await connection.commit();
    res.status(201).json({ success: true, slug, name });
  } catch (err) {
    if (connection) await connection.rollback().catch(() => {});
    console.error(err);
    res.status(err.code === 'ER_DUP_ENTRY' ? 409 : 500).json({ error: err.code === 'ER_DUP_ENTRY' ? 'An offering with this name or URL already exists.' : 'Failed to create new catalog offering.' });
  } finally {
    connection?.release();
  }
});

// 1. Authenticate Admin Login
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (email.length > 250 || password.length > 250) {
    return res.status(400).json({ error: 'Inputs exceed maximum length' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM admins WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ code: 'auth/invalid-credential', error: 'Invalid email or password.' });
    }

    const admin = rows[0];
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ code: 'auth/invalid-credential', error: 'Invalid email or password.' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: admin.id, email: admin.email, displayName: admin.displayName },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    // Success response returning user data + JWT token
    res.json({
      uid: admin.id,
      email: admin.email,
      displayName: admin.displayName,
      token
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server login transaction failed' });
  }
});

// 2. Fetch Customer Inquiries List
app.get('/api/inquiries', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM inquiries ORDER BY createdAt DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch inquiries' });
  }
});

// 3. Submit Customer Inquiry (order request — status: pending)
app.post('/api/inquiries', contactLimiter, async (req, res) => {
  let { name, email, phone, subject, service, location, message, productName } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required' });
  }

  // Validate types & lengths
  if (typeof name !== 'string' || name.trim().length > 200 || name.trim().length === 0) {
    return res.status(400).json({ error: 'Invalid name' });
  }
  if (typeof email !== 'string' || email.trim().length > 250 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  if (typeof message !== 'string' || message.trim().length > 5000 || message.trim().length === 0) {
    return res.status(400).json({ error: 'Invalid message content' });
  }
  if (phone && (typeof phone !== 'string' || phone.trim().length > 50)) {
    return res.status(400).json({ error: 'Phone number is too long' });
  }
  if (subject && (typeof subject !== 'string' || subject.trim().length > 200)) {
    return res.status(400).json({ error: 'Subject is too long' });
  }
  if (service && (typeof service !== 'string' || service.trim().length > 200)) {
    return res.status(400).json({ error: 'Service slug is too long' });
  }
  if (location && (typeof location !== 'string' || location.trim().length > 200)) {
    return res.status(400).json({ error: 'Location is too long' });
  }
  if (productName && (typeof productName !== 'string' || productName.trim().length > 200)) {
    return res.status(400).json({ error: 'Product name is too long' });
  }

  // Clean inputs
  name = sanitizeInput(name.trim());
  email = email.trim();
  message = sanitizeInput(message.trim());
  phone = phone ? sanitizeInput(phone.trim()) : '';
  subject = subject ? sanitizeInput(subject.trim()) : '';
  service = service ? sanitizeInput(service.trim()) : '';
  location = location ? sanitizeInput(location.trim()) : '';
  productName = productName ? sanitizeInput(productName.trim()) : '';

  try {
    const id = 'inq-' + crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const storedProductName = productName || slugToDisplayName(service);

    await pool.query(
      'INSERT INTO inquiries (id, name, email, phone, subject, service, location, message, status, createdAt, productName) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, email, phone, subject, service, location, message, 'pending', createdAt, storedProductName]
    );

    // An inquiry is a request for a quote, not a stock reservation.
    enqueueOrderStatusEmail({
        to: email,
        customerName: name,
        productName: storedProductName,
        statusKey: 'pending',
    });

    res.status(201).json({
      id,
      name,
      email,
      phone,
      subject,
      service,
      location,
      message,
      status: 'pending',
      createdAt,
      productName: storedProductName,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save customer inquiry' });
  }
});

// 4. Update Inquiry Read Status
app.put('/api/inquiries/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  let { status, convertedToOrder, isDeleted } = req.body;
  if (status !== undefined && !INQUIRY_STATUSES.has(status)) {
    return res.status(400).json({ error: 'Invalid inquiry status' });
  }
  if ((convertedToOrder !== undefined && !isBoolean(convertedToOrder)) ||
      (isDeleted !== undefined && !isBoolean(isDeleted))) {
    return res.status(400).json({ error: 'Inquiry flags must be true or false' });
  }
  
  try {
    const [rows] = await pool.query('SELECT * FROM inquiries WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Inquiry not found' });
    }
    
    const inquiry = rows[0];
    const previousStatus = (inquiry.status || 'pending').toLowerCase();
    
    // Validation
    if (status !== undefined) {
      if (typeof status !== 'string' || status.trim().length > 50) {
        return res.status(400).json({ error: 'Invalid status value' });
      }
      status = sanitizeInput(status.trim());
    }

    const dbStatus = status !== undefined ? status : inquiry.status;
    const dbConverted = convertedToOrder !== undefined ? (convertedToOrder ? 1 : 0) : inquiry.convertedToOrder;
    const dbDeleted = isDeleted !== undefined ? (isDeleted ? 1 : 0) : inquiry.isDeleted;
    
    await pool.query(
      'UPDATE inquiries SET status = ?, convertedToOrder = ?, isDeleted = ? WHERE id = ?',
      [dbStatus, dbConverted, dbDeleted, id]
    );

    if (dbStatus === 'accepted' && previousStatus !== 'accepted') {
      const resolvedProductName = await resolveProductName(pool, {
        slug: inquiry.service,
        productName: inquiry.productName,
      });
      try {
        enqueueOrderStatusEmail({
          to: inquiry.email,
          customerName: inquiry.name,
          productName: resolvedProductName,
          statusKey: 'accepted',
        });
      } catch (mailErr) {
        console.error('[email] Failed to send acceptance email:', mailErr);
      }
    }

    res.json({ success: true, id, status: dbStatus, convertedToOrder: dbConverted, isDeleted: dbDeleted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update inquiry' });
  }
});

// 4b. Hard-Delete Inquiry (removes from inbox but preserves chart stats)
app.delete('/api/inquiries/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM inquiries WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Inquiry not found' });
    }

    const inquiry = rows[0];

    // ── Preserve chart data before deleting ──
    // Ensure the inquiry_stats table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inquiry_stats (
        id VARCHAR(64) PRIMARY KEY,
        service VARCHAR(255),
        status VARCHAR(64),
        createdAt VARCHAR(64),
        deletedAt VARCHAR(64)
      )
    `).catch(() => {});

    // Insert a lightweight stat record so charts still count this inquiry
    await pool.query(
      'INSERT IGNORE INTO inquiry_stats (id, service, status, createdAt, deletedAt) VALUES (?, ?, ?, ?, ?)',
      [inquiry.id, inquiry.service || null, inquiry.status || 'pending', inquiry.createdAt, new Date().toISOString()]
    ).catch(() => {});

    // Hard-delete the inquiry row
    await pool.query('DELETE FROM inquiries WHERE id = ?', [id]);

    res.json({ success: true, id, deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete inquiry' });
  }
});


// 5. Fetch B2B Orders List
app.get('/api/orders', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM orders ORDER BY createdAt DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch distribution orders' });
  }
});

// 6. Schedule New Delivery Order
app.post('/api/orders', requireAuth, async (req, res) => {
  let {
    clientName,
    service,
    region,
    notes,
    inquiryId,
    customerEmail,
    productName,
  } = req.body;
  if (!clientName || !service || !region) {
    return res.status(400).json({ error: 'Client name, service slug, and operating region are required' });
  }

  // Validate inputs
  if (typeof clientName !== 'string' || !clientName.trim() || clientName.trim().length > 200 ||
      typeof service !== 'string' || !service.trim() || service.trim().length > 200 ||
      typeof region !== 'string' || !region.trim() || region.trim().length > 200) {
    return res.status(400).json({ error: 'Invalid client name, service, or region' });
  }
  if (notes && (typeof notes !== 'string' || notes.trim().length > 5000)) {
    return res.status(400).json({ error: 'Notes are too long' });
  }
  if (customerEmail && (typeof customerEmail !== 'string' || !isEmail(customerEmail.trim()))) {
    return res.status(400).json({ error: 'Invalid customer email' });
  }
  if (inquiryId !== undefined && inquiryId !== null &&
      (typeof inquiryId !== 'string' || !/^inq-[a-zA-Z0-9-]+$/.test(inquiryId) || inquiryId.length > 255)) {
    return res.status(400).json({ error: 'Invalid inquiry reference' });
  }
  if (productName && (typeof productName !== 'string' || productName.trim().length > 200)) {
    return res.status(400).json({ error: 'Product name is too long' });
  }

  clientName = sanitizeInput(clientName.trim());
  service = sanitizeInput(service.trim());
  region = sanitizeInput(region.trim());
  notes = notes ? sanitizeInput(notes.trim()) : '';
  customerEmail = customerEmail ? customerEmail.trim() : '';
  productName = productName ? sanitizeInput(productName.trim()) : '';

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    if (inquiryId) {
      const [inquiries] = await connection.query('SELECT * FROM inquiries WHERE id = ? FOR UPDATE', [inquiryId]);
      if (!inquiries.length || inquiries[0].isDeleted) {
        await connection.rollback();
        return res.status(404).json({ error: 'Inquiry not found' });
      }
      const [linkedOrders] = await connection.query('SELECT id FROM orders WHERE inquiryId = ? LIMIT 1', [inquiryId]);
      if (inquiries[0].convertedToOrder || linkedOrders.length) {
        await connection.rollback();
        return res.status(409).json({ error: 'This inquiry already has a delivery order' });
      }
      customerEmail = customerEmail || inquiries[0].email;
    }
    const id = 'ord-' + crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const resolvedProductName = await resolveProductName(connection, { slug: service, productName });
    
    await connection.query(
      'INSERT INTO orders (id, clientName, service, region, notes, status, createdAt, updatedAt, inquiryId, customerEmail, productName) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        clientName,
        service,
        region,
        notes,
        'new',
        createdAt,
        createdAt,
        inquiryId || null,
        customerEmail || '',
        resolvedProductName,
      ]
    );
    if (inquiryId) {
      await connection.query('UPDATE inquiries SET convertedToOrder = 1 WHERE id = ?', [inquiryId]);
    }
    await connection.commit();
    // Stock changes require confirmed quantities; this delivery form does not collect them.

    res.status(201).json({
      id,
      clientName,
      service,
      region,
      notes,
      status: 'new',
      createdAt,
      updatedAt: createdAt,
      inquiryId: inquiryId || null,
      customerEmail: customerEmail || '',
      productName: resolvedProductName,
    });
  } catch (err) {
    if (connection) await connection.rollback().catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'Failed to schedule delivery order' });
  } finally {
    connection?.release();
  }
});

// Resolve customer email/name and product label for delivery order notifications
async function resolveOrderCustomerContext(pool, order) {
  let customerEmail = order.customerEmail;
  let customerName = order.clientName;
  let productName = order.productName;

  if (order.inquiryId) {
    const [inqRows] = await pool.query('SELECT * FROM inquiries WHERE id = ?', [order.inquiryId]);
    if (inqRows.length > 0) {
      const inq = inqRows[0];
      customerEmail = customerEmail || inq.email;
      customerName = customerName || inq.name;
      productName = productName || inq.productName;
    }
  }

  const resolvedProductName = await resolveProductName(pool, {
    slug: order.service,
    productName,
  });

  return { customerEmail, customerName, productName: resolvedProductName };
}

// 7. Update Delivery Order Fulfillment Status
app.put('/api/orders/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  let { status } = req.body;
  const updatedAt = new Date().toISOString();
  if (!ORDER_STATUSES.has(status)) {
    return res.status(400).json({ error: 'Status must be new, approved, shipped, or delivered' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [rows] = await connection.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [id]);
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = rows[0];
    const previousStatus = (order.status || '').toLowerCase();
    
    if (status !== undefined) {
      if (typeof status !== 'string' || status.trim().length > 50) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      status = sanitizeInput(status.trim());
    }
    const nextStatus = (status || '').toLowerCase();

    await connection.query('UPDATE orders SET status = ?, updatedAt = ? WHERE id = ?', [status, updatedAt, id]);

    const shouldApprove = nextStatus === 'approved' && previousStatus !== 'approved';
    const shouldDeliver = nextStatus === 'delivered' && previousStatus !== 'delivered';
    if (shouldDeliver && order.inquiryId) {
      await connection.query('UPDATE inquiries SET status = ? WHERE id = ?', ['delivered', order.inquiryId]);
    }
    await connection.commit();

    if (shouldApprove || shouldDeliver) {
      try {
        const customerCtx = await resolveOrderCustomerContext(pool, order);

        if (shouldApprove) {
          enqueueOrderStatusEmail({
            to: customerCtx.customerEmail,
            customerName: customerCtx.customerName,
            productName: customerCtx.productName,
            statusKey: 'approved',
          });
        }

        if (shouldDeliver) {
          enqueueOrderStatusEmail({
            to: customerCtx.customerEmail,
            customerName: customerCtx.customerName,
            productName: customerCtx.productName,
            statusKey: 'delivered',
          });
        }
      } catch (err) {
        console.error('[email] Order notification task failed:', err);
      }
    }

    res.json({ success: true, id, status, updatedAt });
  } catch (err) {
    if (connection) await connection.rollback().catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'Failed to update delivery status' });
  } finally {
    connection?.release();
  }
});

// 8a. Public-safe product visibility (no sensitive inventory/supplier data)
app.get('/api/products/public', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT slug, stockStatus, visible FROM products');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch product visibility' });
  }
});

// 8. Fetch Product Visibility & Stock Configuration (Admin Only)
app.get('/api/products', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch product stock profiles' });
  }
});

// 9. Update/Save Product Stock Inventory Status and Site Visibility
app.put('/api/products/:slug', requireAuth, async (req, res) => {
  const { slug } = req.params;
  let { stockStatus, visible, inventoryCount, lowStockThreshold, supplierEmail } = req.body;
  const inventoryError = validateInventory(req.body);
  if (inventoryError) return res.status(400).json({ error: inventoryError });
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 200) {
    return res.status(400).json({ error: 'Invalid product slug' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE slug = ?', [slug]);
    
    if (stockStatus !== undefined) {
      if (typeof stockStatus !== 'string' || stockStatus.trim().length > 50) {
        return res.status(400).json({ error: 'Invalid stock status' });
      }
      stockStatus = sanitizeInput(stockStatus.trim());
    }
    if (supplierEmail !== undefined) {
      if (typeof supplierEmail !== 'string' || supplierEmail.trim().length > 250) {
        return res.status(400).json({ error: 'Invalid supplier email' });
      }
      supplierEmail = supplierEmail.trim();
    }

    if (rows.length === 0) {
      const dbStatus = stockStatus || 'out-of-stock';
      const dbVisible = visible !== undefined ? (visible ? 1 : 0) : 1;
      const dbInventory = inventoryCount !== undefined ? parseInt(inventoryCount) : 0;
      const dbThreshold = lowStockThreshold !== undefined ? parseInt(lowStockThreshold) : 10;
      const dbEmail = supplierEmail || '';
      
      await pool.query(
        'INSERT INTO products (slug, stockStatus, visible, inventoryCount, lowStockThreshold, supplierEmail) VALUES (?, ?, ?, ?, ?, ?)',
        [slug, dbStatus, dbVisible, dbInventory, dbThreshold, dbEmail]
      );
    } else {
      const product = rows[0];
      const dbStatus = stockStatus !== undefined ? stockStatus : product.stockStatus;
      const dbVisible = visible !== undefined ? (visible ? 1 : 0) : product.visible;
      const dbInventory = inventoryCount !== undefined ? parseInt(inventoryCount) : product.inventoryCount;
      const dbThreshold = lowStockThreshold !== undefined ? parseInt(lowStockThreshold) : product.lowStockThreshold;
      const dbEmail = supplierEmail !== undefined ? supplierEmail : product.supplierEmail;
      
      await pool.query(
        'UPDATE products SET stockStatus = ?, visible = ?, inventoryCount = ?, lowStockThreshold = ?, supplierEmail = ? WHERE slug = ?',
        [dbStatus, dbVisible, dbInventory, dbThreshold, dbEmail, slug]
      );
    }

    res.json({ success: true, slug, stockStatus, visible, inventoryCount, lowStockThreshold, supplierEmail });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update product settings' });
  }
});

// 9b. Fetch Inventory Alerts
app.get('/api/alerts', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM inventory_alerts ORDER BY createdAt DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch inventory alerts' });
  }
});

// 9c. Mark Alert as Read
app.put('/api/alerts/:id/read', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE inventory_alerts SET status = "read" WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update alert status' });
  }
});

// 10. Update Admin Password
app.put('/api/auth/change-password', requireAuth, async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;
  if (!email || !currentPassword || !newPassword || 
      typeof email !== 'string' || typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (email.length > 250 || currentPassword.length > 250 || newPassword.length > 250) {
    return res.status(400).json({ error: 'Inputs exceed maximum length' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long' });
  }
  if (Buffer.byteLength(newPassword, 'utf8') > 72) {
    return res.status(400).json({ error: 'New password must be at most 72 UTF-8 bytes' });
  }
  if (email !== req.admin.email) {
    return res.status(403).json({ error: 'You can only change your own password' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM admins WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Admin account not found' });
    }

    const admin = rows[0];
    const isPasswordValid = await bcrypt.compare(currentPassword, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE admins SET password = ? WHERE email = ?', [hashedNewPassword, email]);
    res.json({ success: true, message: 'Password updated successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server transaction failed' });
  }
});


// Dedicated Search Engine Crawler Endpoints
app.get('/robots.txt', (req, res) => {
  const robotsPath = path.join(FRONTEND_DIST, 'robots.txt');
  if (fs.existsSync(robotsPath)) {
    res.type('text/plain').sendFile(robotsPath);
  } else {
    res.type('text/plain').send('User-agent: *\nAllow: /\n\nUser-agent: Googlebot\nAllow: /\n\nUser-agent: Googlebot-Image\nAllow: /\n\nSitemap: https://www.algani.co.in/sitemap.xml\n');
  }
});

const publicPages = () => import('./lib/public-pages.mjs');
let searchCatalogCache = null;
async function searchCatalog() {
 const pages = await publicPages();
 if (!databaseReady || !pool) return pages.catalog();
 if (searchCatalogCache && Date.now() - searchCatalogCache.time < 30000) return searchCatalogCache.items;
 try {
  const [[custom], [products]] = await Promise.all([pool.query('SELECT * FROM custom_services'), pool.query('SELECT slug, visible FROM products')]);
  const items = pages.catalog(custom, products);
  searchCatalogCache = { time: Date.now(), items };
  return items;
 } catch { return searchCatalogCache?.items || pages.catalog(); }
}
app.get('/sitemap.xml', async (req, res, next) => {
 try { const pages = await publicPages(); res.type('application/xml').send(pages.sitemap(await searchCatalog())); }
 catch (error) { next(error); }
});
app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found' }));
app.use(express.static(FRONTEND_DIST, { index: false }));
app.use(async (req, res, next) => {
 if (!['GET', 'HEAD'].includes(req.method)) return res.status(405).send('Method not allowed');
 if (req.path.includes('.')) return res.status(404).send('Not found');
 try {
  const template = await fs.promises.readFile(path.join(FRONTEND_DIST, 'index.html'), 'utf8');
  const pages = await publicPages();
  const result = pages.renderPublicPage(template, req.path, await searchCatalog());
  if (result.noindex) res.set('X-Robots-Tag', 'noindex, follow');
  res.status(result.status).type('html').send(result.html);
 } catch (error) { next(error); }
});

// Global error handling middleware (prevents stack trace disclosure)
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body contains invalid JSON' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large' });
  }
  console.error('[Error Handler]', err);
  res.status(500).json({
    error: 'An unexpected internal server error occurred.',
    detail: process.env.NODE_ENV !== 'production' ? (err.message || String(err)) : undefined
  });
});

// Listen immediately (Render health check); init DB in background.
function startServer() {
  return app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
  initDatabase().catch((err) => {
    lastDbError = err.message || String(err);
    console.error('Database init failed:', err);
  });
  });
}

if (require.main === module) startServer();
module.exports = { app, startServer };
