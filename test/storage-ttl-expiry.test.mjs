import test from 'node:test';
import assert from 'node:assert/strict';
import {storageQueries} from '../bar-storage-queries.mjs';
import {purgeExpiredBarRows} from '../bar-storage-cleanup.mjs';

test('ordinary expired rows are removed; reserved canary grace ends after six hours',()=>{
 assert.match(storageQueries.expireSessions,/WHERE expires_at<=now\(\)/);
 assert.match(storageQueries.expireMessages,/WHERE expires_at<=now\(\)/);
 assert.match(storageQueries.expireSessions,/session_id<>'b237bf95-c9df-45b8-91cb-7c1fe4e51f26'::uuid OR joined_at<=now\(\)-interval '6 hours'/);
 assert.match(storageQueries.expireMessages,/message_id<>'7cdd1b81-7955-4caf-a575-c4d18e923dbf'::uuid OR created_at<=now\(\)-interval '6 hours'/);
 // These are OR predicates: after six hours even reserved canary IDs expire.
 assert.doesNotMatch(storageQueries.expireSessions,/session_id<>[^\n]+\)$/);
 assert.doesNotMatch(storageQueries.expireMessages,/message_id<>[^\n]+\)$/);
});

test('cleanup runs all TTL statements inside one transaction',async()=>{
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
