import {storageQueries} from './bar-storage-queries.mjs';

// Accepts a connected node-postgres Pool or compatible client provider.
// This does NOT enable the adapter on live endpoints. All writes fail closed.
export async function recordDrinkExactlyOnce(pool,{eventId,slug,source}) {
  if (!pool || typeof pool.connect !== 'function') throw new Error('Durable database unavailable');
  if (typeof eventId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(eventId))
    throw new Error('Invalid drink event ID');
  if (typeof slug !== 'string' || !/^[a-z0-9-]{1,64}$/.test(slug))
    throw new Error('Invalid drink slug');
  if (typeof source !== 'string' || !/^[a-z0-9_-]{1,32}$/.test(source))
    throw new Error('Invalid drink source');
  const client=await pool.connect();
  let begun=false;
  try {
    await client.query('BEGIN'); begun=true;
    const inserted=await client.query(storageQueries.insertDrink,[eventId,slug,source]);
    let total=null;
    if (inserted.rowCount===1) {
      const updated=await client.query(storageQueries.incrementDrinkMetric);
      if (updated.rowCount!==1) throw new Error('Durable counter update failed');
      total=updated.rows[0].total;
    } else if (inserted.rowCount!==0) {
      throw new Error('Unexpected drink insert result');
    }
    await client.query('COMMIT'); begun=false;
    return {recorded:inserted.rowCount===1,total};
  } catch {
    if (begun) { try { await client.query('ROLLBACK'); } catch {} }
    throw new Error('Durable drink transaction failed');
  } finally {
    client.release();
  }
}
