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

function memoryDatabase(){
 const state={sessions:new Map(),messages:new Map(),commits:0};
 return {state,connect:async()=>{
  let backup;
  return {
   release(){},
   async query(sql,params=[]){
    if(sql==='BEGIN'){backup={sessions:new Map(state.sessions),messages:new Map(state.messages)};return {rows:[]}}
    if(sql==='COMMIT'){state.commits++;backup=null;return {rows:[]}}
    if(sql==='ROLLBACK'){state.sessions=backup.sessions;state.messages=backup.messages;return {rows:[]}}
    if(sql.startsWith('SELECT name FROM moltbeer_private.bar_sessions')){
      const row=state.sessions.get(params[0]);return {rows:row?[row]:[]}
    }
    if(sql.startsWith('SELECT content,session_id FROM moltbeer_private.bar_messages')){
      const row=state.messages.get(params[0]);return {rows:row?[row]:[]}
    }
    if(sql.startsWith('INSERT INTO moltbeer_private.bar_sessions')){
      state.sessions.set(params[0],{name:params[1]});return {rows:[]}
    }
    if(sql.startsWith('INSERT INTO moltbeer_private.bar_messages')){
      state.messages.set(params[0],{session_id:params[1],content:params[4]});return {rows:[]}
    }
    if(sql.startsWith('DELETE FROM moltbeer_private.bar_messages')){
      state.messages.delete(params[0]);return {rows:[]}
    }
    if(sql.startsWith('DELETE FROM moltbeer_private.bar_sessions')){
      state.sessions.delete(params[0]);return {rows:[]}
    }
    throw Error('Unsupported fixture SQL');
   }
  }
 }};
}
test('private committed canary is read on a new connection then fully erased',async()=>{
 const pool=memoryDatabase();
 const seed=await runPrivateRestartCanary(pool,'seed');
 assert.equal(seed.passed,true);
 assert.equal(pool.state.sessions.size,1);
 assert.equal(pool.state.messages.size,1);
 const checked=await runPrivateRestartCanary(pool,'verify');
 assert.equal(checked.passed,true);
 assert.equal(pool.state.sessions.size,0);
 assert.equal(pool.state.messages.size,0);
 assert.equal(pool.state.commits,2);
});
test('verification without matching committed data fails rather than pretending success',async()=>{
 const pool=memoryDatabase();
 await assert.rejects(runPrivateRestartCanary(pool,'verify'),/Private restart canary failed/);
 assert.equal(pool.state.commits,0);
});
