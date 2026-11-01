// Isolated PostgreSQL integration test of the actual durable drink module.
// Uses minimal contract tables in a throwaway GitHub Actions database ONLY.
// This is not a production migration, backup test, or public REST/MCP test.
import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {randomUUID} from 'node:crypto';
import {recordDrinkExactlyOnce} from '../bar-storage-transactions.mjs';

test('real PostgreSQL serializes concurrent drink retries and counts exactly once',async t=>{
 const url=process.env.MOLTBEER_CI_POSTGRES_URL;
 if(!url){t.skip('isolated PostgreSQL CI service not configured');return;}
 const target=new URL(url);
 assert.equal(target.hostname,'127.0.0.1','refuse external PostgreSQL');
 assert.equal(target.pathname,'/moltbeer_ci','refuse non-CI database');
 const pool=new pg.Pool({connectionString:url,max:5,connectionTimeoutMillis:5000});
 try{
  await pool.query('CREATE SCHEMA IF NOT EXISTS moltbeer_private');
  await pool.query(`CREATE TABLE IF NOT EXISTS moltbeer_private.drink_events (
    event_id uuid PRIMARY KEY, drink_slug text NOT NULL, source text NOT NULL,
    served_at timestamptz NOT NULL DEFAULT now())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS moltbeer_private.bar_metrics (
    metric text PRIMARY KEY, total bigint NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now())`);
  const eventId=randomUUID();
  const results=await Promise.all(Array.from({length:12},()=>recordDrinkExactlyOnce(pool,{
   eventId,slug:'moltbeer',source:'rest'
  })));
  assert.equal(results.filter(x=>x.recorded).length,1,'one successful insert');
  assert.equal(results.filter(x=>!x.recorded).length,11,'retries suppressed');
  const count=await pool.query('SELECT count(*)::int AS n FROM moltbeer_private.drink_events WHERE event_id=$1',[eventId]);
  assert.equal(count.rows[0].n,1);
  const metric=await pool.query("SELECT total FROM moltbeer_private.bar_metrics WHERE metric='drinks_served_since_storage_enabled'");
  assert.equal(Number(metric.rows[0].total),1,'exactly one durable metric increment');
 }finally{
  // This database is ephemeral CI only. Clean up even when an assertion fails.
  await pool.query('DROP SCHEMA IF EXISTS moltbeer_private CASCADE').catch(()=>{});
  await pool.end();
 }
});
