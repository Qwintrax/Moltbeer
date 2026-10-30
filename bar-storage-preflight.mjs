// Private Supabase connection preflight for the existing MOLTBEER project.
// This module NEVER connects, prints or returns a database password.
// No durable feature may be advertised until an actual DB write/read/restart test.
const PROJECT_REF = 'nbjhjnswqmpcpbsvbwff';
import {validatePrivateDatabaseUrl} from './bar-storage-pool.mjs';
const SESSION_POOLER = /^aws-[0-9]+-eu-west-1\.pooler\.supabase\.com$/;

export function validateMoltbeerDatabaseUrl(value) {
  const invalid = (reason) => ({ok:false,reason});
  if (typeof value !== 'string' || value.length > 4096 || !value.trim())
    return invalid('missing_or_oversized');
  let url;
  try { url = new URL(value); } catch { return invalid('malformed'); }
  if (!['postgresql:','postgres:'].includes(url.protocol) || !SESSION_POOLER.test(url.hostname) ||
      url.port !== '5432' || url.pathname !== '/postgres' ||
      url.hash || url.username !== 'postgres.' + PROJECT_REF)
    return invalid('wrong_project_or_pooler');
  if (url.searchParams.size !== 1 || url.searchParams.get('sslmode') !== 'require')
    return invalid('tls_required_or_unexpected_options');
  let password;
  try { password = decodeURIComponent(url.password); }
  catch { return invalid('malformed_password_encoding'); }
  if (!password || password === '[YOUR-PASSWORD]' || password.length < 8)
    return invalid('missing_password');
  // Keep preflight and the actual private pool on exactly the same acceptance contract.
  try { validatePrivateDatabaseUrl(value); }
  catch { return invalid('invalid_database_configuration'); }
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
