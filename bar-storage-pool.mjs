// A private, opt-in PostgreSQL pool. No network connection occurs at import time.
// The pool is NOT wired into public routes until persistence is verified.
export function validatePrivateDatabaseUrl(value,projectId='nbjhjnswqmpcpbsvbwff') {
  if (typeof value!=='string' || value.length>4096) throw Error('Invalid database configuration');
  let u;
  try {u=new URL(value)} catch {throw Error('Invalid database configuration')}
  if (!['postgresql:','postgres:'].includes(u.protocol) ||
      !u.hostname.endsWith('.pooler.supabase.com') ||
      !u.hostname.startsWith('aws-') ||
      u.port!=='5432' ||
      u.username!==('postgres.'+projectId) ||
      !u.password ||
      u.pathname!=='/postgres' ||
      u.hash ||
      [...u.searchParams.keys()].some(k=>k!=='sslmode'))
    throw Error('Database target is not the dedicated Supabase session pooler');
  if (u.searchParams.has('sslmode') && u.searchParams.get('sslmode')!=='require')
    throw Error('Database TLS must be required');
  return value;
}
export async function createPrivateDatabasePool({
  databaseUrl=process.env.DATABASE_URL,
  PoolClass,
  projectId='nbjhjnswqmpcpbsvbwff'
}={}) {
  const connectionString=validatePrivateDatabaseUrl(databaseUrl,projectId);
  // Dependency injected so tests never contact production.
  if (typeof PoolClass!=='function') throw Error('PostgreSQL driver not provided');
  const pool=new PoolClass({
    connectionString,
    max:3,
    idleTimeoutMillis:10000,
    connectionTimeoutMillis:5000,
    ssl:{rejectUnauthorized:true},
    application_name:'moltbeer-bar'
  });
  try {
    const result=await pool.query('SELECT 1 AS ok');
    if (Number(result.rows?.[0]?.ok)!==1) throw Error('Database verification failed');
    return pool;
  } catch {
    await pool.end().catch(()=>{});
    throw Error('Private database connection failed');
  }
}
