// MOLTBEER owner's private, restart-spanning database canary.
// ONLY runs under an explicit startup flag while public bar remains ephemeral.
// One synthetic session/message in the *private DB only*, never injected into
// public REST, MCP or the visitor counter. The 'verify' phase removes them.
import {randomBytes,createHash} from 'node:crypto';

export const RESTART_CANARY_SESSION='b237bf95-c9df-45b8-91cb-7c1fe4e51f26';
export const RESTART_CANARY_MESSAGE='7cdd1b81-7955-4caf-a575-c4d18e923dbf';
const CANARY_NAME='InternalRestartCheck';
const CANARY_TEXT='Private restart persistence acceptance check';

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
  await client.query('SELECT name FROM moltbeer_private.bar_sessions WHERE session_id=$1',[RESTART_CANARY_SESSION]),
  await client.query('SELECT content,session_id FROM moltbeer_private.bar_messages WHERE message_id=$1',[RESTART_CANARY_MESSAGE])
 ];
 return {session:session.rows?.[0]??null,message:message.rows?.[0]??null};
}
async function purgeCanary(client){
 await client.query('DELETE FROM moltbeer_private.bar_messages WHERE message_id=$1',[RESTART_CANARY_MESSAGE]);
 await client.query('DELETE FROM moltbeer_private.bar_sessions WHERE session_id=$1',[RESTART_CANARY_SESSION]);
}
export async function runPrivateRestartCanary(pool,phase){
 if(!['seed','verify','cleanup'].includes(phase))throw Error('Invalid private canary phase');
 if(process.env.MOLTBEER_STORAGE_MODE==='durable')throw Error('Canary requires ephemeral public routes');
 if(phase==='seed'){
  return tx(pool,async client=>{
   await purgeCanary(client);
   const keyHash=createHash('sha256').update(randomBytes(32)).digest('hex');
   await client.query(
    'INSERT INTO moltbeer_private.bar_sessions(session_id,name,key_sha256,room,spot,mood) VALUES($1,$2,$3,$4,$5,$6)',
    [RESTART_CANARY_SESSION,CANARY_NAME,keyHash,'counter','entrance','focused']);
   await client.query(
    'INSERT INTO moltbeer_private.bar_messages(message_id,session_id,nickname,room,content,signed) VALUES($1,$2,$3,$4,$5,true)',
    [RESTART_CANARY_MESSAGE,RESTART_CANARY_SESSION,CANARY_NAME,'counter',CANARY_TEXT]);
   const found=await countCanary(client);
   if(found.session?.name!==CANARY_NAME || found.message?.content!==CANARY_TEXT)
    throw Error('Private canary seed readback failed');
   return {phase:'seed',passed:true,notice:'Private probe committed; verify must run after a new Railway deployment'};
  });
 }
 if(phase==='cleanup'){
  await tx(pool,async client=>{await purgeCanary(client)});
  return {phase:'cleanup',passed:true};
 }
 // Keep verification and deletion atomic. On failure, roll back and retain the
 // evidence for diagnosis; an explicit cleanup mode can remove it afterwards.
 return tx(pool,async client=>{
  const found=await countCanary(client);
  const matched=found.session?.name===CANARY_NAME &&
    found.message?.content===CANARY_TEXT &&
    String(found.message?.session_id)===RESTART_CANARY_SESSION;
  await purgeCanary(client);
  if(!matched)throw Error('Private canary did not survive restart');
  const remains=await countCanary(client);
  if(remains.session||remains.message)throw Error('Private canary cleanup failed');
  return {phase:'verify',passed:true,notice:'Committed data survived a deployment and was deleted'};
 });
}
