// One-time private, read-only connectivity check, never a public endpoint.
// Safe by default: no database writes, no leaked URL/password, no mode switch.
export async function verifyPrivateStorageOnce({databaseUrl,PoolClass,createPool}={}){
  if(!databaseUrl)return {configured:false,connected:false,mode:'ephemeral',reason:'missing_config'};
  if(typeof createPool!=='function'||typeof PoolClass!=='function')
    return {configured:true,connected:false,mode:'ephemeral',reason:'driver_unavailable'};
  let pool;
  try{
    pool=await createPool({databaseUrl,PoolClass});
    const sample=await pool.query(`SELECT count(*)::int AS n
      FROM information_schema.tables
      WHERE table_schema='moltbeer_private'
        AND table_name IN ('bar_sessions','bar_messages','drink_events','bar_reports','bar_metrics','bar_moderation_audit')`);
    if(Number(sample.rows?.[0]?.n)!==6)throw Error('Storage schema incomplete');
    return {configured:true,connected:true,mode:'ephemeral',reason:'ok'};
  }catch(err){
    // Classify only whitelisted static errors. Never disclose arbitrary driver errors.
    const reason=err?.message==='Database target is not the dedicated Supabase session pooler'?'wrong_database_target':
      err?.message==='Invalid database configuration'?'invalid_database_url':
      err?.message==='Storage schema incomplete'?'schema_incomplete':'connection_failed';
    return {configured:true,connected:false,mode:'ephemeral',reason};
  }finally{
    if(pool)try{await pool.end()}catch{}
  }
}
