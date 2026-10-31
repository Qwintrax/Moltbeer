import test from 'node:test';
import assert from 'node:assert/strict';
import {rollbackOnlyPool} from '../scripts/storage-acceptance.mjs';

// This tests the transaction boundary without connecting to production.
// All SQL statements are captured by an in-memory client.
test('rollback-only adapter releases nested commits without committing outer transaction', async () => {
  const sql=[];
  const client={query:async statement=>{sql.push(statement);return {rowCount:0,rows:[]};}};
  const pool=rollbackOnlyPool(client);
  const lease=await pool.connect();
  await client.query('BEGIN');
  await lease.query('BEGIN');
  await lease.query('INSERT INTO isolated_probe VALUES (1)');
  await lease.query('COMMIT');
  await client.query('ROLLBACK');
  assert.deepEqual(sql,['BEGIN','SAVEPOINT moltbeer_accept_1','INSERT INTO isolated_probe VALUES (1)','RELEASE SAVEPOINT moltbeer_accept_1','ROLLBACK']);
  assert.equal(sql.includes('COMMIT'),false);
});

test('rollback-only adapter rejects unbalanced nested transactions', async () => {
  const sql=[];
  const client={query:async statement=>{sql.push(statement);return {rowCount:0,rows:[]};}};
  const lease=await rollbackOnlyPool(client).connect();
  await assert.rejects(lease.query('COMMIT'),/Missing acceptance savepoint/);
  await assert.rejects(lease.query('ROLLBACK'),/Missing acceptance savepoint/);
  await lease.query('BEGIN');
  await assert.rejects(lease.query('BEGIN'),/Concurrent transaction/);
  await lease.query('ROLLBACK');
  assert.deepEqual(sql,['SAVEPOINT moltbeer_accept_1','ROLLBACK TO SAVEPOINT moltbeer_accept_1','RELEASE SAVEPOINT moltbeer_accept_1']);
});

test('rollback-only adapter rejects direct transaction control and semicolon bypasses', async () => {
  const sql=[];
  const client={query:async statement=>{sql.push(statement);return {rowCount:0,rows:[]};}};
  const pool=rollbackOnlyPool(client);
  assert.throws(()=>pool.query('COMMIT'),/Direct transaction control/);
  assert.throws(()=>pool.query('ROLLBACK;'),/Direct transaction control/);
  assert.throws(()=>pool.query('START TRANSACTION'),/Direct transaction control/);
  assert.throws(()=>pool.query('SELECT 1; COMMIT'),/Direct transaction control/);
  const lease=await pool.connect();
  await assert.rejects(lease.query('COMMIT;'),/Missing acceptance savepoint/);
  await client.query('BEGIN');
  await lease.query('BEGIN;');
  await lease.query('SELECT 1');
  await assert.rejects(lease.query('SELECT 1; COMMIT'),/Unexpected transaction control/);
  await lease.query('COMMIT;');
  await assert.rejects(lease.query('ROLLBACK;'),/Missing acceptance savepoint/);
  await client.query('ROLLBACK');
  assert.deepEqual(sql,['BEGIN','SAVEPOINT moltbeer_accept_1','SELECT 1','RELEASE SAVEPOINT moltbeer_accept_1','ROLLBACK']);
});

test('acceptance rejects pg query-config objects and comment-hidden transaction commands',async()=>{
 const sql=[];
 const client={query:async statement=>{sql.push(statement);return {rowCount:0,rows:[]};}};
 const pool=rollbackOnlyPool(client);
 const unsafe=[
  {text:'COMMIT'},
  {text:'ROLLBACK'},
  '/* comment */ COMMIT',
  '-- comment\\nCOMMIT'.replace('\\n','\n'),
  'SELECT 1; /* comment */ COMMIT',
  'SELECT 1; -- comment\\nCOMMIT'.replace('\\n','\n')
 ];
 for(const statement of unsafe)assert.throws(()=>pool.query(statement),/Direct transaction control/);
 const lease=await pool.connect();
 for(const statement of unsafe)await assert.rejects(lease.query(statement),/Unexpected transaction control/);
 assert.deepEqual(sql,[],'no unsafe SQL reaches the physical connection');
 await lease.query('SELECT 1;');
 assert.deepEqual(sql,['SELECT 1;'],'single benign statement remains supported');
});
