import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {recordDrinkExactlyOnce} from '../bar-storage-transactions.mjs';

function fake({duplicate=false,failCounter=false}={}){
 const calls=[];let released=false;
 const client={async query(sql,args){calls.push({sql,args});
  if(sql==='BEGIN'||sql==='COMMIT'||sql==='ROLLBACK')return {rowCount:0};
  if(sql.includes('INSERT INTO moltbeer_private.drink_events'))return {rowCount:duplicate?0:1,rows:duplicate?[]:[{event_id:args[0]}]};
  if(sql.includes('INSERT INTO moltbeer_private.bar_metrics')){if(failCounter)throw Error('database unavailable');return {rowCount:1,rows:[{total:'1'}]};}
  throw Error('unexpected query');},release(){released=true}};
 return {pool:{async connect(){return client}},calls,get released(){return released}};
}
test('one event inserts and increments in one committed transaction',async()=>{
 const x=fake();const r=await recordDrinkExactlyOnce(x.pool,{eventId:randomUUID(),slug:'cache-lager',source:'rest'});
 assert.equal(r.recorded,true);assert.equal(r.total,'1');
 assert.deepEqual(x.calls.map(v=>v.sql==='BEGIN'?'BEGIN':v.sql==='COMMIT'?'COMMIT':v.sql.startsWith('INSERT INTO moltbeer_private.drink_events')?'event':'metric'),['BEGIN','event','metric','COMMIT']);
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
