// Owner-only one-shot acceptance test of real Supabase private bar storage.
// All mutations happen inside ONE outer PostgreSQL transaction and are rolled
// back, including calls that normally COMMIT through the public storage modules.
// Never log session keys, credentials, SQL errors or user content.
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {joinDurableBar,moveDurableBar,heartbeatDurableBar,leaveDurableBar,durableBarPresence} from '../bar-storage-presence.mjs';
import {postDurableSignedMessage,deleteDurableOwnMessage,readDurableBarMessages} from '../bar-storage-chat.mjs';
import {postDurableGuestMessage,reportDurableMessage,reviewDurableReport,getDurableMetrics} from '../bar-storage-runtime.mjs';
import {recordDrinkExactlyOnce} from '../bar-storage-transactions.mjs';
import {purgeExpiredBarRows} from '../bar-storage-cleanup.mjs';

// Expose the existing transaction adapter interface without committing any
// writes. COMMIT becomes RELEASE SAVEPOINT; the outer ROLLBACK is unconditional.
export function rollbackOnlyPool(client){
 let savepoint=null,number=0;
 // Reject direct or unexpected transaction commands so an acceptance adapter
 // cannot accidentally commit the real outer PostgreSQL transaction.
 // PostgreSQL also accepts query-config objects ({text:'COMMIT'}). Reject them
 // and SQL comments/multiple statements instead of trying to parse arbitrary SQL:
 // a comment before COMMIT must never bypass the outer rollback boundary.
 const isTransactionControl=sql=>{
  if(typeof sql!=='string')return true;
  const statement=sql.trim().replace(/;\s*$/,'').trim();
  return /\/\*|--|;/.test(statement) ||
   /^(?:BEGIN|START\s+TRANSACTION|COMMIT|END|ROLLBACK|ABORT|SAVEPOINT|RELEASE)\b/i.test(statement);
 };
 const lease={
  async query(sql,params){
   const statement=typeof sql==='string'?sql.trim().replace(/;\s*$/,'').trim().toUpperCase():'';
   if(statement==='BEGIN'){
    if(savepoint)throw Error('Concurrent transaction in isolated acceptance probe');
    savepoint='moltbeer_accept_'+(++number);
    return client.query('SAVEPOINT '+savepoint);
   }
   if(statement==='COMMIT'){
    if(!savepoint)throw Error('Missing acceptance savepoint');
    const name=savepoint;savepoint=null;
    return client.query('RELEASE SAVEPOINT '+name);
   }
   if(statement==='ROLLBACK'){
    if(!savepoint)throw Error('Missing acceptance savepoint');
    const name=savepoint;savepoint=null;
    await client.query('ROLLBACK TO SAVEPOINT '+name);
    return client.query('RELEASE SAVEPOINT '+name);
   }
   if(isTransactionControl(sql))throw Error('Unexpected transaction control in isolated acceptance probe');
   return client.query(sql,params);
  },
  release(){}
 };
 return {
  connect:async()=>lease,
  query:(sql,params)=>{
   if(isTransactionControl(sql))throw Error('Direct transaction control forbidden in isolated acceptance probe');
   return client.query(sql,params);
  }
 };
}

