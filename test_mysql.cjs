const mysql = require('mysql2/promise');

const passwords = [
  '',
  'root',
  'admin',
  '123456',
  '1234',
  'password',
  'mysql',
  'admin123',
  'amaan',
  'amaan123',
  'amaan0605',
  'secureAdminPass!2026'
];

(async () => {
  console.log('Testing standard passwords against local running MySQL80 service...');
  for (const pw of passwords) {
    try {
      const conn = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: pw
      });
      console.log(`\n🎉 SUCCESS! Connected with user 'root' and password: '${pw}'`);
      await conn.end();
      process.exit(0);
    } catch (err) {
      if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        console.log(`❌ Password failed: '${pw}'`);
      } else {
        console.error(`⚠️ Connection error for password '${pw}':`, err.message);
      }
    }
  }
  console.log('\n❌ All standard passwords tested and failed. A custom MySQL root password is required.');
  process.exit(1);
})();
