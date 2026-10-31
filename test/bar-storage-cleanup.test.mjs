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
 assert.deepEqual(result,{sessions:2,messages:2,reports:2,audit:2,drinkEvents:2});
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

test('retention also removes reports orphaned by expired session cascade',async()=>{
 const x=fixture();
 await purgeExpiredBarRows(x.pool);
 const messageCleanup=x.calls.findIndex(sql=>sql.includes('DELETE FROM moltbeer_private.bar_messages'));
 const reportCleanup=x.calls.findIndex(sql=>sql.includes('DELETE FROM moltbeer_private.bar_reports'));
 assert.ok(messageCleanup>=0&&reportCleanup>messageCleanup);
 const sql=x.calls[reportCleanup];
 assert.match(sql,/r\.expires_at<=now\(\)/);
 assert.match(sql,/NOT EXISTS/);
 assert.match(sql,/m\.message_id::text=r\.message_id/);
 assert.equal(x.calls.at(-1),'COMMIT');
});

test('cleanup executes all five bounded retention deletes in order',async()=>{
 const x=fixture();await purgeExpiredBarRows(x.pool);
 const statements=x.calls.filter(s=>s.startsWith('DELETE FROM moltbeer_private.'));
 assert.equal(statements.length,5);
 for(const table of ['bar_sessions','bar_messages','bar_reports','bar_moderation_audit','drink_events']){
  assert.ok(statements.some(s=>s.includes('moltbeer_private.'+table)),'missing '+table);
 }
 assert.match(statements.find(s=>s.includes('bar_sessions')),/expires_at<=now\(\)/);
 assert.match(statements.find(s=>s.includes('bar_messages')),/expires_at<=now\(\)/);
 assert.match(statements.find(s=>s.includes('drink_events')),/interval '24 hours'/);
 assert.equal(x.calls.at(-1),'COMMIT');
});

test('invalid cleanup row counts roll back and release the connection',async()=>{
 for(const invalid of [-1,1.5,undefined,Number.NaN]){
  const calls=[];let released=false;
  const client={async query(sql){
   calls.push(sql);
   if(sql==='BEGIN'||sql==='COMMIT'||sql==='ROLLBACK')return {rowCount:0};
   return {rowCount:invalid};
  },release(){released=true}};
  await assert.rejects(purgeExpiredBarRows({async connect(){return client}}),/cleanup transaction failed/);
  assert.equal(calls.at(-1),'ROLLBACK');
  assert.equal(calls.includes('COMMIT'),false);
  assert.equal(released,true);
 }
});

test('commit failure triggers rollback attempt without leaking driver details',async()=>{
 const calls=[];let released=false;
 const client={async query(sql){
  calls.push(sql);
  if(sql==='COMMIT')throw Error('private connection password');
  return {rowCount:1};
 },release(){released=true}};
 await assert.rejects(purgeExpiredBarRows({async connect(){return client}}),err=>{
  assert.equal(err.message,'Durable cleanup transaction failed');
  assert.equal(err.message.includes('password'),false);
  return true;
 });
 assert.equal(calls.at(-1),'ROLLBACK');
 assert.equal(released,true);
});
