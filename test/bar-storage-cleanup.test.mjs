import test from 'node:test';
import assert from 'node:assert/strict';
import {purgeExpiredBarRows} from '../bar-storage-cleanup.mjs';
function fixture(failAt=-1){
 const calls=[];let released=false;let index=0;
 const client={async query(sql){calls.push(sql);if(sql==='BEGIN'||sql==='COMMIT'||sql==='ROLLBACK')return {rowCount:0};if(index++===failAt)throw Error('DB unavailable');return {rowCount:2}},release(){released=true}};
 return {pool:{async connect(){return client}},calls,get released(){return released}};
}
test('expiry cleanup removes sessions, messages, reports and audit atomically',async()=>{
 const x=fixture();const result=await purgeExpiredBarRows(x.pool);
 assert.deepEqual(result,{sessions:2,messages:2,reports:2,audit:2});
 assert.equal(x.calls[0],'BEGIN');assert.equal(x.calls.at(-1),'COMMIT');
 assert.equal(x.released,true);
});
test('expiry cleanup rolls back on partial failure',async()=>{
 const x=fixture(2);
 await assert.rejects(purgeExpiredBarRows(x.pool),/cleanup transaction failed/);
 assert.equal(x.calls.at(-1),'ROLLBACK');assert.equal(x.released,true);
});
test('missing database fails closed',async()=>{
 await assert.rejects(purgeExpiredBarRows(null),/unavailable/);
});

test('cleanup connection failures do not expose database secrets',async()=>{
 const pool={async connect(){throw Error('private connection password')}};
 await assert.rejects(purgeExpiredBarRows(pool),err=>{
  assert.equal(err.message,'Durable cleanup transaction failed');
  assert.equal(err.message.includes('password'),false);
  return true;
 });
});
