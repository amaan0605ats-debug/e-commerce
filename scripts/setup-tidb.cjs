/**
 * One-time: ensure algani_db exists on TiDB and print health-ready MYSQL_URL host.
 * Run: node scripts/setup-tidb.cjs
 */
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const rawUrl = process.env.MYSQL_URL;
if (!rawUrl) {
  console.error('Set MYSQL_URL in .env first');
  process.exit(1);
}
const url = new URL(rawUrl);
const host = url.hostname;
const port = parseInt(url.port || '4000', 10);
const user = decodeURIComponent(url.username);
const password = decodeURIComponent(url.password);
const dbName = decodeURIComponent(url.pathname.replace(/^\//, '')) || 'algani_db';

const ssl = { rejectUnauthorized: false };

async function main() {
  const conn = await mysql.createConnection({ host, port, user, password, ssl });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  console.log(`OK: database "${dbName}" exists`);
  await conn.changeUser({ database: dbName });
  const [tables] = await conn.query('SHOW TABLES');
  console.log(`Tables in ${dbName}:`, tables.length);
  await conn.end();
  console.log('TiDB is ready for npm start');
}

main().catch((err) => {
  console.error('TiDB setup failed:', err.message);
  process.exit(1);
});
