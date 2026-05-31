const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Serving built frontend assets if they are static in production
app.use(express.static(path.join(__dirname, 'dist')));

let pool;

// ── DATABASE INITIALIZATION & SCHEMA CREATION ──
async function initDatabase() {
  try {
    console.log(`Connecting to MySQL server at ${process.env.DB_HOST}:${process.env.DB_PORT || '3306'}...`);
    
    // Initial connection to server without database selected (to create it if missing)
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });

    console.log(`Creating database '${process.env.DB_NAME || 'algani_db'}' if it doesn't exist...`);
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'algani_db'}\``);
    await conn.end();

    // Now initialize connection pool with database selected
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'algani_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
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
        notes TEXT DEFAULT '',
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
        visible TINYINT(1) DEFAULT 1
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

    // ── DATABASE SEEDING ──
    await seedDatabase();

  } catch (error) {
    console.error('❌ Database Initialization Failed!');
    console.error(error);
    console.error('\n⚠️ Please ensure your MySQL local server is running and check your .env settings.');
  }
}

// Helper to seed standard tables with realistic high-fidelity data
async function seedDatabase() {
  try {
    // A. Seed default administrator credentials
    const [adminRows] = await pool.query('SELECT COUNT(*) as count FROM admins');
    if (adminRows[0].count === 0) {
      console.log('Seeding default administrator credentials...');
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      
      await pool.query(
        'INSERT INTO admins (id, email, password, displayName) VALUES (?, ?, ?, ?), (?, ?, ?, ?)',
        [
          'admin-aftab', 'aftab@algani.com', hashedPassword, 'Syed Mir Aftab',
          'admin-ayoub', 'ayoub@algani.com', hashedPassword, 'Mohammad Ayoub Bhat'
        ]
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
      
      const insertPromises = services.map(slug => 
        pool.query('INSERT INTO products (slug, stockStatus, visible) VALUES (?, ?, ?)', [slug, 'in-stock', 1])
      );
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

  } catch (err) {
    console.error('⚠️ Seeding Failed:', err);
  }
}


// ── API ROUTES ──

// 1. Authenticate Admin Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
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

// 3. Submit Customer Inquiry
app.post('/api/inquiries', async (req, res) => {
  const { name, email, phone, subject, service, location, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required' });
  }

  try {
    const id = 'inq-' + Math.random().toString(36).substr(2, 9);
    const createdAt = new Date().toISOString();
    
    await pool.query(
      'INSERT INTO inquiries (id, name, email, phone, subject, service, location, message, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, email, phone || '', subject || '', service || '', location || '', message, 'pending', createdAt]
    );

    res.status(201).json({ id, name, email, phone, subject, service, location, message, status: 'pending', createdAt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save customer inquiry' });
  }
});

// 4. Update Inquiry Read Status
app.put('/api/inquiries/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  try {
    await pool.query('UPDATE inquiries SET status = ? WHERE id = ?', [status || 'read', id]);
    res.json({ success: true, id, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update inquiry status' });
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
  const { clientName, service, region, notes } = req.body;
  if (!clientName || !service || !region) {
    return res.status(400).json({ error: 'Client name, service slug, and operating region are required' });
  }

  try {
    const id = 'ord-' + Math.random().toString(36).substr(2, 9);
    const createdAt = new Date().toISOString();
    
    await pool.query(
      'INSERT INTO orders (id, clientName, service, region, notes, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, clientName, service, region, notes || '', 'new', createdAt, createdAt]
    );

    res.status(201).json({ id, clientName, service, region, notes, status: 'new', createdAt, updatedAt: createdAt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to schedule delivery order' });
  }
});

// 7. Update Delivery Order Fulfillment Status
app.put('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const updatedAt = new Date().toISOString();

  try {
    await pool.query('UPDATE orders SET status = ?, updatedAt = ? WHERE id = ?', [status, updatedAt, id]);
    res.json({ success: true, id, status, updatedAt });
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
  const { stockStatus, visible } = req.body;

  try {
    // Check if configuration already exists in the table
    const [rows] = await pool.query('SELECT * FROM products WHERE slug = ?', [slug]);
    
    if (rows.length === 0) {
      const dbStatus = stockStatus || 'in-stock';
      const dbVisible = visible !== undefined ? (visible ? 1 : 0) : 1;
      await pool.query(
        'INSERT INTO products (slug, stockStatus, visible) VALUES (?, ?, ?)',
        [slug, dbStatus, dbVisible]
      );
    } else {
      const product = rows[0];
      const dbStatus = stockStatus !== undefined ? stockStatus : product.stockStatus;
      const dbVisible = visible !== undefined ? (visible ? 1 : 0) : product.visible;
      
      await pool.query(
        'UPDATE products SET stockStatus = ?, visible = ? WHERE slug = ?',
        [dbStatus, dbVisible, slug]
      );
    }

    res.json({ success: true, slug, stockStatus, visible });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update product settings' });
  }
});


// Redirect route for SPA index.html matching fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'), (err) => {
    // If not built yet, return simple startup success message
    if (err) {
      res.status(200).send('Al Gani API server running! Client files will build on startup.');
    }
  });
});

// Start listening and run db initializations
app.listen(PORT, async () => {
  console.log(`🚀 Server initialized at http://localhost:${PORT}`);
  await initDatabase();
});
