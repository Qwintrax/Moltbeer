import {storageQueries} from './bar-storage-queries.mjs';
import {assertDurableWriteCapacity} from './bar-storage-quotas.mjs';

// Accepts a connected node-postgres Pool or compatible client provider.
// This does NOT enable the adapter on live endpoints. All writes fail closed.
export async function recordDrinkExactlyOnce(pool,{eventId,slug,source}) {
  if (!pool || typeof pool.connect !== 'function') throw new Error('Durable database unavailable');
  if (typeof eventId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId))
    throw new Error('Invalid drink event ID');
  if (typeof slug !== 'string' || !/^[a-z0-9-]{1,64}$/.test(slug))
    throw new Error('Invalid drink slug');
  if (typeof source !== 'string' || !['rest','mcp','human_world'].includes(source))
    throw new Error('Invalid drink source');
  let client;
  try { client=await pool.connect(); }
  catch { throw new Error('Durable drink transaction failed'); }
  let begun=false;
  try {
    await client.query('BEGIN'); begun=true;
    await assertDurableWriteCapacity(client,'drink',eventId);
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
  } catch (err) {
    if (begun) { try { await client.query('ROLLBACK'); } catch {} }
    if(err?.code==='BAR_CAPACITY')throw err;
    throw new Error('Durable drink transaction failed');
  } finally {
    client.release();
  }
}
