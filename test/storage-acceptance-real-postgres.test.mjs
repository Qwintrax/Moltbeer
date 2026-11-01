// Real PostgreSQL transaction boundary test, never connects to Supabase.
// CI provides an ephemeral PostgreSQL service; no production credentials.
import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {randomUUID} from 'node:crypto';
import {rollbackOnlyPool} from '../scripts/storage-acceptance.mjs';

test('real PostgreSQL nested COMMIT remains inside outer ROLLBACK',async t=>{
 const url=process.env.MOLTBEER_CI_POSTGRES_URL;
 if(!url){t.skip('isolated PostgreSQL CI service not configured');return;}
 const u=new URL(url);
 assert.equal(u.hostname,'127.0.0.1','refuse non-local database');
 assert.equal(u.pathname,'/moltbeer_ci','refuse non-CI database');
 const pool=new pg.Pool({connectionString:url,max:1,connectionTimeoutMillis:5000});
 const client=await pool.connect();
 const id=randomUUID();
 let outer=false;
 try{
  await client.query('CREATE TEMP TABLE IF NOT EXISTS acceptance_rollback_probe (id uuid PRIMARY KEY)');
  await client.query('BEGIN');outer=true;
  const scoped=rollbackOnlyPool(client);
  const lease=await scoped.connect();
  await lease.query('BEGIN');
  await lease.query('INSERT INTO acceptance_rollback_probe (id) VALUES ($1)',[id]);
  await lease.query('COMMIT');
  assert.equal((await lease.query('SELECT count(*)::int AS n FROM acceptance_rollback_probe WHERE id=$1',[id])).rows[0].n,1);
  assert.throws(()=>scoped.query('COMMIT'),/Direct transaction control/);
  await assert.rejects(lease.query('SELECT 1; COMMIT'),/Unexpected transaction control/);
  await client.query('ROLLBACK');outer=false;
  assert.equal((await client.query('SELECT count(*)::int AS n FROM acceptance_rollback_probe WHERE id=$1',[id])).rows[0].n,0);
 }finally{
  if(outer)await client.query('ROLLBACK').catch(()=>{});
  client.release();
  await pool.end();
 }
});
