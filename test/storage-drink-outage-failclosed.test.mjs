// Verify that unavailable durable storage never silently records a drink.
// This is an isolated unit test: no production connection or writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {recordDrinkExactlyOnce} from '../bar-storage-transactions.mjs';

test('durable drink fails closed if pool cannot acquire a connection',async()=>{
 let calls=0;
 const pool={async connect(){calls++;throw Error('private-db-password-do-not-echo');}};
 await assert.rejects(
  recordDrinkExactlyOnce(pool,{eventId:randomUUID(),slug:'moltbeer',source:'rest'}),
  error=>error.message==='Durable drink transaction failed' &&
   !error.message.includes('private-db-password-do-not-echo')
 );
 assert.equal(calls,1);
});

test('durable drink fails closed without a pool and rejects invalid inputs before connecting',async()=>{
 await assert.rejects(
  recordDrinkExactlyOnce(null,{eventId:randomUUID(),slug:'moltbeer',source:'mcp'}),
  /Durable database unavailable/
 );
 let calls=0;
 const pool={async connect(){calls++;throw Error('must not connect');}};
 for(const input of [
  {eventId:'not-a-uuid',slug:'moltbeer',source:'rest'},
  {eventId:randomUUID(),slug:'../unsafe',source:'rest'},
  {eventId:randomUUID(),slug:'moltbeer',source:'unknown'}
 ]){
  await assert.rejects(recordDrinkExactlyOnce(pool,input),/Invalid drink/);
 }
 assert.equal(calls,0,'invalid requests must never reach storage');
});
