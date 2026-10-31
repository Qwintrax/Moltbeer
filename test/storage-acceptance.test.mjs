import test from 'node:test';
import assert from 'node:assert/strict';
import {rollbackOnlyPool,verifyDurableStorageRollback} from '../scripts/storage-acceptance.mjs';

test('acceptance turns nested commits into savepoint releases, never real COMMIT',async()=>{
 const sql=[];
 const physical={query:async(statement)=>{sql.push(statement);return {rowCount:0,rows:[]}}};
 const scoped=rollbackOnlyPool(physical);
 const lease=await scoped.connect();
 await lease.query('BEGIN');
 await lease.query('INSERT INTO moltbeer_private.bar_sessions (session_id) VALUES ($1)',['fake']);
 await lease.query('COMMIT');
 assert.equal(sql[0],'SAVEPOINT moltbeer_accept_1');
 assert.equal(sql[1],'INSERT INTO moltbeer_private.bar_sessions (session_id) VALUES ($1)');
 assert.equal(sql[2],'RELEASE SAVEPOINT moltbeer_accept_1');
 assert.equal(sql.includes('COMMIT'),false);
 await lease.query('BEGIN');
 await lease.query('ROLLBACK');
 assert.deepEqual(sql.slice(-3),[
  'SAVEPOINT moltbeer_accept_2',
  'ROLLBACK TO SAVEPOINT moltbeer_accept_2',
  'RELEASE SAVEPOINT moltbeer_accept_2'
 ]);
});
test('acceptance rolls back outer real transaction after an adapter failure',async()=>{
 const queries=[];let released=0;
 const client={
  async query(sql){queries.push(sql);
   if(sql.startsWith('SELECT pg_advisory_xact_lock'))throw Error('private connection secret must not leak');
   return {rowCount:0,rows:[]};
  },
  release(){released++}
 };
 await assert.rejects(verifyDurableStorageRollback({connect:async()=>client}),err=>{
  assert.match(err.message,/Private rollback acceptance failed at join and move/);
  assert.doesNotMatch(err.message,/secret|connection/);
  return true;
 });
 assert.equal(queries[0],'BEGIN');
 assert.equal(queries.at(-1),'ROLLBACK');
 assert.equal(queries.includes('COMMIT'),false);
 assert.equal(released,1);
});
test('acceptance requires a real PostgreSQL connection handle',async()=>{
 await assert.rejects(verifyDurableStorageRollback(null),/pool unavailable/);
});

test('acceptance never persists a failed outer transaction and releases its client',async()=>{
 const queries=[];let released=0;
 const client={
  query:async(sql)=>{queries.push(sql);if(sql==='SAVEPOINT moltbeer_accept_1')throw Error('postgresql://user:secret@private-db');return {rowCount:0,rows:[]}},
  release:()=>{released++}
 };
 await assert.rejects(verifyDurableStorageRollback({connect:async()=>client}),err=>{
  assert.match(err.message,/Private rollback acceptance failed at join and move/);
  assert.doesNotMatch(err.message,/secret|private-db|postgresql/);
  return true;
 });
 assert.deepEqual(queries.slice(0,3),['BEGIN','SAVEPOINT moltbeer_accept_1','ROLLBACK']);
 assert.equal(released,1);
 assert.equal(queries.includes('COMMIT'),false);
});
