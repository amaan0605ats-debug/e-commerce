const crypto=require('node:crypto');
const {sendOrderStatusEmail}=require('./emailService.cjs');
async function installOperations(pool) {
 await pool.query(`CREATE TABLE IF NOT EXISTS revoked_sessions (tokenId VARCHAR(64) PRIMARY KEY, expiresAt DATETIME NOT NULL)`);
 await pool.query(`CREATE TABLE IF NOT EXISTS email_outbox (id VARCHAR(64) PRIMARY KEY, payload JSON NOT NULL, status VARCHAR(24) NOT NULL DEFAULT 'pending', attempts INT NOT NULL DEFAULT 0, availableAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, leaseUntil DATETIME DEFAULT NULL, providerId VARCHAR(255), lastError VARCHAR(500), createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX email_ready (status,availableAt))`);
 await pool.query(`CREATE TABLE IF NOT EXISTS admin_audit (id VARCHAR(64) PRIMARY KEY, adminId VARCHAR(255) NOT NULL, method VARCHAR(12) NOT NULL, route VARCHAR(255) NOT NULL, statusCode INT NOT NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX audit_created (createdAt))`);
 for(const table of ['inquiries','orders']) {
  try { await pool.query(`CREATE INDEX records_created_id ON ${table} (createdAt,id)`); }
  catch(error) { if(error.code!=='ER_DUP_KEYNAME'&&error.errno!==1061)throw error; }
 }
}
async function queueEmail(connection,payload) {
 if(!payload.to)return;
 const id=crypto.randomUUID();
 await connection.query('INSERT INTO email_outbox (id,payload) VALUES (?,?)',[id,JSON.stringify({...payload,idempotencyKey:id})]);
}
// A two-minute lease keeps other workers from claiming an in-flight row.
// Resend's idempotency key also covers a crash after send but before status update.
async function processOutbox(pool,send=sendOrderStatusEmail) {
 const connection=await pool.getConnection();let row;
 try {
  await connection.beginTransaction();
  const [rows]=await connection.query("SELECT * FROM email_outbox WHERE (status='pending' AND availableAt<=UTC_TIMESTAMP()) OR (status='sending' AND leaseUntil<UTC_TIMESTAMP()) ORDER BY createdAt LIMIT 1 FOR UPDATE");
  row=rows[0];
  if(row)await connection.query("UPDATE email_outbox SET status='sending',leaseUntil=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 2 MINUTE),attempts=attempts+1 WHERE id=?",[row.id]);
  await connection.commit();
 } catch(error){await connection.rollback();throw error;} finally{connection.release();}
 if(!row)return false;
 const payload=typeof row.payload==='string'?JSON.parse(row.payload):row.payload;
 let result;try{result=await send(payload);}catch(error){result={sent:false,reason:error.message};}
 if(result.sent)await pool.query("UPDATE email_outbox SET status='sent',providerId=?,lastError=NULL,leaseUntil=NULL WHERE id=?",[result.messageId||null,row.id]);
 else await pool.query("UPDATE email_outbox SET status=?,lastError=?,leaseUntil=NULL,availableAt=DATE_ADD(UTC_TIMESTAMP(),INTERVAL ? SECOND) WHERE id=?",[row.attempts>=5?'failed':'pending',String(result.reason||'Delivery failed').slice(0,500),Math.min(3600,30*2**row.attempts),row.id]);
 return true;
}
function startOutbox(pool) {
 let busy=false;
 const timer=setInterval(async()=>{if(busy)return;busy=true;try{for(let i=0;i<10;i++)if(!await processOutbox(pool))break;await pool.query('DELETE FROM revoked_sessions WHERE expiresAt<UTC_TIMESTAMP()');}catch(error){console.error('[outbox]',error.message);}finally{busy=false;}},10000);
 timer.unref();return ()=>clearInterval(timer);
}
module.exports={installOperations,queueEmail,processOutbox,startOutbox};
