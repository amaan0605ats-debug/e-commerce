// Uses only an explicitly configured disposable MySQL database, never production.
const assert=require('node:assert/strict');const {spawn}=require('node:child_process');const mysql=require('mysql2/promise');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {backup,restore}=require('../backend/scripts/backup.cjs');
(async()=>{
 const raw=process.env.TEST_MYSQL_URL;if(!raw)throw Error('TEST_MYSQL_URL is required');const url=new URL(raw);
 if(!['localhost','127.0.0.1'].includes(url.hostname)||url.pathname!='/algani_test')throw Error('Integration tests require local algani_test database');
 const server=spawn(process.execPath,['backend/server.cjs'],{env:{...process.env,NODE_ENV:'test',PORT:'5099',MYSQL_URL:raw,DB_SSL:'false',JWT_SECRET:'integration-test-secret',ADMIN_PASSWORD_1:'Integration-test-pass-2026',RESEND_API_KEY:'',OWNER_NOTIFICATION_EMAIL:''},stdio:'pipe'});
 let logs='';server.stdout.on('data',b=>logs+=b);server.stderr.on('data',b=>logs+=b);
 let pool;let backupFile;
 const call=async(path,{token,body,method='GET'}={})=>{const r=await fetch('http://127.0.0.1:5099/api'+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json()};};
 try{
  let ready=false;for(let i=0;i<45;i++){try{if((await call('/health')).status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,1000));}assert.ok(ready,logs);
  pool=mysql.createPool(raw);
  const login=await call('/auth/login',{method:'POST',body:{email:'aftab@algani',password:'Integration-test-pass-2026'}});assert.equal(login.status,200);const token=login.body.token;
  const inquiry=await call('/inquiries',{method:'POST',body:{name:'Integration test',email:'test@example.invalid',message:'Disposable test only',service:'modular-kitchens'}});assert.equal(inquiry.status,201);
  const [jobs]=await pool.query('SELECT * FROM email_outbox');assert.ok(jobs.length>0);
  const page=await call('/inquiries?paged=1',{token});assert.ok(page.body.items.some(item=>item.id===inquiry.body.id));
  const accepted=await call('/inquiries/'+inquiry.body.id,{method:'PUT',token,body:{status:'accepted'}});assert.equal(accepted.status,200);
  const [acceptedJobs]=await pool.query('SELECT payload FROM email_outbox');assert.ok(acceptedJobs.some(job=>(typeof job.payload==='string'?JSON.parse(job.payload):job.payload).statusKey==='accepted'));
  // Deliberately break the queue in this disposable database: inquiry writes must roll back.
  await pool.query('RENAME TABLE email_outbox TO email_outbox_temporarily_unavailable');
  try {
   const failed=await call('/inquiries',{method:'POST',body:{name:'Rollback test',email:'rollback@example.invalid',message:'Must not save without a queue job',service:'modular-kitchens'}});assert.equal(failed.status,500);
   const [saved]=await pool.query("SELECT id FROM inquiries WHERE email='rollback@example.invalid'");assert.equal(saved.length,0);
  } finally { await pool.query('RENAME TABLE email_outbox_temporarily_unavailable TO email_outbox'); }
  const changed=await call('/auth/change-password',{method:'PUT',token,body:{email:'aftab@algani',currentPassword:'Integration-test-pass-2026',newPassword:'Changed-test-pass-2026'}});assert.equal(changed.status,200);
  assert.equal((await call('/inquiries',{token})).status,401);
  const fresh=await call('/auth/login',{method:'POST',body:{email:'aftab@algani',password:'Changed-test-pass-2026'}});assert.equal(fresh.status,200);
  assert.equal((await call('/auth/logout',{method:'POST',token:fresh.body.token,body:{}})).status,200);assert.equal((await call('/orders',{token:fresh.body.token})).status,401);
  process.env.BACKUP_ENCRYPTION_KEY='a'.repeat(64); // Disposable test key, never used for production.
  backupFile=path.join(os.tmpdir(),'algani-recovery-'+process.pid+'.enc');
  await pool.query('CREATE DATABASE algani_restore');
  const restoreUrl=new URL(raw);restoreUrl.pathname='/algani_restore';
  const tableCount=await backup(raw,backupFile);assert.ok(tableCount>5);
  const original=fs.readFileSync(backupFile);const tampered=Buffer.from(original);tampered[tampered.length-1]^=1;fs.writeFileSync(backupFile,tampered);
  await assert.rejects(restore(restoreUrl.toString(),backupFile));
  fs.writeFileSync(backupFile,original);assert.equal(await restore(restoreUrl.toString(),backupFile),tableCount);
  const [restored]=await pool.query('SELECT id FROM algani_restore.inquiries');assert.ok(restored.some(row=>row.id===inquiry.body.id));
  const [restoredJobs]=await pool.query('SELECT payload FROM algani_restore.email_outbox');assert.equal(restoredJobs.length,acceptedJobs.length);
  await assert.rejects(restore(restoreUrl.toString(),backupFile),/empty/);
  console.log('MySQL integration passed: inquiry, atomic outbox rollback, pagination, password revocation, logout and encrypted backup/restore.');
 }finally{if(backupFile&&fs.existsSync(backupFile))fs.unlinkSync(backupFile);await pool?.end();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
