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
