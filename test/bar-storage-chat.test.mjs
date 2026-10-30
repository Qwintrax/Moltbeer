import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {postDurableSignedMessage,deleteDurableOwnMessage,readDurableBarMessages} from '../bar-storage-chat.mjs';
function fixture({failInsert=false,missingMessage=false}={}){
 const id=randomUUID(),key='safe-private-key-for-a-test-agent-only';
 const session={session_id:id,key_sha256:createHash('sha256').update(key).digest('hex'),
  name:'Chat Agent',room:'lounge',spot:'booth',mood:'chill',
  joined_at:new Date(),last_seen:new Date()};
 const calls=[];let released=0,posted=null;
 const client={async query(sql,args=[]){
  calls.push({sql,args});
  if(['BEGIN','COMMIT','ROLLBACK'].includes(sql))return {rowCount:0,rows:[]};
  if(sql.includes('FOR UPDATE'))return {rowCount:1,rows:[session]};
  if(sql.includes('pg_advisory_xact_lock'))return {rowCount:1,rows:[{}]};
  if(sql.includes('count(*)::int AS n'))return {rowCount:1,rows:[{n:0}]};
  if(sql.includes('UPDATE moltbeer_private.bar_sessions'))return {rowCount:1,rows:[{session_id:id}]};
  if(sql.includes('INSERT INTO moltbeer_private.bar_messages')){
   if(failInsert)throw Error('secret database outage');
   posted={message_id:args[0],nickname:args[2],room:args[3],content:args[4],
    signed:args[5],created_at:new Date()};
   return {rowCount:1,rows:[{message_id:args[0],created_at:posted.created_at}]};
  }
  if(sql.includes('DELETE FROM moltbeer_private.bar_messages'))return {rowCount:missingMessage?0:1,rows:[]};
  if(sql.includes('DELETE FROM moltbeer_private.bar_reports'))return {rowCount:2,rows:[]};
  throw Error('Unexpected SQL');
 },release(){released++}};
 return {id,key,calls,get released(){return released},pool:{
  async connect(){return client},
  async query(sql,args){calls.push({sql,args});return {rows:posted?[{...posted,report_count:0}]:[]}}
 }};
}
test('signed chat persists only with session auth, no secret in public response',async()=>{
 const x=fixture();
 const result=await postDurableSignedMessage(x.pool,{id:x.id,key:x.key,message:'Hello agents'});
 assert.equal(result.item.agent,'Chat Agent');assert.equal(result.item.verified,true);
 assert.equal(result.item.room,'lounge');
 assert.equal(JSON.stringify(result).includes(x.key),false);
 assert.equal(x.calls.at(-1).sql,'COMMIT');assert.equal(x.released,1);
 const messages=await readDurableBarMessages(x.pool,'lounge');
 assert.equal(messages.length,1);assert.equal(messages[0].message,'Hello agents');
 assert.equal(x.calls.at(-1).args[0],'lounge');
});
test('authenticated owner deletion also deletes orphan text-ID reports atomically',async()=>{
 const x=fixture();
 const messageId=randomUUID();
 const result=await deleteDurableOwnMessage(x.pool,{id:x.id,key:x.key,messageId});
 assert.equal(result.deleted,true);
 assert.equal(x.calls.some(c=>c.sql.includes('DELETE FROM moltbeer_private.bar_reports')),true);
 assert.equal(x.calls.at(-1).sql,'COMMIT');
});
test('unknown message and insert failure rollback, never pretend success',async()=>{
 const a=fixture({missingMessage:true});
 await assert.rejects(deleteDurableOwnMessage(a.pool,{id:a.id,key:a.key,messageId:randomUUID()}),/not owned/);
 assert.equal(a.calls.at(-1).sql,'ROLLBACK');
 const b=fixture({failInsert:true});
 await assert.rejects(postDurableSignedMessage(b.pool,{id:b.id,key:b.key,message:'Hello'}),e=>{
  assert.equal(e.message,'Durable bar transaction failed');return true;
 });
 assert.equal(b.calls.at(-1).sql,'ROLLBACK');assert.equal(b.released,1);
});
test('invalid identity, secrets and long text are rejected',async()=>{
 const x=fixture();
 await assert.rejects(postDurableSignedMessage(x.pool,{id:x.id,key:'wrong-key-that-is-long-enough',message:'Hello'}),/Invalid or expired/);
 await assert.rejects(postDurableSignedMessage(x.pool,{id:x.id,key:x.key,message:x.key}),/secret/);
 await assert.rejects(postDurableSignedMessage(x.pool,{id:x.id,key:x.key,message:'a'.repeat(241)}),/secret/);
 assert.equal(x.calls.some(c=>c.sql.includes('INSERT INTO moltbeer_private.bar_messages')),false);
});
