import test from 'node:test';
import assert from 'node:assert/strict';
import {runPrivateRestartCanary} from '../scripts/storage-restart-canary.mjs';
const SEED_ID='11111111-1111-4111-8111-111111111111';
const VERIFY_ID='22222222-2222-4222-8222-222222222222';

test('restart check rejects unknown phases before opening a connection',async()=>{
 await assert.rejects(runPrivateRestartCanary(null,'unknown'),/Invalid private canary phase/);
});
test('restart check refuses an unavailable private database',async()=>{
 for(const phase of ['seed','verify','cleanup']){
  await assert.rejects(runPrivateRestartCanary(null,phase,{deploymentId:SEED_ID}),/Private canary database unavailable/);
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
 assert.deepEqual(log,['BEGIN','SELECT name FROM moltbeer_private.bar_sessions WHERE session_id=$1 FOR UPDATE','SELECT content,session_id FROM moltbeer_private.bar_messages WHERE message_id=$1 FOR UPDATE','DELETE FROM moltbeer_private.bar_messages WHERE message_id=$1','ROLLBACK','release']);
});

function memoryDatabase(){
 const state={sessions:new Map(),messages:new Map(),reports:new Map(),commits:0};
 return {state,connect:async()=>{
  let backup;
  return {
   release(){},
   async query(sql,params=[]){
    if(sql==='BEGIN'){backup={sessions:new Map(state.sessions),messages:new Map(state.messages),reports:new Map(state.reports)};return {rows:[]}}
    if(sql==='COMMIT'){state.commits++;backup=null;return {rows:[]}}
    if(sql==='ROLLBACK'){state.sessions=backup.sessions;state.messages=backup.messages;state.reports=backup.reports;return {rows:[]}}
    if(sql.startsWith('SELECT name FROM moltbeer_private.bar_sessions')){
      const row=state.sessions.get(params[0]);return {rows:row?[row]:[]}
    }
    if(sql.startsWith('SELECT content,session_id FROM moltbeer_private.bar_messages')){
      const row=state.messages.get(params[0]);return {rows:row?[row]:[]}
    }
    if(sql.startsWith('SELECT message_id FROM moltbeer_private.bar_messages')){
      const match=[...state.messages].find(([id,row])=>row.session_id===params[0]&&id!==params[1]);
      return {rows:match?[{message_id:match[0]}]:[]};
    }
    if(sql.startsWith('SELECT report_id FROM moltbeer_private.bar_reports')){
      const field=sql.includes('reporter_session_id')?'reporter_session_id':'message_id';
      const match=[...state.reports].find(([,row])=>row[field]===params[0]);
      return {rows:match?[{report_id:match[0]}]:[]};
    }
    if(sql.startsWith('INSERT INTO moltbeer_private.bar_sessions')){
      assert.match(sql,/expires_at\) VALUES\(.+now\(\)-interval '1 second'/,'private canary session must already be expired');
      state.sessions.set(params[0],{name:params[1]});return {rows:[]}
    }
    if(sql.startsWith('INSERT INTO moltbeer_private.bar_messages')){
      assert.match(sql,/expires_at\) VALUES\(.+now\(\)-interval '1 second'/,'private canary message must already be expired');
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
 const seed=await runPrivateRestartCanary(pool,'seed',{deploymentId:SEED_ID});
 assert.equal(seed.passed,true);
 assert.equal(pool.state.sessions.size,1);
 assert.equal(pool.state.messages.size,1);
 const checked=await runPrivateRestartCanary(pool,'verify',{deploymentId:VERIFY_ID});
 assert.equal(checked.passed,true);
 assert.equal(pool.state.sessions.size,0);
 assert.equal(pool.state.messages.size,0);
 assert.equal(pool.state.commits,2);
});
test('verification without matching committed data fails rather than pretending success',async()=>{
 const pool=memoryDatabase();
 await assert.rejects(runPrivateRestartCanary(pool,'verify',{deploymentId:VERIFY_ID}),/Private restart canary failed/);
 assert.equal(pool.state.commits,0);
});

test('a readback from the SAME Railway deployment is never accepted as restart proof',async()=>{
 const pool=memoryDatabase();
 await runPrivateRestartCanary(pool,'seed',{deploymentId:SEED_ID});
 await assert.rejects(runPrivateRestartCanary(pool,'verify',{deploymentId:SEED_ID}),/Private restart canary failed/);
 assert.equal(pool.state.sessions.size,1,'failed verify must not delete evidence');
 assert.equal(pool.state.messages.size,1,'failed verify must roll back cleanup');
 assert.equal(pool.state.commits,1);
 const verified=await runPrivateRestartCanary(pool,'verify',{deploymentId:VERIFY_ID});
 assert.equal(verified.passed,true);
 assert.equal(pool.state.sessions.size,0);
 assert.equal(pool.state.messages.size,0);
});
test('seed and verify require a real deployment ID; cleanup stays possible without one',async()=>{
 const pool=memoryDatabase();
 for(const phase of ['seed','verify']){
  await assert.rejects(runPrivateRestartCanary(pool,phase,{deploymentId:'not-a-railway-id'}),/deployment identity unavailable/);
 }
 assert.equal(pool.state.commits,0);
 const cleaned=await runPrivateRestartCanary(pool,'cleanup',{deploymentId:null});
 assert.equal(cleaned.passed,true);
 assert.equal(pool.state.sessions.size,0);
 assert.equal(pool.state.messages.size,0);
});

test('a second seed cannot erase committed evidence from the first deployment',async()=>{
 const pool=memoryDatabase();
 await runPrivateRestartCanary(pool,'seed',{deploymentId:SEED_ID});
 assert.equal(pool.state.commits,1);
 await assert.rejects(runPrivateRestartCanary(pool,'seed',{deploymentId:VERIFY_ID}),/Private restart canary failed/);
 assert.equal(pool.state.commits,1,'duplicate seed must roll back without replacing evidence');
 assert.equal(pool.state.sessions.size,1);
 assert.equal(pool.state.messages.size,1);
 // The original deployment marker remains intact, so the real verify phase
 // can still prove that the first committed data survived the next deployment.
 const result=await runPrivateRestartCanary(pool,'verify',{deploymentId:VERIFY_ID});
 assert.equal(result.passed,true);
 assert.equal(pool.state.sessions.size,0);
 assert.equal(pool.state.messages.size,0);
 assert.equal(pool.state.commits,2);
});

test('cleanup must verify both rows are gone before committing',async()=>{
 const pool=memoryDatabase();
 await runPrivateRestartCanary(pool,'seed',{deploymentId:SEED_ID});
 const originalConnect=pool.connect.bind(pool);
 pool.connect=async()=>{
  const client=await originalConnect();
  const originalQuery=client.query.bind(client);
  // Simulate a DELETE that returns successfully but silently leaves a row.
  client.query=async(sql,params=[])=>sql.startsWith('DELETE FROM moltbeer_private.bar_messages')
   ?{rowCount:0,rows:[]}:originalQuery(sql,params);
  return client;
 };
 await assert.rejects(runPrivateRestartCanary(pool,'cleanup'),/Private restart canary failed/);
 assert.equal(pool.state.sessions.size,1,'failed cleanup must retain the original session');
 assert.equal(pool.state.messages.size,1,'failed cleanup must retain the original message');
 assert.equal(pool.state.commits,1,'failed cleanup must not commit');
 pool.connect=originalConnect;
 const verified=await runPrivateRestartCanary(pool,'verify',{deploymentId:VERIFY_ID});
 assert.equal(verified.passed,true);
 assert.equal(pool.state.sessions.size,0);
 assert.equal(pool.state.messages.size,0);
});

test('cleanup refuses a foreign session occupying the fixed diagnostic UUID',async()=>{
 const pool=memoryDatabase();
 const sessionId='b237bf95-c9df-45b8-91cb-7c1fe4e51f26';
 pool.state.sessions.set(sessionId,{name:'RealVisitor'});
 await assert.rejects(runPrivateRestartCanary(pool,'cleanup'),/Private restart canary failed/);
 assert.equal(pool.state.sessions.get(sessionId).name,'RealVisitor');
 assert.equal(pool.state.commits,0,'foreign session must not be deleted');
});

test('cleanup refuses altered message evidence instead of deleting it',async()=>{
 const pool=memoryDatabase();
 const messageId='7cdd1b81-7955-4caf-a575-c4d18e923dbf';
 await runPrivateRestartCanary(pool,'seed',{deploymentId:SEED_ID});
 const original=pool.state.messages.get(messageId);
 pool.state.messages.set(messageId,{...original,content:'Unrelated private message'});
 await assert.rejects(runPrivateRestartCanary(pool,'cleanup'),/Private restart canary failed/);
 assert.equal(pool.state.messages.get(messageId).content,'Unrelated private message');
 assert.equal(pool.state.sessions.size,1);
 assert.equal(pool.state.commits,1,'failed cleanup must roll back');
});

test('canary cleanup and verify refuse to cascade-delete an unrelated signed message',async()=>{
 const pool=memoryDatabase();
 const sessionId='b237bf95-c9df-45b8-91cb-7c1fe4e51f26';
 await runPrivateRestartCanary(pool,'seed',{deploymentId:SEED_ID});
 pool.state.messages.set('33333333-3333-4333-8333-333333333333',{
  session_id:sessionId,content:'Real message unrelated to diagnostic'});
 for(const phase of ['cleanup','verify']){
  await assert.rejects(runPrivateRestartCanary(pool,phase,{deploymentId:VERIFY_ID}),/Private restart canary failed/);
  assert.equal(pool.state.messages.size,2,'foreign child and original canary must survive rollback');
  assert.equal(pool.state.sessions.size,1);
  assert.equal(pool.state.commits,1);
 }
 pool.state.messages.delete('33333333-3333-4333-8333-333333333333');
 const verified=await runPrivateRestartCanary(pool,'verify',{deploymentId:VERIFY_ID});
 assert.equal(verified.passed,true);
 assert.equal(pool.state.messages.size,0);
});

test('canary cleanup refuses reports that would cascade or become orphaned',async()=>{
 const pool=memoryDatabase();
 const sessionId='b237bf95-c9df-45b8-91cb-7c1fe4e51f26';
 const messageId='7cdd1b81-7955-4caf-a575-c4d18e923dbf';
 await runPrivateRestartCanary(pool,'seed',{deploymentId:SEED_ID});
 pool.state.reports.set('report-by-canary',{reporter_session_id:sessionId,message_id:'other'});
 await assert.rejects(runPrivateRestartCanary(pool,'cleanup'),/Private restart canary failed/);
 assert.equal(pool.state.reports.size,1);
 pool.state.reports.clear();
 pool.state.reports.set('report-about-canary',{reporter_session_id:null,message_id:messageId});
 await assert.rejects(runPrivateRestartCanary(pool,'verify',{deploymentId:VERIFY_ID}),/Private restart canary failed/);
 assert.equal(pool.state.sessions.size,1);
 assert.equal(pool.state.messages.size,1);
 assert.equal(pool.state.commits,1);
 pool.state.reports.clear();
 const verified=await runPrivateRestartCanary(pool,'verify',{deploymentId:VERIFY_ID});
 assert.equal(verified.passed,true);
});

test('all canary ownership reads lock both rows before verify or cleanup',async()=>{
 const pool=memoryDatabase();
 const queries=[];
 const connect=pool.connect.bind(pool);
 pool.connect=async()=>{
  const client=await connect();
  const query=client.query.bind(client);
  client.query=async(sql,params)=>{
   if(sql.startsWith('SELECT name FROM moltbeer_private.bar_sessions')||
      sql.startsWith('SELECT content,session_id FROM moltbeer_private.bar_messages'))queries.push(sql);
   return query(sql,params);
  };
  return client;
 };
 await runPrivateRestartCanary(pool,'seed',{deploymentId:SEED_ID});
 await runPrivateRestartCanary(pool,'verify',{deploymentId:VERIFY_ID});
 await runPrivateRestartCanary(pool,'cleanup',{deploymentId:null});
 assert.equal(queries.length,12);
 assert.ok(queries.every(sql=>sql.endsWith(' FOR UPDATE')),'ownership reads must hold row locks until COMMIT');
 assert.equal(pool.state.sessions.size,0);
 assert.equal(pool.state.messages.size,0);
});
