// MOLTBEER owner's private, restart-spanning database canary.
// ONLY runs under an explicit startup flag while public bar remains ephemeral.
// One synthetic session/message in the *private DB only*, never injected into
// public REST, MCP or the visitor counter. Rows are inserted already expired
// so even an accidental later durable switch cannot display this fake agent.
// The 'verify' phase removes them.
import {randomBytes,createHash} from 'node:crypto';

export const RESTART_CANARY_SESSION='b237bf95-c9df-45b8-91cb-7c1fe4e51f26';
export const RESTART_CANARY_MESSAGE='7cdd1b81-7955-4caf-a575-c4d18e923dbf';
const CANARY_NAME='InternalRestartCheck';
const CANARY_TEXT='Private restart persistence acceptance check';
const DEPLOYMENT_ID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const taggedMessage=id=>CANARY_TEXT+' | deployment='+id;

async function tx(pool,doWork){
 if(!pool||typeof pool.connect!=='function')throw Error('Private canary database unavailable');
 let client,started=false;
 try{
  client=await pool.connect();
  await client.query('BEGIN'); started=true;
  const result=await doWork(client);
  await client.query('COMMIT');started=false;
  return result;
 }catch{
  if(started)try{await client.query('ROLLBACK')}catch{}
  throw Error('Private restart canary failed');
 }finally{client?.release()}
}
async function countCanary(client){
 const [session,message]=[
  await client.query('SELECT name FROM moltbeer_private.bar_sessions WHERE session_id=$1 FOR UPDATE',[RESTART_CANARY_SESSION]),
  await client.query('SELECT content,session_id FROM moltbeer_private.bar_messages WHERE message_id=$1 FOR UPDATE',[RESTART_CANARY_MESSAGE])
 ];
 return {session:session.rows?.[0]??null,message:message.rows?.[0]??null};
}
// Row locks serialize verification/cleanup with concurrent updates to these IDs.
// Fixed UUIDs are diagnostic identifiers, not authority to delete unrelated
// records. Refuse cleanup if either row no longer belongs to this canary.
function assertCanaryOwnership(found){
 if(found.session && found.session.name!==CANARY_NAME)
  throw Error('Private canary ownership mismatch');
 if(found.message){
  const content=found.message.content;
  const prefix=CANARY_TEXT+' | deployment=';
  const seedId=typeof content==='string'&&content.startsWith(prefix)
   ?content.slice(prefix.length):null;
  if(!seedId || !DEPLOYMENT_ID.test(seedId) ||
     String(found.message.session_id)!==RESTART_CANARY_SESSION)
   throw Error('Private canary ownership mismatch');
 }
}
// A session DELETE cascades to every child message/report. Never let a
// diagnostic cleanup silently erase unrelated data attached to the fixed UUID.
// Likewise refuse to orphan reports that reference the canary message ID.
async function assertNoForeignDependents(client){
 const extraMessage=await client.query(
  'SELECT message_id FROM moltbeer_private.bar_messages WHERE session_id=$1 AND message_id<>$2 LIMIT 1 FOR UPDATE',
  [RESTART_CANARY_SESSION,RESTART_CANARY_MESSAGE]);
 const sessionReport=await client.query(
  'SELECT report_id FROM moltbeer_private.bar_reports WHERE reporter_session_id=$1 LIMIT 1 FOR UPDATE',
  [RESTART_CANARY_SESSION]);
 const messageReport=await client.query(
  'SELECT report_id FROM moltbeer_private.bar_reports WHERE message_id=$1 LIMIT 1 FOR UPDATE',
  [RESTART_CANARY_MESSAGE]);
 if(extraMessage.rows?.length||sessionReport.rows?.length||messageReport.rows?.length)
  throw Error('Private canary has unrelated dependent records');
}
async function purgeCanary(client){
 await client.query('DELETE FROM moltbeer_private.bar_messages WHERE message_id=$1',[RESTART_CANARY_MESSAGE]);
 await client.query('DELETE FROM moltbeer_private.bar_sessions WHERE session_id=$1',[RESTART_CANARY_SESSION]);
}
export async function runPrivateRestartCanary(pool,phase,{deploymentId=process.env.RAILWAY_DEPLOYMENT_ID}={}){
 if(!['seed','verify','cleanup'].includes(phase))throw Error('Invalid private canary phase');
 if(process.env.MOLTBEER_STORAGE_MODE==='durable')throw Error('Canary requires ephemeral public routes');
 // Seed and verify MUST identify different real Railway deployments. Never
 // report a same-process readback as proof of restart-spanning persistence.
 if(phase!=='cleanup' && (typeof deploymentId!=='string'||!DEPLOYMENT_ID.test(deploymentId)))
  throw Error('Private Railway deployment identity unavailable');
 if(phase==='seed'){
  return tx(pool,async client=>{
   // Never overwrite an earlier committed probe: it is restart evidence.
   // Only the explicit verify/cleanup phases may remove existing canary rows.
   const existing=await countCanary(client);
   if(existing.session||existing.message)throw Error('Private canary already seeded');
   const keyHash=createHash('sha256').update(randomBytes(32)).digest('hex');
   await client.query(
    'INSERT INTO moltbeer_private.bar_sessions(session_id,name,key_sha256,room,spot,mood,expires_at) VALUES($1,$2,$3,$4,$5,$6,now()-interval \'1 second\')',
    [RESTART_CANARY_SESSION,CANARY_NAME,keyHash,'counter','entrance','focused']);
   await client.query(
    'INSERT INTO moltbeer_private.bar_messages(message_id,session_id,nickname,room,content,signed,expires_at) VALUES($1,$2,$3,$4,$5,true,now()-interval \'1 second\')',
    [RESTART_CANARY_MESSAGE,RESTART_CANARY_SESSION,CANARY_NAME,'counter',taggedMessage(deploymentId)]);
   const found=await countCanary(client);
   if(found.session?.name!==CANARY_NAME || found.message?.content!==taggedMessage(deploymentId))
    throw Error('Private canary seed readback failed');
   return {phase:'seed',passed:true,notice:'Private probe committed; verify must run after a new Railway deployment'};
  });
 }
 if(phase==='cleanup'){
  return tx(pool,async client=>{
   // Cleanup is idempotent, but must never erase a foreign UUID collision.
   const owned=await countCanary(client);
   assertCanaryOwnership(owned);
   if(owned.session||owned.message)await assertNoForeignDependents(client);
   await purgeCanary(client);
   // A successful DELETE command is not proof that rows were removed.
   // Verify both private records are absent before committing cleanup.
   const remains=await countCanary(client);
   if(remains.session||remains.message)throw Error('Private canary cleanup failed');
   return {phase:'cleanup',passed:true};
  });
 }
 // Keep verification and deletion atomic. On failure, roll back and retain the
 // evidence for diagnosis; an explicit cleanup mode can remove it afterwards.
 return tx(pool,async client=>{
  const found=await countCanary(client);
  const stored=found.message?.content;
  const seedDeployment=typeof stored==='string'&&stored.startsWith(CANARY_TEXT+' | deployment=')
    ?stored.slice((CANARY_TEXT+' | deployment=').length):null;
  const matched=found.session?.name===CANARY_NAME &&
    typeof seedDeployment==='string' && DEPLOYMENT_ID.test(seedDeployment) &&
    seedDeployment!==deploymentId &&
    String(found.message?.session_id)===RESTART_CANARY_SESSION;
  if(!matched)throw Error('Private canary did not survive restart');
  await assertNoForeignDependents(client);
  await purgeCanary(client);
  const remains=await countCanary(client);
  if(remains.session||remains.message)throw Error('Private canary cleanup failed');
  return {phase:'verify',passed:true,notice:'Committed data survived a deployment and was deleted'};
 });
}