export async function verifyDurableStorageRollback(pool){
 if(!pool||typeof pool.connect!=='function')throw Error('Acceptance pool unavailable');
 let client,outer=false,sessionId=null,eventId=null,guestMessageId=null,step='connect';
 try{
  client=await pool.connect();
  await client.query('BEGIN');outer=true;
  const scoped=rollbackOnlyPool(client);
  const nameSuffix=randomBytes(5).toString('hex');
  step='join and move';
  const first=await joinDurableBar(scoped,{name:'ProbeA'+nameSuffix,room:'counter'});
  const second=await joinDurableBar(scoped,{name:'ProbeB'+nameSuffix,room:'lounge'});
  sessionId=first.agent.id;
  assert.equal(first.ok,true);
  assert.equal(second.ok,true);
  const moved=await moveDurableBar(scoped,{id:first.agent.id,key:first.key,room:'lounge',spot:'booth',mood:'happy'});
  assert.equal(moved.agent.room,'lounge');
  const heartbeat=await heartbeatDurableBar(scoped,{id:second.agent.id,key:second.key});
  assert.equal(heartbeat.ok,true);
  const presence=await durableBarPresence(scoped);
  assert.ok(presence.agents.some(a=>a.id===first.agent.id));
  assert.ok(presence.agents.some(a=>a.id===second.agent.id));

  step='signed and guest messages';
  const signed=await postDurableSignedMessage(scoped,{id:first.agent.id,key:first.key,message:'Safe integration test'});
  assert.equal(signed.item.verified,true);
  assert.ok(!JSON.stringify(signed).includes(first.key));
  const guest=await postDurableGuestMessage(scoped,{agent:'ProbeGuest'+nameSuffix,message:'Guest hello',room:'counter'});
  guestMessageId=guest.item.id;
  const chat=await readDurableBarMessages(scoped);
  assert.ok(chat.some(m=>m.id===signed.item.id));
  assert.ok(chat.some(m=>m.id===guest.item.id));
  await assert.rejects(postDurableGuestMessage(scoped,{agent:first.agent.name,message:'Impersonation attempt'}),/nickname belongs/i);

  step='reports and owner moderation';
  const reported=await reportDurableMessage(scoped,{id:second.agent.id,key:second.key,messageId:signed.item.id,reason:'spam'});
  assert.equal(reported.reportCount,1);
  const reviewed=await reviewDurableReport(scoped,{messageId:signed.item.id,action:'dismiss'});
  assert.equal(reviewed.ok,true);
  const removed=await deleteDurableOwnMessage(scoped,{id:first.agent.id,key:first.key,messageId:signed.item.id});
  assert.equal(removed.deleted,true);
  assert.ok(!(await readDurableBarMessages(scoped)).some(m=>m.id===signed.item.id));

  step='atomic drink and duplicate suppression';
  eventId=randomUUID();
  const before=await getDurableMetrics(scoped);
  const drink=await recordDrinkExactlyOnce(scoped,{eventId,slug:'moltbeer',source:'rest'});
  const duplicate=await recordDrinkExactlyOnce(scoped,{eventId,slug:'moltbeer',source:'rest'});
  const after=await getDurableMetrics(scoped);
  assert.equal(drink.recorded,true);
  assert.equal(duplicate.recorded,false);
  assert.equal(after.total,before.total+1);

  step='cleanup and agent deletion';
  const cleanup=await purgeExpiredBarRows(scoped);
  assert.equal(typeof cleanup.sessions,'number');
  assert.equal(typeof cleanup.drinkEvents,'number');
  const left=await leaveDurableBar(scoped,{id:first.agent.id,key:first.key});
  assert.equal(left.deleted,true);
  await leaveDurableBar(scoped,{id:second.agent.id,key:second.key});
  assert.ok(!(await durableBarPresence(scoped)).agents.some(a=>a.id===first.agent.id));
  step='rollback';
  await client.query('ROLLBACK');outer=false;
  // The same dedicated client must not execute concurrent queries: pg 8
  // warns about this and pg 9 will reject it. Check sequentially.
  const sessionRow=await client.query('SELECT 1 FROM moltbeer_private.bar_sessions WHERE session_id=$1',[sessionId]);
  const eventRow=await client.query('SELECT 1 FROM moltbeer_private.drink_events WHERE event_id=$1',[eventId]);
  const guestRow=await client.query('SELECT 1 FROM moltbeer_private.bar_messages WHERE message_id=$1',[guestMessageId]);
  assert.equal(sessionRow.rowCount,0);
  assert.equal(eventRow.rowCount,0);
  assert.equal(guestRow.rowCount,0);
  return {ok:true,reason:'rollback_verified',checks:7,persistedTestRows:0};
 }catch{
  // Never echo raw database errors or private session data into logs.
  throw Error('Private rollback acceptance failed at '+step);
 }finally{
  if(client){
   if(outer)try{await client.query('ROLLBACK')}catch{}
   client.release();
  }
 }
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 let pool;
 try{
  const [{Pool},{createPrivateDatabasePool}]=await Promise.all([
   import('pg'),import('../bar-storage-pool.mjs')
  ]);
  pool=await createPrivateDatabasePool({PoolClass:Pool,databaseUrl:process.env.DATABASE_URL});
  const result=await verifyDurableStorageRollback(pool);
  console.log('MOLTBEER private storage rollback acceptance:',result.ok?'PASS':'UNAVAILABLE','(zero test rows persisted)');
 }catch{
  console.log('MOLTBEER private storage rollback acceptance: UNAVAILABLE (nothing committed)');
  process.exitCode=1;
 }finally{if(pool)try{await pool.end()}catch{}}
}
