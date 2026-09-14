function decodeCursor(value) {
 if(!value)return null;
 try {const row=JSON.parse(Buffer.from(value,'base64url').toString());if(typeof row.date!=='string'||typeof row.id!=='string'||row.date.length>255||row.id.length>255)throw Error();return row;}catch{throw Object.assign(Error('Invalid page cursor'),{status:400});}
}
async function recordPage(pool,table,query={}) {
 if(!['inquiries','orders'].includes(table))throw Error('Unknown record type');
 const cursor=decodeCursor(query.cursor);const limit=100;
 const clause=cursor?' WHERE (createdAt < ? OR (createdAt = ? AND id < ?))':'';
 const args=cursor?[cursor.date,cursor.date,cursor.id,limit+1]:[limit+1];
 const [rows]=await pool.query(`SELECT * FROM ${table}${clause} ORDER BY createdAt DESC,id DESC LIMIT ?`,args);
 const items=rows.slice(0,limit),last=items.at(-1);
 return {items,nextCursor:rows.length>limit?Buffer.from(JSON.stringify({date:last.createdAt,id:last.id})).toString('base64url'):null};
}
module.exports={decodeCursor,recordPage};
