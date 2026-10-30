import test from 'node:test';
import assert from 'node:assert/strict';
import {storageQueries} from '../bar-storage-queries.mjs';

test('queries are scoped to the dedicated private schema',()=>{
 for(const sql of Object.values(storageQueries)) assert.ok(sql.includes('moltbeer_private.'));
});
test('writes are parameterized and authenticated deletes are scoped',()=>{
 assert.ok(storageQueries.insertSession.includes('$6'));
 assert.ok(storageQueries.eraseOwnMessage.includes('session_id=$2'));
});
test('drink events are idempotent and counters atomic',()=>{
 assert.ok(storageQueries.insertDrink.includes('ON CONFLICT (event_id) DO NOTHING'));
 assert.ok(storageQueries.incrementDrinkMetric.includes('DO UPDATE'));
});
test('cleanup covers all expiring private records',()=>{
 for(const key of ['expireSessions','expireMessages','expireReports','expireAudit']) assert.ok(storageQueries[key].includes('expires_at<=now()'));
});
