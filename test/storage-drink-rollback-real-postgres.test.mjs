// Failure-injection test against isolated REAL PostgreSQL only.
// Validates atomicity when metric update fails after inserting a drink event.
import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {randomUUID} from 'node:crypto';
import {recordDrinkExactlyOnce} from '../bar-storage-transactions.mjs';

test('real PostgreSQL rolls back event insert if metric update fails, then retry succeeds',async t=>{
 const url=process.env.MOLTBEER_CI_POSTGRES_URL;
 if(!url){t.skip('isolated PostgreSQL CI service not configured');return;}
 const target=new URL(url);
 assert.equal(target.hostname,'127.0.0.1','refuse external PostgreSQL');
 assert.equal(target.pathname,'/moltbeer_ci','refuse non-CI database');
 const pool=new pg.Pool({connectionString:url,max:2,connectionTimeoutMillis:5000});
 const eventId=randomUUID();
 try{
  await pool.query('CREATE SCHEMA IF NOT EXISTS moltbeer_private');
  await pool.query(`CREATE TABLE IF NOT EXISTS moltbeer_private.drink_events (
   event_id uuid PRIMARY KEY,drink_slug text NOT NULL,source text NOT NULL,
   served_at timestamptz NOT NULL DEFAULT now())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS moltbeer_private.bar_metrics (
   metric text PRIMARY KEY,total bigint NOT NULL DEFAULT 0,
   updated_at timestamptz NOT NULL DEFAULT now())`);
  await pool.query(`CREATE OR REPLACE FUNCTION moltbeer_private.reject_metric()
   RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
    RAISE EXCEPTION 'intentional_ci_failure';
   END $$`);
  await pool.query(`CREATE TRIGGER ci_reject_metric BEFORE INSERT OR UPDATE
   ON moltbeer_private.bar_metrics FOR EACH ROW
   EXECUTE FUNCTION moltbeer_private.reject_metric()`);
  await assert.rejects(recordDrinkExactlyOnce(pool,{eventId,slug:'moltbeer',source:'mcp'}),/Durable drink transaction failed/);
  const before=await pool.query('SELECT count(*)::int AS n FROM moltbeer_private.drink_events WHERE event_id=$1',[eventId]);
  assert.equal(before.rows[0].n,0,'failed metric write must roll back drink event');
  await pool.query('DROP TRIGGER ci_reject_metric ON moltbeer_private.bar_metrics');
  const retried=await recordDrinkExactlyOnce(pool,{eventId,slug:'moltbeer',source:'mcp'});
  assert.equal(retried.recorded,true,'safe retry must succeed after failure cleared');
  const after=await pool.query('SELECT count(*)::int AS n FROM moltbeer_private.drink_events WHERE event_id=$1',[eventId]);
  assert.equal(after.rows[0].n,1);
  const metric=await pool.query("SELECT total FROM moltbeer_private.bar_metrics WHERE metric='drinks_served_since_storage_enabled'");
  assert.equal(Number(metric.rows[0].total),1);
 }finally{
  await pool.query('DROP SCHEMA IF EXISTS moltbeer_private CASCADE').catch(()=>{});
  await pool.end();
 }
});
