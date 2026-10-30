// Read-only liveness probe: having created a Pool previously does not prove
// the database is responding at the time an active durable bar is checked.
export async function verifyDurablePoolHealth(pool){
 if(!pool||typeof pool.query!=='function')return false;
 try{
  const result=await pool.query({text:'SELECT 1 AS ok',query_timeout:3000});
  return Number(result.rows?.[0]?.ok)===1;
 }catch{return false}
}
