import {storageQueries} from './bar-storage-queries.mjs';

// Database-backed expiry cleanup. Never claims success on a failed query.
// Use from a bounded scheduled maintenance job, not on every public request.
export async function purgeExpiredBarRows(pool) {
  if (!pool || typeof pool.connect !== 'function') throw new Error('Durable database unavailable');
  let client;
  try { client=await pool.connect(); }
  catch { throw new Error('Durable cleanup transaction failed'); }
  let begun=false;
  try {
    await client.query('BEGIN'); begun=true;
    const removed={};
    for (const [label,sql] of [
      ['sessions',storageQueries.expireSessions],
      ['messages',storageQueries.expireMessages],
      ['reports',storageQueries.expireReports],
      ['audit',storageQueries.expireAudit]
    ]) {
      const result=await client.query(sql);
      if (!Number.isSafeInteger(result.rowCount) || result.rowCount<0)
        throw new Error('Invalid cleanup result');
      removed[label]=result.rowCount;
    }
    await client.query('COMMIT'); begun=false;
    return removed;
  } catch {
    if (begun) {try {await client.query('ROLLBACK')} catch {}}
    throw new Error('Durable cleanup transaction failed');
  } finally {client.release()}
}
