import test from 'node:test';
import assert from 'node:assert/strict';
import {storageQueries} from '../bar-storage-queries.mjs';
import {purgeExpiredBarRows} from '../bar-storage-cleanup.mjs';

test('30-minute sessions and 24-hour messages have no hard-coded TTL exemptions',()=>{
 assert.match(storageQueries.expireSessions,
  /^DELETE FROM moltbeer_private\.bar_sessions WHERE expires_at<=now\(\)$/);
 assert.match(storageQueries.expireMessages,
  /^DELETE FROM moltbeer_private\.bar_messages WHERE expires_at<=now\(\)$/);
});

test('cleanup applies the unexceptioned TTL queries inside one transaction',async()=>{
 const statements=[];
 let released=false;
 const pool={connect:async()=>({
  query:async sql=>{statements.push(sql);return {rowCount:0};},
  release:()=>{released=true;}
 })};
 const removed=await purgeExpiredBarRows(pool);
 assert.deepEqual(removed,{sessions:0,messages:0,reports:0,audit:0,drinkEvents:0});
 assert.deepEqual(statements,[
  'BEGIN',storageQueries.expireSessions,storageQueries.expireMessages,
  storageQueries.expireReports,storageQueries.expireAudit,
  storageQueries.expireDrinkEvents,'COMMIT'
 ]);
 assert.equal(released,true);
});
