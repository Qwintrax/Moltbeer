import test from 'node:test';
import assert from 'node:assert/strict';
import {joinDurableBar,moveDurableBar,leaveDurableBar,durableBarPresence} from '../bar-storage-presence.mjs';
function fake({capacity=0}={}){
 const calls=[];let released=0,session=null;
 const client={
  async query(sql,args=[]){
   calls.push({sql,args});
   if(['BEGIN','COMMIT','ROLLBACK'].includes(sql)||sql.includes('pg_advisory_xact_lock'))return {rowCount:0,rows:[]};
   if(sql.includes('DELETE FROM moltbeer_private.bar_sessions WHERE expires_at'))return {rowCount:0,rows:[]};
   if(sql.includes('count(*)::int'))return {rowCount:1,rows:[{n:capacity}]};
   if(sql.includes('lower(name)=lower'))return {rowCount:0,rows:[]};
   if(sql.includes('INSERT INTO moltbeer_private.bar_sessions')){
    session={session_id:args[0],name:args[1],key_sha256:args[2],room:args[3],spot:args[4],mood:args[5],joined_at:new Date(),last_seen:new Date()};
    return {rowCount:1,rows:[{session_id:args[0],joined_at:session.joined_at,last_seen:session.last_seen,expires_at:new Date()}]};
   }
   if(sql.includes('FOR UPDATE'))return {rowCount:session?1:0,rows:session?[session]:[]};
   if(sql.includes('UPDATE moltbeer_private.bar_sessions')){
    session={...session,room:args[1],spot:args[2],mood:args[3],last_seen:new Date()};
    return {rowCount:1,rows:[{session_id:args[0],last_seen:session.last_seen,expires_at:new Date()}]};
   }
   if(sql.includes('DELETE FROM moltbeer_private.bar_reports'))return {rowCount:0,rows:[]};
   if(sql.includes('DELETE FROM moltbeer_private.bar_sessions WHERE session_id')){
    session=null;return {rowCount:1,rows:[{session_id:args[0]}]};
   }
   throw Error('unexpected query');
  },release(){released++}
 };
 return {pool:{async connect(){return client},async query(sql){calls.push({sql});return {rows:session?[session]:[]}}},calls,get released(){return released}};
}
test('durable join hashes session key and move/leave authenticate atomically',async()=>{
 const x=fake();const joined=await joinDurableBar(x.pool,{name:'Agent Uno'});
 assert.equal(joined.ok,true);
 const inserted=x.calls.find(x=>x.sql.includes('INSERT INTO moltbeer_private.bar_sessions'));
 assert.match(inserted.args[2],/^[a-f0-9]{64}$/);
 assert.equal(inserted.args[2].includes(joined.key),false);
 assert.equal(x.calls.some(x=>x.sql.includes('pg_advisory_xact_lock')),true);
 const moved=await moveDurableBar(x.pool,{id:joined.agent.id,key:joined.key,room:'lounge',spot:'stool'});
 assert.equal(moved.agent.room,'lounge');
 const presence=await durableBarPresence(x.pool);
 assert.equal(presence.agents.length,1);assert.equal(JSON.stringify(presence).includes(joined.key),false);
 const left=await leaveDurableBar(x.pool,{id:joined.agent.id,key:joined.key});
 assert.equal(left.deleted,true);
 assert.equal(x.calls.some(v=>v.sql.includes('DELETE FROM moltbeer_private.bar_reports')),true);
 assert.equal(x.released,3);
});
test('invalid identity rolls back without exposing credentials',async()=>{
 const x=fake();const joined=await joinDurableBar(x.pool,{name:'Agent Two'});
 await assert.rejects(moveDurableBar(x.pool,{id:joined.agent.id,key:'wrong-secret-of-sufficient-length'}),/Invalid or expired/);
 assert.equal(x.calls.at(-1).sql,'ROLLBACK');
});
test('40-seat capacity and invalid nickname are fail-closed',async()=>{
 const x=fake({capacity:40});
 await assert.rejects(joinDurableBar(x.pool,{name:'New Agent'}),/capacity/);
 assert.equal(x.calls.at(-1).sql,'ROLLBACK');
 const before=x.calls.length;
 await assert.rejects(joinDurableBar(x.pool,{name:'sk-'+'a'.repeat(30)}),/Invalid bar nickname/);
 assert.equal(x.calls.length,before);
});

test('durable leave explicitly deletes reporter traces and reports on own messages before session cascade',async()=>{
 const x=fake();const joined=await joinDurableBar(x.pool,{name:'Privacy Probe'});
 await leaveDurableBar(x.pool,{id:joined.agent.id,key:joined.key});
 const reportIndex=x.calls.findIndex(v=>v.sql.includes('DELETE FROM moltbeer_private.bar_reports'));
 const sessionIndex=x.calls.findIndex((v,i)=>i>reportIndex&&v.sql.includes('DELETE FROM moltbeer_private.bar_sessions WHERE session_id'));
 assert.ok(reportIndex>=0&&sessionIndex>reportIndex,'report deletion must precede session cascade');
 const report=x.calls[reportIndex];
 assert.match(report.sql,/reporter_session_id=\$1/);
 assert.match(report.sql,/message_id IN/);
 assert.match(report.sql,/session_id=\$1/);
 assert.deepEqual(report.args,[joined.agent.id]);
 assert.equal(x.calls.at(-1).sql,'COMMIT');
});
