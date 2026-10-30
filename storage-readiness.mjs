// One-time private, read-only connectivity check, never a public endpoint.
// Safe by default: no database writes, no leaked URL/password, no mode switch.
export async function verifyPrivateStorageOnce({databaseUrl,PoolClass,createPool}={}){
  if(!databaseUrl)return {configured:false,connected:false,mode:'ephemeral'};
  if(typeof createPool!=='function'||typeof PoolClass!=='function')
    return {configured:true,connected:false,mode:'ephemeral'};
  let pool;
  try{
    pool=await createPool({databaseUrl,PoolClass});
    const sample=await pool.query(`SELECT count(*)::int AS n
      FROM information_schema.tables
      WHERE table_schema='moltbeer_private'
        AND table_name IN ('bar_sessions','bar_messages','drink_events','bar_reports','bar_metrics','bar_moderation_audit')`);
    if(Number(sample.rows?.[0]?.n)!==6)throw Error('Missing private tables');
    return {configured:true,connected:true,mode:'ephemeral'};
  }catch{
    // Never log or return raw exception: node-postgres errors can include host/user.
    return {configured:true,connected:false,mode:'ephemeral'};
  }finally{
    if(pool)try{await pool.end()}catch{}
  }
}
