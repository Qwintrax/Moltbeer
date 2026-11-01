// CI-only integration: capacity ceiling, idempotent retry, and atomic rollback.
import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {randomUUID} from 'node:crypto';
import {recordDrinkExactlyOnce} from '../bar-storage-transactions.mjs';
import {assertDurableWriteCapacity} from '../bar-storage-quotas.mjs';

test('real PostgreSQL enforces drink cap and preserves idempotency at the limit',async t=>{
 const url=process.env.MOLTBEER_CI_POSTGRES_URL;
 if(!url){t.skip('isolated PostgreSQL CI service not configured');return;}
 assert.equal(url,'postgresql://moltbeer_ci:ci_only_password@127.0.0.1:5432/moltbeer_ci','CI-only guard');
 const pool=new pg.Pool({connectionString:url,max:4,connectionTimeoutMillis:5000});
 const eventId=randomUUID();
 try {
  await pool.query('CREATE SCHEMA IF NOT EXISTS moltbeer_private');
  await pool.query(`CREATE TABLE IF NOT EXISTS moltbeer_private.drink_events (
   event_id uuid PRIMARY KEY, drink_slug text NOT NULL, source text NOT NULL,
   served_at timestamptz NOT NULL DEFAULT now())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS moltbeer_private.bar_metrics (
   metric text PRIMARY KEY, total bigint NOT NULL DEFAULT 0,
   updated_at timestamptz NOT NULL DEFAULT now())`);
  await pool.query('INSERT INTO moltbeer_private.drink_events(event_id,drink_slug,source,served_at) SELECT gen_random_uuid(),\'moltbeer\',\'rest\',now() FROM generate_series(1,19999)');
  const first=await recordDrinkExactlyOnce(pool,{eventId,slug:'moltbeer',source:'rest'});
  assert.equal(first.recorded,true,'last slot can be filled');
  const retry=await recordDrinkExactlyOnce(pool,{eventId,slug:'moltbeer',source:'mcp'});
  assert.equal(retry.recorded,false,'existing event remains idempotent at cap');
  await assert.rejects(recordDrinkExactlyOnce(pool,{eventId:randomUUID(),slug:'moltbeer',source:'rest'}),e=>e?.code==='BAR_CAPACITY');
  const count=await pool.query('SELECT count(*)::int AS n FROM moltbeer_private.drink_events');
  assert.equal(count.rows[0].n,20000,'no over-cap insert');
  const metric=await pool.query("SELECT total FROM moltbeer_private.bar_metrics WHERE metric='drinks_served_since_storage_enabled'");
  assert.equal(Number(metric.rows[0].total),1,'only new drink increments metric');
  // Rolling 24h limit: historical events stay stored but do not occupy slots.
  await pool.query("UPDATE moltbeer_private.drink_events SET served_at=now()-interval '25 hours' WHERE event_id=$1",[eventId]);
  const fresh=await recordDrinkExactlyOnce(pool,{eventId:randomUUID(),slug:'moltbeer',source:'mcp'});
  assert.equal(fresh.recorded,true,'old drink no longer consumes a 24h slot');
  const active=await pool.query("SELECT count(*)::int AS n FROM moltbeer_private.drink_events WHERE served_at>now()-interval '24 hours'");
  assert.equal(active.rows[0].n,20000,'rolling-window cap maintained');
  const total=await pool.query("SELECT total FROM moltbeer_private.bar_metrics WHERE metric='drinks_served_since_storage_enabled'");
  assert.equal(Number(total.rows[0].total),2,'historical drink still counted in cumulative metric');
  // Test the separate chat capacity threshold inside a real transaction.
  await pool.query('CREATE TABLE moltbeer_private.bar_messages (id integer PRIMARY KEY, expires_at timestamptz NOT NULL)');
  await pool.query("INSERT INTO moltbeer_private.bar_messages(id,expires_at) SELECT i,now()+interval '1 hour' FROM generate_series(1,2999) AS i");
  const client=await pool.connect();
  try {
   await client.query('BEGIN');
   await assertDurableWriteCapacity(client,'chat');
   await client.query("INSERT INTO moltbeer_private.bar_messages VALUES (3000,now()+interval '1 hour')");
   await assert.rejects(assertDurableWriteCapacity(client,'chat'),e=>e?.code==='BAR_CAPACITY');
   await client.query("UPDATE moltbeer_private.bar_messages SET expires_at=now()-interval '1 hour' WHERE id=1");
   await assertDurableWriteCapacity(client,'chat');
   await client.query('ROLLBACK');
  } finally { client.release(); }
  const chatCount=await pool.query('SELECT count(*)::int AS n FROM moltbeer_private.bar_messages');
  assert.equal(chatCount.rows[0].n,2999,'test transaction rolled back');
 } finally {
  await pool.query('DROP SCHEMA IF EXISTS moltbeer_private CASCADE').catch(()=>{});
  await pool.end();
 }
});
