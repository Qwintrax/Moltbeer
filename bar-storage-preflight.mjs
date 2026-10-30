// Private Supabase connection preflight for the existing MOLTBEER project.
// This module NEVER connects, prints or returns a database password.
// No durable feature may be advertised until an actual DB write/read/restart test.
const PROJECT_REF = 'nbjhjnswqmpcpbsvbwff';
const SESSION_POOLER = 'aws-0-eu-west-1.pooler.supabase.com';

export function validateMoltbeerDatabaseUrl(value) {
  const invalid = (reason) => ({ok:false,reason});
  if (typeof value !== 'string' || value.length > 2048 || !value.trim())
    return invalid('missing_or_oversized');
  let url;
  try { url = new URL(value); } catch { return invalid('malformed'); }
  if (url.protocol !== 'postgresql:' || url.hostname !== SESSION_POOLER ||
      url.port !== '5432' || url.pathname !== '/postgres' ||
      url.hash || url.username !== 'postgres.' + PROJECT_REF)
    return invalid('wrong_project_or_pooler');
  if (url.search && (url.searchParams.size !== 1 ||
      url.searchParams.get('sslmode') !== 'require'))
    return invalid('unexpected_connection_options');
  let password;
  try { password = decodeURIComponent(url.password); }
  catch { return invalid('malformed_password_encoding'); }
  if (!password || password === '[YOUR-PASSWORD]' || password.length < 8)
    return invalid('missing_password');
  // Deliberately return only public routing metadata. Never return the URL.
  return {ok:true,projectRef:PROJECT_REF,connection:'session_pooler',tlsRequired:true};
}

export function barStoragePreflight(env = process.env) {
  if (!env.DATABASE_URL)
    return {configured:false,ready:false,mode:'ephemeral',reason:'not_configured'};
  const check = validateMoltbeerDatabaseUrl(env.DATABASE_URL);
  if (!check.ok)
    return {configured:true,ready:false,mode:'ephemeral',reason:check.reason};
  return {configured:true,ready:false,mode:'ephemeral',reason:'adapter_not_implemented'};
}
