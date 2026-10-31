import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {recordDrinkExactlyOnce} from '../bar-storage-transactions.mjs';
import {durableDrinkEventId,pourDurableDrink,publicDurableError} from '../bar-storage-runtime.mjs';

function fake({duplicate=false,failCounter=false}={}){
 const calls=[];let released=false;
 const client={async query(sql,args){calls.push({sql,args});
  if(sql==='BEGIN'||sql==='COMMIT'||sql==='ROLLBACK')return {rowCount:0};
  if(sql.includes('pg_advisory_xact_lock'))return {rowCount:1,rows:[{}]};
  if(sql.includes('count(*)::int AS n'))return {rowCount:1,rows:[{n:0}]};
  if(sql.includes('INSERT INTO moltbeer_private.drink_events'))return {rowCount:duplicate?0:1,rows:duplicate?[]:[{event_id:args[0]}]};
  if(sql.includes('INSERT INTO moltbeer_private.bar_metrics')){if(failCounter)throw Error('database unavailable');return {rowCount:1,rows:[{total:'1'}]};}
  throw Error('unexpected query');},release(){released=true}};
 return {pool:{async connect(){return client}},calls,get released(){return released}};
}
test('one event inserts and increments in one committed transaction',async()=>{
 const x=fake();const r=await recordDrinkExactlyOnce(x.pool,{eventId:randomUUID(),slug:'cache-lager',source:'rest'});
 assert.equal(r.recorded,true);assert.equal(r.total,'1');
 assert.deepEqual(x.calls.map(v=>v.sql==='BEGIN'?'BEGIN':v.sql==='COMMIT'?'COMMIT':v.sql.startsWith('INSERT INTO moltbeer_private.drink_events')?'event':'metric'),['BEGIN','metric','metric','event','metric','COMMIT']);
 assert.equal(x.released,true);
});
test('duplicate event never increments the counter',async()=>{
 const x=fake({duplicate:true});const r=await recordDrinkExactlyOnce(x.pool,{eventId:randomUUID(),slug:'cache-lager',source:'rest'});
 assert.equal(r.recorded,false);assert.equal(x.calls.some(v=>v.sql.includes('bar_metrics')),false);
});
test('counter error rolls back and releases client',async()=>{
 const x=fake({failCounter:true});await assert.rejects(recordDrinkExactlyOnce(x.pool,{eventId:randomUUID(),slug:'cache-lager',source:'rest'}),/transaction failed/);
 assert.equal(x.calls.at(-1).sql,'ROLLBACK');assert.equal(x.released,true);
});
test('invalid input cannot reach database',async()=>{
 const x=fake();await assert.rejects(recordDrinkExactlyOnce(x.pool,{eventId:'bad',slug:'x',source:'rest'}));
 assert.equal(x.calls.length,0);
 await assert.rejects(recordDrinkExactlyOnce(x.pool,{eventId:randomUUID(),slug:'cache-lager',source:'test'}),/Invalid drink source/);
 assert.equal(x.calls.length,0);
});

test('malformed long event IDs are rejected before opening a pool',async()=>{
 const x=fake();
 await assert.rejects(recordDrinkExactlyOnce(x.pool,{eventId:randomUUID()+'----',slug:'cache-lager',source:'rest'}),/Invalid drink event ID/);
 assert.equal(x.calls.length,0);
});
test('pool connection errors never expose credentials',async()=>{
 const pool={async connect(){throw Error('private password must not leak')}};
 await assert.rejects(recordDrinkExactlyOnce(pool,{eventId:randomUUID(),slug:'cache-lager',source:'rest'}),err=>{
  assert.equal(err.message,'Durable drink transaction failed');
  assert.equal(err.message.includes('password'),false);
  return true;
 });
});

test('stable caller retry key yields same event across REST retries; DB increments only once',async()=>{
 const key='retry-3fd50ad9-671c-41a6-9b01';
 const first=fake();
 const second=fake({duplicate:true});
 const firstDrink=await pourDurableDrink(first.pool,'cache-lager','rest',()=>({free:true}),key);
 const retriedDrink=await pourDurableDrink(second.pool,'cache-lager','rest',()=>({free:true}),key);
 assert.deepEqual(firstDrink,{free:true});
 assert.deepEqual(retriedDrink,{free:true});
 const event=(x)=>x.calls.find(c=>c.sql.includes('INSERT INTO moltbeer_private.drink_events')).args[0];
 assert.equal(event(first),event(second));
 assert.equal(first.calls.some(c=>c.sql.includes('INSERT INTO moltbeer_private.bar_metrics')),true);
 assert.equal(second.calls.some(c=>c.sql.includes('INSERT INTO moltbeer_private.bar_metrics')),false);
 assert.equal(first.released,true);
 assert.equal(second.released,true);
});
test('retry keys are scoped to drink and transport and rejected when malformed',async()=>{
 const key='retry-3fd50ad9-671c-41a6-9b01';
 assert.equal(durableDrinkEventId('moltbeer','rest',key),durableDrinkEventId('moltbeer','rest',key));
 assert.notEqual(durableDrinkEventId('moltbeer','rest',key),durableDrinkEventId('moltbeer','mcp',key));
 assert.notEqual(durableDrinkEventId('moltbeer','rest',key),durableDrinkEventId('cache-lager','rest',key));
 assert.match(durableDrinkEventId('moltbeer','rest',key),/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/);
 const x=fake();
 await assert.rejects(pourDurableDrink(x.pool,'moltbeer','rest',()=>({}), 'short'),err=>{
  assert.equal(publicDurableError(err).status,400);
  return true;
 });
 await assert.rejects(pourDurableDrink(x.pool,'moltbeer','rest',()=>({}), 'a'.repeat(129)),/Invalid idempotency key/);
 assert.equal(x.calls.length,0);
});

test('database connection failure rejects before any drink is produced or recorded',async()=>{
 let produced=0;
 const pool={connect:async()=>{throw Error('postgresql://secret:password@private-host')}};
 await assert.rejects(pourDurableDrink(pool,'moltbeer','rest',()=>{produced++;return {free:true}},'retry-connection-failure-12345'),err=>{
  assert.equal(err.message,'Durable drink transaction failed');
  assert.equal(publicDurableError(err).status,503);
  assert.doesNotMatch(err.message,/password|private-host/);
  return true;
 });
 assert.equal(produced,0);
});
