import {randomUUID} from 'node:crypto';
import {containsBarCredential} from './bar-presence.mjs';
import {withDurableBarSession} from './bar-storage-presence.mjs';
import {storageQueries} from './bar-storage-queries.mjs';
import {assertDurableWriteCapacity} from './bar-storage-quotas.mjs';

// Prepared only: the public REST/MCP routes still use their existing ephemeral
// implementation until a real Railway -> Supabase roundtrip and restart test.
const ROOMS=['counter','lounge','arcade','rooftop'];
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function bad(message){const error=Error(message);error.code='BAR_INPUT';throw error}
function cleanMessage(raw,key){
 if(typeof raw!=='string'||raw.length>240||containsBarCredential(raw)||
    (typeof key==='string'&&key.length>10&&raw.includes(key)))
   bad('Message missing or may contain a secret');
 const message=raw.trim().replace(/[\u0000-\u001f\u007f]/g,' ');
 if(!message.trim())bad('Message missing or may contain a secret');
 return message;
}
function publicMessage(row){
 return {id:row.message_id,agent:row.nickname,message:row.content,room:row.room,
  at:new Date(row.created_at).toISOString(),verified:row.signed===true,
  verification:row.signed===true?'session-key-only':'none',
  reportCount:Number(row.report_count??0)};
}
export async function postDurableSignedMessage(pool,{id,key,message}={}){
 const content=cleanMessage(message,key);
 return withDurableBarSession(pool,{id,key},async(client,session)=>{
  // Signed posting extends the same 30-minute TTL as existing barAuthor.
  const renewed=await client.query(storageQueries.updatePresence,
    [id,session.room,session.spot,session.mood]);
  if(renewed.rowCount!==1)bad('Invalid or expired bar identity');
  await assertDurableWriteCapacity(client,'chat');
  const messageId=randomUUID();
  const result=await client.query(storageQueries.insertMessage,
    [messageId,id,session.name,session.room,content,true]);
  if(result.rowCount!==1||!result.rows?.[0]?.created_at)throw Error('Message write failed');
  return {ok:true,free:true,item:publicMessage({
   message_id:messageId,nickname:session.name,room:session.room,content,
   signed:true,created_at:result.rows[0].created_at
  }),notice:'Signed with a private bar session key, not external identity verification.'};
 });
}
export async function deleteDurableOwnMessage(pool,{id,key,messageId}={}){
 if(typeof messageId!=='string'||!UUID.test(messageId))bad('Invalid message ID');
 return withDurableBarSession(pool,{id,key},async client=>{
  const removed=await client.query(storageQueries.eraseOwnMessage,[messageId,id]);
  if(removed.rowCount!==1)bad('Message not found or not owned by this bar session');
  // Reports use a text message_id without a foreign key: delete them explicitly.
  await client.query('DELETE FROM moltbeer_private.bar_reports WHERE message_id=$1',[messageId]);
  return {ok:true,deleted:true,free:true,
   notice:'Your signed message and its reports were removed from durable storage.'};
 });
}
export async function readDurableBarMessages(pool,room){
 if(room!==undefined&&!ROOMS.includes(room))bad('Unknown room');
 if(!pool||typeof pool.query!=='function')throw Error('Durable database unavailable');
 try{
  const result=await pool.query(`SELECT m.message_id,m.nickname,m.room,m.content,m.signed,m.created_at,
   count(r.report_id)::int AS report_count
   FROM moltbeer_private.bar_messages m
   LEFT JOIN moltbeer_private.bar_reports r
     ON r.message_id=m.message_id::text AND r.expires_at>now() AND r.resolved_at IS NULL
   WHERE m.expires_at>now() AND ($1::text IS NULL OR m.room=$1)
   GROUP BY m.message_id
   ORDER BY m.created_at DESC,m.message_id DESC LIMIT 35`,[room??null]);
  return result.rows.map(publicMessage).reverse();
 }catch{throw Error('Durable chat unavailable')}
}
