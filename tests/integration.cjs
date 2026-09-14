// Uses only an explicitly configured disposable MySQL database, never production.
const assert=require('node:assert/strict');const {spawn}=require('node:child_process');const mysql=require('mysql2/promise');
(async()=>{
 const raw=process.env.TEST_MYSQL_URL;if(!raw)throw Error('TEST_MYSQL_URL is required');const url=new URL(raw);
 if(!['localhost','127.0.0.1'].includes(url.hostname)||url.pathname!='/algani_test')throw Error('Integration tests require local algani_test database');
 const server=spawn(process.execPath,['backend/server.cjs'],{env:{...process.env,NODE_ENV:'test',PORT:'5099',MYSQL_URL:raw,DB_SSL:'false',JWT_SECRET:'integration-test-secret',ADMIN_PASSWORD_1:'Integration-test-pass-2026',RESEND_API_KEY:'',OWNER_NOTIFICATION_EMAIL:''},stdio:'pipe'});
 let logs='';server.stdout.on('data',b=>logs+=b);server.stderr.on('data',b=>logs+=b);
 let pool;
 const call=async(path,{token,body,method='GET'}={})=>{const r=await fetch('http://127.0.0.1:5099/api'+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json()};};
 try{
  let ready=false;for(let i=0;i<45;i++){try{if((await call('/health')).status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,1000));}assert.ok(ready,logs);
  pool=mysql.createPool(raw);
  const login=await call('/auth/login',{method:'POST',body:{email:'aftab@algani',password:'Integration-test-pass-2026'}});assert.equal(login.status,200);const token=login.body.token;
  const inquiry=await call('/inquiries',{method:'POST',body:{name:'Integration test',email:'test@example.invalid',message:'Disposable test only',service:'modular-kitchens'}});assert.equal(inquiry.status,201);
  const [jobs]=await pool.query('SELECT * FROM email_outbox');assert.ok(jobs.length>0);
  const page=await call('/inquiries?paged=1',{token});assert.ok(page.body.items.some(item=>item.id===inquiry.body.id));
  const changed=await call('/auth/change-password',{method:'PUT',token,body:{email:'aftab@algani',currentPassword:'Integration-test-pass-2026',newPassword:'Changed-test-pass-2026'}});assert.equal(changed.status,200);
  assert.equal((await call('/inquiries',{token})).status,401);
  const fresh=await call('/auth/login',{method:'POST',body:{email:'aftab@algani',password:'Changed-test-pass-2026'}});assert.equal(fresh.status,200);
  assert.equal((await call('/auth/logout',{method:'POST',token:fresh.body.token,body:{}})).status,200);assert.equal((await call('/orders',{token:fresh.body.token})).status,401);
  console.log('MySQL integration passed: inquiry, outbox, pagination, password revocation and logout.');
 }finally{await pool?.end();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
