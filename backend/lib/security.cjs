const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
function passwordVersion(hash) { return crypto.createHash('sha256').update(String(hash)).digest('hex'); }
function createAuth(getPool, secret) {
 return async (req,res,next) => {
  const header=req.headers.authorization;
  if(!header?.startsWith('Bearer '))return res.status(401).json({code:'auth/unauthorized',error:'Authentication required'});
  let decoded;
  try { decoded=jwt.verify(header.slice(7),secret,{algorithms:['HS256']}); if(!decoded.id||!decoded.email||!decoded.pv||!decoded.jti)throw Error('Invalid session'); }
  catch { return res.status(401).json({code:'auth/invalid-token',error:'Invalid or expired session. Please sign in again.'}); }
  try {
   const [rows]=await getPool().query('SELECT password FROM admins WHERE id = ? AND email = ?', [decoded.id,decoded.email]);
   const [revoked]=await getPool().query('SELECT tokenId FROM revoked_sessions WHERE tokenId = ?',[decoded.jti]);
   if(!rows.length||passwordVersion(rows[0].password)!==decoded.pv||revoked.length)return res.status(401).json({code:'auth/invalid-token',error:'This session has ended. Please sign in again.'});
   req.admin=decoded; next();
  } catch { res.status(503).json({error:'Unable to verify your session. Please try again.'}); }
 };
}
async function readiness(pool,ready) {
 if(!ready||!pool)return false;
 let timer;
 try { await Promise.race([pool.query({sql:'SELECT 1',timeout:2500}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('timeout')),3000);})]);return true; }
 catch{return false;} finally{clearTimeout(timer);}
}
module.exports={passwordVersion,createAuth,readiness};
