// Real PostgreSQL cross-source idempotency at the durable transaction layer.
// NOT an HTTP/MCP endpoint test and never uses production credentials.
import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {randomUUID} from 'node:crypto';
import {recordDrinkExactlyOnce} from '../bar-storage-transactions.mjs';

test('real PostgreSQL deduplicates shared event IDs across REST and MCP sources',async t=>{
 const url=process.env.MOLTBEER_CI_POSTGRES_URL;
 if(!url){t.skip('isolated PostgreSQL CI service not configured');return;}
 const target=new URL(url);
 assert.equal(target.hostname,'127.0.0.1','refuse non-local database');
 assert.equal(target.pathname,'/moltbeer_ci','refuse non-CI database');
 const pool=new pg.Pool({connectionString:url,max:5,connectionTimeoutMillis:5000});
 try{
  await pool.query('CREATE SCHEMA IF NOT EXISTS moltbeer_private');
  await pool.query(`CREATE TABLE IF NOT EXISTS moltbeer_private.drink_events (
   event_id uuid PRIMARY KEY,drink_slug text NOT NULL,source text NOT NULL,
   served_at timestamptz NOT NULL DEFAULT now())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS moltbeer_private.bar_metrics (
   metric text PRIMARY KEY,total bigint NOT NULL DEFAULT 0,
   updated_at timestamptz NOT NULL DEFAULT now())`);
  const shared=randomUUID();
  const distinct=randomUUID();
  const attempts=await Promise.all([
   recordDrinkExactlyOnce(pool,{eventId:shared,slug:'moltbeer',source:'rest'}),
   recordDrinkExactlyOnce(pool,{eventId:shared,slug:'moltbeer',source:'mcp'}),
   recordDrinkExactlyOnce(pool,{eventId:shared,slug:'moltbeer',source:'human_world'}),
   recordDrinkExactlyOnce(pool,{eventId:distinct,slug:'moltbeer',source:'mcp'})
  ]);
  assert.equal(attempts.filter(x=>x.recorded).length,2,'shared event + distinct event only');
  assert.equal(attempts.filter(x=>!x.recorded).length,2,'cross-source duplicate attempts ignored');
  const rows=await pool.query('SELECT event_id,source FROM moltbeer_private.drink_events ORDER BY event_id');
  assert.equal(rows.rowCount,2);
  assert.deepEqual(new Set(rows.rows.map(x=>x.event_id)),new Set([shared,distinct]));
  const metric=await pool.query("SELECT total FROM moltbeer_private.bar_metrics WHERE metric='drinks_served_since_storage_enabled'");
  assert.equal(Number(metric.rows[0].total),2,'metric increments only for unique event IDs');
 }finally{
  await pool.query('DROP SCHEMA IF EXISTS moltbeer_private CASCADE').catch(()=>{});
  await pool.end();
 }
});
