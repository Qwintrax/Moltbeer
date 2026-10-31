import test from 'node:test';
import assert from 'node:assert/strict';
import {assertDurableWriteCapacity} from '../bar-storage-quotas.mjs';

function fake(n,{existing=false}={}){
 const calls=[];
 return {calls,client:{async query(sql,args=[]){
  calls.push({sql,args});
  if(sql.includes('pg_advisory_xact_lock'))return {rows:[{}],rowCount:1};
  if(sql.includes('count(*)::int AS n'))return {rows:[{n}],rowCount:1};
  if(sql.includes('SELECT 1 FROM moltbeer_private.drink_events WHERE event_id=$1'))
   return {rows:existing?[{one:1}]:[],rowCount:existing?1:0};
  throw Error('Unexpected SQL');
 }}};
}
test('free-tier durable chat cap uses a shared advisory lock',async()=>{
 const x=fake(2999);
 await assertDurableWriteCapacity(x.client,'chat');
 assert.match(x.calls[0].sql,/pg_advisory_xact_lock/);
 assert.equal(x.calls[0].args[0],20261031);
 assert.match(x.calls[1].sql,/bar_messages/);
 await assert.rejects(assertDurableWriteCapacity(fake(3000).client,'chat'),e=>e.code==='BAR_CAPACITY');
});
test('free-tier drink cap bounds event retention window',async()=>{
 const x=fake(19999);
 await assertDurableWriteCapacity(x.client,'drink');
 assert.equal(x.calls[0].args[0],20261032);
 assert.match(x.calls[1].sql,/drink_events/);
 assert.match(x.calls[1].sql,/24 hours/);
 await assert.rejects(assertDurableWriteCapacity(fake(20000).client,'drink'),e=>e.code==='BAR_CAPACITY');
});
test('invalid capacity data fails closed rather than allowing unbounded writes',async()=>{
 await assert.rejects(assertDurableWriteCapacity(fake(undefined).client,'chat'),/Invalid capacity sample/);
 await assert.rejects(assertDurableWriteCapacity(fake(-1).client,'drink'),/Invalid capacity sample/);
});

test('idempotent drink retries at capacity are accepted but new events remain blocked',async()=>{
 const eventId='e50f33a2-64cb-4f8c-9359-f7f5d19f56ca';
 const existing=fake(20000,{existing:true});
 await assertDurableWriteCapacity(existing.client,'drink',eventId);
 assert.equal(existing.calls[2].args[0],eventId);
 const newEvent=fake(20000);
 await assert.rejects(assertDurableWriteCapacity(newEvent.client,'drink',eventId),e=>e.code==='BAR_CAPACITY');
 assert.equal(newEvent.calls.length,3);
 const below=fake(19999);
 await assertDurableWriteCapacity(below.client,'drink',eventId);
 assert.equal(below.calls.length,2,'avoid extra lookup below the cap');
});
