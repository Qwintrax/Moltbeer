import test from 'node:test';
import assert from 'node:assert/strict';
import {runPrivateRestartCanary} from '../scripts/storage-restart-canary.mjs';

test('restart check rejects unknown phases before opening a connection',async()=>{
 await assert.rejects(runPrivateRestartCanary(null,'unknown'),/Invalid private canary phase/);
});
test('restart check refuses an unavailable private database',async()=>{
 for(const phase of ['seed','verify','cleanup']){
  await assert.rejects(runPrivateRestartCanary(null,phase),/Private canary database unavailable/);
 }
});
test('restart check rolls back and releases a failed private transaction',async()=>{
 const log=[];
 const pool={connect:async()=>({
  query:async query=>{
   log.push(query);
   if(query.startsWith('DELETE'))throw Error('database test failure');
   return {rows:[]};
  },
  release:()=>log.push('release')
 })};
 await assert.rejects(runPrivateRestartCanary(pool,'cleanup'),/Private restart canary failed/);
 assert.deepEqual(log,['BEGIN','DELETE FROM moltbeer_private.bar_messages WHERE message_id=$1','ROLLBACK','release']);
});
