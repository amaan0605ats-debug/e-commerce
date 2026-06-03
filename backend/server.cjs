const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');
const {
  resolveProductName,
  sendOrderStatusEmail,
  enqueueOrderStatusEmail,
  slugToDisplayName,
  isEmailConfigured,
  verifySmtpConnection,
} = require('./lib/emailService.cjs');

// Load environment variables from repo root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');

const app = express();
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Parse DB_HOST/DB_*, Railway MYSQL* vars, or cloud MYSQL_URL (TiDB, Railway, etc.)
function parseDbConfig() {
  const rawUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;
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
let lastDbError = null;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  // Always 200 so Render health checks pass while TiDB is still connecting
  res.status(200).json({
    ok: Boolean(pool),
    database: Boolean(pool),
    smtp: isEmailConfigured(),
    ...(pool
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
  if (req.path.startsWith('/api') && req.path !== '/api/health' && !pool) {
    return res.status(503).json({
      code: 'auth/database-error',
      error:
        'Database not connected. Set MYSQL_URL (TiDB/Render) or Railway MySQL variables, then redeploy.',
      detail: lastDbError || undefined,
    });
  }
  next();
});

// ── DATABASE INITIALIZATION & SCHEMA CREATION ──
async function initDatabase() {
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
      await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
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
        console.log('✉️  SMTP connected — customer order emails will be sent.');
      } else {
        console.error('✉️  SMTP login failed:', smtpCheck.reason);
        console.error('    Fix SMTP_USER / SMTP_PASS in .env (Gmail needs an App Password).');
      }
    } else {
      console.warn('✉️  SMTP NOT CONFIGURED — contact/accept/delivered emails are NOT sent.');
      console.warn('    Add SMTP_PASS (Gmail App Password) to .env and restart.');
    }

    // ── DATABASE SEEDING ──
    await seedDatabase();

  } catch (error) {
    lastDbError = error.message || String(error);
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
    // A. Seed default administrator credentials
    // Clear out any legacy admin credentials whose email is not aftab@algani
    await pool.query('DELETE FROM admins WHERE email != ?', ['aftab@algani']);

    // Check if aftab@algani exists
    const [adminRows] = await pool.query('SELECT COUNT(*) as count FROM admins WHERE email = ?', ['aftab@algani']);
    if (adminRows[0].count === 0) {
      console.log('Seeding default administrator credentials for aftab@algani...');
      
      const adminEmail = 'aftab@algani';
      const adminPass = process.env.ADMIN_PASSWORD_1 || 'admin123';
      const adminName = 'Syed Mir Aftab';
      
      const hashedPassword = bcrypt.hashSync(adminPass, 10);
      
      await pool.query(
        'INSERT INTO admins (id, email, password, displayName) VALUES (?, ?, ?, ?)',
        ['admin-1', adminEmail, hashedPassword, adminName]
      );
    }

    // B. Seed default stock and visibility profiles for all 14 service products
    const [productRows] = await pool.query('SELECT COUNT(*) as count FROM products');
    if (productRows[0].count === 0) {
      console.log('Seeding default service product profiles...');
      const services = [
        'interior-paneling', 'flooring-solutions', 'insulation-materials', 'general-commercial-supplies',
        'vending-machine-solutions', 'agriculture-implements', 'laboratory-setup-equipment', 'beekeeping-equipment',
        'furniture-solutions', 'iot-sensor-agri-solutions', 'dairy-equipment-commissioning',
        'fisheries-harvesting-equipment', 'high-density-sensor-systems', 'cold-storage-engineering'
      ];
      
      const insertPromises = services.map((slug, index) => {
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
app.get('/api/partners', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM partners ORDER BY status ASC, name ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch corporate partners' });
  }
});

// Approve Corporate Partner Status
app.put('/api/partners/:id/approve', async (req, res) => {
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
app.delete('/api/partners/:id', async (req, res) => {
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
app.post('/api/partners', async (req, res) => {
  const { name, type, logo, status } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Partner Name is required' });
  }
  const id = 'pt-' + Math.random().toString(36).substr(2, 9);
  const timeAgo = 'Just now';
  const partnerLogo = logo || '🌐';
  const partnerStatus = status || 'pending';
  
  try {
    await pool.query(
      'INSERT INTO partners (id, name, type, timeAgo, logo, status) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, type || '', timeAgo, partnerLogo, partnerStatus]
    );
    res.json({ id, name, type, timeAgo, logo: partnerLogo, status: partnerStatus });
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
app.post('/api/custom-services', async (req, res) => {
  const { name, category, icon, shortDesc, longDesc, features, gallery, inventoryCount, lowStockThreshold } = req.body;
  if (!name || !category || !shortDesc || !longDesc) {
    return res.status(400).json({ error: 'Name, Category, Short Description, and Long Description are required' });
  }
  
  const slug = name.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
    
  const tag = 'Dynamic Offering';
  const featuresJSON = JSON.stringify(features || []);
  const galleryJSON = JSON.stringify(gallery || []);
  const customIcon = icon || '📦';
  
  try {
    // 1. Save offering to custom_services table
    await pool.query(
      'INSERT INTO custom_services (slug, name, icon, category, tag, shortDesc, longDesc, features, gallery) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [slug, name, customIcon, category, tag, shortDesc, longDesc, featuresJSON, galleryJSON]
    );
    
    // 2. Synchronize with products table for inventory catalog status tracking
    await pool.query(
      'INSERT INTO products (slug, stockStatus, visible, inventoryCount, lowStockThreshold, supplierEmail) VALUES (?, "in-stock", 1, ?, ?, "supplier@algani.com")',
      [slug, parseInt(inventoryCount) || 100, parseInt(lowStockThreshold) || 10]
    );
    
    res.json({ success: true, slug, name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create new catalog offering. Slug might already exist.' });
  }
});

// 1. Authenticate Admin Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (email !== 'aftab@algani') {
    return res.status(401).json({ code: 'auth/user-not-found', error: 'No account found with this email.' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM admins WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ code: 'auth/user-not-found', error: 'No account found with this email.' });
    }

    const admin = rows[0];
    const isPasswordValid = bcrypt.compareSync(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ code: 'auth/wrong-password', error: 'Incorrect password.' });
    }

    // Success response returning user data (simulates Firebase auth payload)
    res.json({
      uid: admin.id,
      email: admin.email,
      displayName: admin.displayName
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server login transaction failed' });
  }
});

// Helper to automatically decrement inventory count and trigger low stock alerts
async function decrementInventory(slug, decrement = 5) {
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE slug = ?', [slug]);
    if (rows.length === 0) return;
    
    const product = rows[0];
    const currentInventory = product.inventoryCount !== null ? product.inventoryCount : 100;
    const threshold = product.lowStockThreshold !== null ? product.lowStockThreshold : 10;
    
    let newInventory = currentInventory - decrement;
    if (newInventory < 0) newInventory = 0;
    
    let newStatus = product.stockStatus || 'in-stock';
    if (newInventory === 0) {
      newStatus = 'out-of-stock';
    } else if (newInventory <= threshold) {
      newStatus = 'low-stock';
    }
    
    await pool.query(
      'UPDATE products SET inventoryCount = ?, stockStatus = ? WHERE slug = ?',
      [newInventory, newStatus, slug]
    );
    console.log(`[INVENTORY] Decremented ${slug} by ${decrement}. New level: ${newInventory}/${currentInventory} (${newStatus})`);
    
    // Trigger alert if we crossed the threshold
    if (newInventory <= threshold && currentInventory > threshold) {
      const email = product.supplierEmail || 'supplier@algani.com';
      const alertId = 'alt-' + Math.random().toString(36).substr(2, 9);
      const createdAt = new Date().toISOString();
      const alertMessage = `CRITICAL: Stock for service/product '${slug}' has dropped to ${newInventory} (Threshold: ${threshold}). Please arrange urgent resupply dispatch.`;
      
      await pool.query(
        'INSERT INTO inventory_alerts (id, slug, message, emailSentTo, status, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [alertId, slug, alertMessage, email, 'unread', createdAt]
      );
      
      console.log(`\n======================================================`);
      console.log(`⚠️  [LOW-STOCK ALERT TRIGGERED]`);
      console.log(`🚨 Product: ${slug}`);
      console.log(`📉 Current Level: ${newInventory} units (Threshold: ${threshold})`);
      console.log(`📧 Simulated Email Alert Sent To Supplier: ${email}`);
      console.log(`======================================================\n`);
    }
  } catch (err) {
    console.error('Error in decrementInventory:', err);
  }
}

// 2. Fetch Customer Inquiries List
app.get('/api/inquiries', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM inquiries ORDER BY createdAt DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch inquiries' });
  }
});

// 3. Submit Customer Inquiry (order request — status: pending)
app.post('/api/inquiries', async (req, res) => {
  const { name, email, phone, subject, service, location, message, productName } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required' });
  }

  try {
    const id = 'inq-' + Math.random().toString(36).substr(2, 9);
    const createdAt = new Date().toISOString();
    const storedProductName =
      (productName && String(productName).trim()) || slugToDisplayName(service);

    await pool.query(
      'INSERT INTO inquiries (id, name, email, phone, subject, service, location, message, status, createdAt, productName) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, email, phone || '', subject || '', service || '', location || '', message, 'pending', createdAt, storedProductName]
    );

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

    setImmediate(async () => {
      if (service) {
        try {
          await decrementInventory(service, 5);
        } catch (err) {
          console.error('[inventory] decrement after inquiry failed:', err);
        }
      }
      const emailProductName = await resolveProductName(pool, { slug: service, productName });
      enqueueOrderStatusEmail({
        to: email,
        customerName: name,
        productName: emailProductName,
        statusKey: 'pending',
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save customer inquiry' });
  }
});

// 4. Update Inquiry Read Status
app.put('/api/inquiries/:id', async (req, res) => {
  const { id } = req.params;
  const { status, convertedToOrder, isDeleted } = req.body;
  
  try {
    const [rows] = await pool.query('SELECT * FROM inquiries WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Inquiry not found' });
    }
    
    const inquiry = rows[0];
    const previousStatus = (inquiry.status || 'pending').toLowerCase();
    const dbStatus = status !== undefined ? status : inquiry.status;
    const dbConverted = convertedToOrder !== undefined ? (convertedToOrder ? 1 : 0) : inquiry.convertedToOrder;
    const dbDeleted = isDeleted !== undefined ? (isDeleted ? 1 : 0) : inquiry.isDeleted;
    
    await pool.query(
      'UPDATE inquiries SET status = ?, convertedToOrder = ?, isDeleted = ? WHERE id = ?',
      [dbStatus, dbConverted, dbDeleted, id]
    );

    res.json({ success: true, id, status: dbStatus, convertedToOrder: dbConverted, isDeleted: dbDeleted });

    if (dbStatus === 'accepted' && previousStatus !== 'accepted') {
      const inquirySnapshot = { ...inquiry };
      setImmediate(async () => {
        const resolvedProductName = await resolveProductName(pool, {
          slug: inquirySnapshot.service,
          productName: inquirySnapshot.productName,
        });
        enqueueOrderStatusEmail({
          to: inquirySnapshot.email,
          customerName: inquirySnapshot.name,
          productName: resolvedProductName,
          statusKey: 'accepted',
        });
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update inquiry' });
  }
});

// 4b. Hard-Delete Inquiry (removes from inbox but preserves chart stats)
app.delete('/api/inquiries/:id', async (req, res) => {
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
app.get('/api/orders', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM orders ORDER BY createdAt DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch distribution orders' });
  }
});

// 6. Schedule New Delivery Order
app.post('/api/orders', async (req, res) => {
  const {
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

  try {
    const id = 'ord-' + Math.random().toString(36).substr(2, 9);
    const createdAt = new Date().toISOString();
    const resolvedProductName = await resolveProductName(pool, { slug: service, productName });
    
    await pool.query(
      'INSERT INTO orders (id, clientName, service, region, notes, status, createdAt, updatedAt, inquiryId, customerEmail, productName) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        clientName,
        service,
        region,
        notes || '',
        'new',
        createdAt,
        createdAt,
        inquiryId || null,
        customerEmail || '',
        resolvedProductName,
      ]
    );

    if (service) {
      await decrementInventory(service, 10);
    }

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
    console.error(err);
    res.status(500).json({ error: 'Failed to schedule delivery order' });
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
app.put('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const updatedAt = new Date().toISOString();
  const deliveryStatuses = new Set(['delivered', 'shipped']);

  try {
    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = rows[0];
    const previousStatus = (order.status || '').toLowerCase();
    const nextStatus = (status || '').toLowerCase();

    await pool.query('UPDATE orders SET status = ?, updatedAt = ? WHERE id = ?', [status, updatedAt, id]);

    res.json({ success: true, id, status, updatedAt });

    const orderSnapshot = { ...order };
    const shouldApprove = nextStatus === 'approved' && previousStatus !== 'approved';
    const shouldDeliver =
      deliveryStatuses.has(nextStatus) && !deliveryStatuses.has(previousStatus);

    if (shouldApprove || shouldDeliver) {
      setImmediate(async () => {
        try {
          const customerCtx = await resolveOrderCustomerContext(pool, orderSnapshot);

          if (shouldApprove) {
            enqueueOrderStatusEmail({
              to: customerCtx.customerEmail,
              customerName: customerCtx.customerName,
              productName: customerCtx.productName,
              statusKey: 'approved',
            });
          }

          if (shouldDeliver) {
            if (orderSnapshot.inquiryId) {
              await pool.query('UPDATE inquiries SET status = ? WHERE id = ?', [
                'delivered',
                orderSnapshot.inquiryId,
              ]);
            }
            enqueueOrderStatusEmail({
              to: customerCtx.customerEmail,
              customerName: customerCtx.customerName,
              productName: customerCtx.productName,
              statusKey: 'delivered',
            });
          }
        } catch (err) {
          console.error('[email] Order notification background task failed:', err);
        }
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update delivery status' });
  }
});

// 8. Fetch Product Visibility & Stock Configuration
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch product stock profiles' });
  }
});

// 9. Update/Save Product Stock Inventory Status and Site Visibility
app.put('/api/products/:slug', async (req, res) => {
  const { slug } = req.params;
  const { stockStatus, visible, inventoryCount, lowStockThreshold, supplierEmail } = req.body;

  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE slug = ?', [slug]);
    
    if (rows.length === 0) {
      const dbStatus = stockStatus || 'in-stock';
      const dbVisible = visible !== undefined ? (visible ? 1 : 0) : 1;
      const dbInventory = inventoryCount !== undefined ? parseInt(inventoryCount) : 100;
      const dbThreshold = lowStockThreshold !== undefined ? parseInt(lowStockThreshold) : 10;
      const dbEmail = supplierEmail || 'supplier@algani.com';
      
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
app.get('/api/alerts', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM inventory_alerts ORDER BY createdAt DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch inventory alerts' });
  }
});

// 9c. Mark Alert as Read
app.put('/api/alerts/:id/read', async (req, res) => {
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
app.put('/api/auth/change-password', async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;
  if (!email || !currentPassword || !newPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM admins WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Admin account not found' });
    }

    const admin = rows[0];
    const isPasswordValid = bcrypt.compareSync(currentPassword, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    const hashedNewPassword = bcrypt.hashSync(newPassword, 10);
    await pool.query('UPDATE admins SET password = ? WHERE email = ?', [hashedNewPassword, email]);
    res.json({ success: true, message: 'Password updated successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server transaction failed' });
  }
});


// Built frontend (Vite copies public/ into dist/ on npm run build)
app.use(express.static(FRONTEND_DIST));

// Redirect route for SPA index.html matching fallback
app.use((req, res) => {
  res.sendFile(path.join(FRONTEND_DIST, 'index.html'), (err) => {
    // If not built yet, return simple startup success message
    if (err) {
      res.status(200).send('Al Gani API server running! Client files will build on startup.');
    }
  });
});

// Listen immediately (Render health check); init DB in background
app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
  initDatabase().catch((err) => {
    lastDbError = err.message || String(err);
    console.error('Database init failed:', err);
  });
});
