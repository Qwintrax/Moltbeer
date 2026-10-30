import {readFileSync} from 'node:fs';
import {X509Certificate} from 'node:crypto';
// A private, opt-in PostgreSQL pool. No network connection occurs at import time.
// The pool is NOT wired into public routes until persistence is verified.
export function validatePrivateDatabaseUrl(value,projectId='nbjhjnswqmpcpbsvbwff') {
  if (typeof value!=='string' || value.length>4096) throw Error('Invalid database configuration');
  let u;
  try {u=new URL(value)} catch {throw Error('Invalid database configuration')}
  if (!['postgresql:','postgres:'].includes(u.protocol) ||
      !/^aws-[0-9]+-eu-west-1\.pooler\.supabase\.com$/.test(u.hostname) ||
      u.port!=='5432' ||
      u.username!==('postgres.'+projectId) ||
      !u.password ||
      u.pathname!=='/postgres' ||
      u.hash ||
      [...u.searchParams.keys()].some(k=>k!=='sslmode') ||
      u.searchParams.get('sslmode')!=='require')
    throw Error('Database target is not the dedicated Supabase session pooler');
  // Node-postgres parses sslmode from a connection string and can override
  // ssl.rejectUnauthorized. Remove that option *after* validating it and pass
  // a strict TLS config separately. Keep the password percent-encoded.
  let decodedPassword;
  try { decodedPassword=decodeURIComponent(u.password) }
  catch { throw Error('Invalid database configuration') }
  if (decodedPassword==='[YOUR-PASSWORD]' || decodedPassword.length<8)
    throw Error('Invalid database configuration');
  u.searchParams.delete('sslmode');
  return u.toString();
}
// Only opaque driver error codes are inspected; never forward driver messages,
// URLs, hostnames or connection strings into logs or HTTP responses.
function safePoolFailure(err) {
  const code=typeof err?.code==='string'?err.code:'';
  const reason=['28P01','28000'].includes(code)?'authentication_failed'
    :['UNABLE_TO_VERIFY_LEAF_SIGNATURE','DEPTH_ZERO_SELF_SIGNED_CERT',
       'SELF_SIGNED_CERT_IN_CHAIN','CERT_HAS_EXPIRED','ERR_TLS_CERT_ALTNAME_INVALID'].includes(code)
      ?'tls_verification_failed'
    :['ETIMEDOUT','ECONNREFUSED','EHOSTUNREACH','ENETUNREACH','ENOTFOUND','EAI_AGAIN'].includes(code)
      ?'network_unavailable':'connection_failed';
  const out=new Error('Private database connection failed');
  out.safeReason=reason; return out;
}

export async function createPrivateDatabasePool({
  databaseUrl=process.env.DATABASE_URL,
  PoolClass,
  projectId='nbjhjnswqmpcpbsvbwff'
}={}) {
  const connectionString=validatePrivateDatabaseUrl(databaseUrl,projectId);
  // Dependency injected so tests never contact production.
  if (typeof PoolClass!=='function') throw Error('PostgreSQL driver not provided');
  // Supavisor's certificate is signed by a private Supabase CA, not Node's\n  // system roots. Check the public trust anchor against the published SHA-256\n  // fingerprint before trusting it; NEVER disable certificate verification.\n  let ca;\n  try {\n    ca=readFileSync(new URL('./certs/supabase-root-2021.crt',import.meta.url),'utf8');\n    const sha=new X509Certificate(ca).fingerprint256.replaceAll(':','').toLowerCase();\n    if(sha!=='807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa')throw Error('CA fingerprint mismatch');\n  }catch{throw Error('Private database CA unavailable')}\n  let pool;\n  try {pool=new PoolClass({
    connectionString,
    max:3,
    idleTimeoutMillis:10000,
    connectionTimeoutMillis:5000,
    ssl:{ca,rejectUnauthorized:true},
    application_name:'moltbeer-bar'
  });} catch (cause) {throw safePoolFailure(cause)}
  try {
    const result=await pool.query('SELECT 1 AS ok');
    if (Number(result.rows?.[0]?.ok)!==1) throw Error('Database verification failed');
    return pool;
  } catch (cause) {
    try {await pool.end()} catch {}
    throw safePoolFailure(cause);
  }
}
