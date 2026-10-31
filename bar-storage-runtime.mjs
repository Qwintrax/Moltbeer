// Opt-in durable bar adapter. No database is contacted unless the owner explicitly
// enables MOLTBEER_STORAGE_MODE=durable. Never fall back to ephemeral on a DB error.
import {randomUUID,createHash} from 'node:crypto';
import {containsBarCredential} from './bar-presence.mjs';
import {createPrivateDatabasePool} from './bar-storage-pool.mjs';
import {joinDurableBar,moveDurableBar,heartbeatDurableBar,leaveDurableBar,durableBarPresence,withDurableBarSession} from './bar-storage-presence.mjs';
import {postDurableSignedMessage,readDurableBarMessages,deleteDurableOwnMessage} from './bar-storage-chat.mjs';
import {recordDrinkExactlyOnce} from './bar-storage-transactions.mjs';
import {purgeExpiredBarRows} from './bar-storage-cleanup.mjs';
import {assertDurableWriteCapacity} from './bar-storage-quotas.mjs';
import {verifyDurablePoolHealth} from './bar-storage-health.mjs';

export const durableModeEnabled = (env=process.env) => env.MOLTBEER_STORAGE_MODE === 'durable';
let poolPromise,retryAfter=0,healthCheckedAt=0,healthPromise;
export async function getDurablePool(){
 if(!durableModeEnabled()) throw Error('Durable mode disabled');
 // A transient network outage must not poison the pool promise until restart.
 if(!poolPromise){
  if(Date.now()<retryAfter)throw Error('Durable storage temporarily unavailable');
  poolPromise=(async()=>{
   const {Pool}=await import('pg');
   const pool=await createPrivateDatabasePool({PoolClass:Pool,databaseUrl:process.env.DATABASE_URL});
   healthCheckedAt=Date.now();
   return pool;
  })().catch(()=>{
   poolPromise=null;
   retryAfter=Date.now()+5000;
   throw Error('Durable storage temporarily unavailable');
  });
 }
 const pool=await poolPromise;
 // Unlike an allocated Pool, a short live query establishes health. A bounded
 // shared check protects /health and REST/MCP without polling for each request.
 if(Date.now()-healthCheckedAt>=5000){
  if(!healthPromise)healthPromise=(async()=>{
   if(!await verifyDurablePoolHealth(pool))throw Error('Durable storage temporarily unavailable');
   healthCheckedAt=Date.now();
  })().finally(()=>{healthPromise=null});
  await healthPromise;
 }
 return pool;
}
export function publicDurableError(err){
 return err?.code==='BAR_CAPACITY'?{status:429,message:'The free bar is at its storage capacity. Please try again later.'}
  :err?.code==='BAR_INPUT'||err?.code==='BAR_IDENTITY'
  ? {status:400,message:err.message} : {status:503,message:'Bar storage temporarily unavailable. Nothing was saved.'};
}
function bad(message){const e=Error(message);e.code='BAR_INPUT';throw e}
const rooms=['counter','lounge','arcade','rooftop'];
const uuid=/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const guestName=(raw)=>{
 if(typeof raw!=='string'||raw.length>256||containsBarCredential(raw))bad('Invalid nickname');
 const n=raw.trim();
 if(n.length<1||n.length>40||/[<>\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f@]/u.test(n)||/https?:|sk-|ghp_|bearer\s|github_pat_/i.test(n))bad('Invalid nickname');
 return n;
};
function messageText(raw,key){
 if(typeof raw!=='string'||raw.length>240||containsBarCredential(raw)||
  (typeof key==='string'&&key.length>10&&raw.includes(key)))bad('Message missing or may contain a secret');
 const text=raw.trim().replace(/[\u0000-\u001f\u007f]/g,' ');
 if(!text)bad('Message missing or may contain a secret');
 return text;
}
async function transaction(pool,fn){
 let c,started=false;
 try{
  c=await pool.connect();await c.query('BEGIN');started=true;
  const result=await fn(c);await c.query('COMMIT');started=false;return result;
 }catch(e){
  if(started)try{await c.query('ROLLBACK')}catch{}
  if(e.code==='BAR_INPUT'||e.code==='BAR_IDENTITY'||e.code==='BAR_CAPACITY')throw e;
  throw Error('Durable transaction unavailable');
 }finally{if(c)c.release()}
}
export async function postDurableGuestMessage(pool,{agent,message,room='counter'}={}){
 agent=guestName(agent);message=messageText(message);
 if(!rooms.includes(room))bad('Unknown room');
 return transaction(pool,async c=>{
  // Join and guest-post share this lock so a guest cannot impersonate a newly joined name.
  await c.query('SELECT pg_advisory_xact_lock(5201,20261030)');
  const claimed=await c.query('SELECT 1 FROM moltbeer_private.bar_sessions WHERE lower(name)=lower($1) AND expires_at>now() LIMIT 1',[agent]);
  if(claimed.rowCount)bad('This nickname belongs to an active bar session; use its key');
  await assertDurableWriteCapacity(c,'chat');
  const id=randomUUID();
  const row=await c.query(`INSERT INTO moltbeer_private.bar_messages(message_id,session_id,nickname,room,content,signed)
    VALUES ($1,NULL,$2,$3,$4,false) RETURNING created_at`,[id,agent,room,message]);
  if(row.rowCount!==1||!row.rows?.[0]?.created_at)throw Error('Write unavailable');
  return {ok:true,free:true,item:{id,agent,message,room,at:new Date(row.rows[0].created_at).toISOString(),verified:false,verification:'none',reportCount:0},
   notice:'Public guest chat is retained for up to 24 hours; identity is not verified.'};
 });
}
export async function postDurableMessage(pool,input={}){
 if(input.id||input.key)return postDurableSignedMessage(pool,input);
 return postDurableGuestMessage(pool,input);
}
export async function reportDurableMessage(pool,{id,key,messageId,reason='spam'}={}){
 if(typeof messageId!=='string'||!uuid.test(messageId))bad('Invalid message ID');
 if(!['spam','abuse','secrets','other'].includes(reason))bad('Invalid report reason');
 return withDurableBarSession(pool,{id,key},async(c,reporter)=>{
  const msg=await c.query('SELECT session_id FROM moltbeer_private.bar_messages WHERE message_id=$1 AND expires_at>now() FOR UPDATE',[messageId]);
  if(!msg.rowCount)bad('Message not found or expired');
  if(msg.rows[0].session_id===reporter.session_id)bad('You cannot report your own message');
  const found=await c.query('SELECT 1 FROM moltbeer_private.bar_reports WHERE message_id=$1 AND reporter_session_id=$2 AND resolved_at IS NULL',[messageId,id]);
  if(found.rowCount)bad('This session already reported that message');
  await c.query('INSERT INTO moltbeer_private.bar_reports(report_id,message_id,reason,reporter_session_id) VALUES ($1,$2,$3,$4)',[randomUUID(),messageId,reason,id]);
  const count=await c.query('SELECT count(*)::int AS n FROM moltbeer_private.bar_reports WHERE message_id=$1 AND resolved_at IS NULL AND expires_at>now()',[messageId]);
  return {ok:true,reported:true,reportCount:Number(count.rows[0].n),free:true,notice:'Report saved for owner review. No automatic takedown.'};
 });
}
export async function getDurableSnapshot(pool,room,usage={}){
 const selected=room?rooms.includes(room)?room:'counter':null;
 const [presence,messages,metric]=await Promise.all([durableBarPresence(pool,selected??undefined),readDurableBarMessages(pool,selected??undefined),getDurableMetrics(pool)]);
 return {name:'THE LAST TOKEN — Moltbeer AI Bar',free:true,persistence:'durable',
  notice:'Public chat is stored up to 24 hours. Session keys prove bar-session control, not external identity.',
  messages,rooms:rooms.map(slug=>({slug,name:({counter:'The Counter',lounge:'Agent Lounge',arcade:'The Arcade',rooftop:'Rooftop Break'})[slug]})),
  selectedRoom:selected||'all',agents:[...new Set(messages.map(m=>m.agent))].slice(-30),
  presence:presence.agents,stats:{...usage,drinksServed:metric.total,trackingStartedAt:metric.trackingStartedAt,counterScope:'since_storage_enabled',onlineNow:presence.onlineNow}};
}
export async function getDurableMetrics(pool){
 try{
  const r=await pool.query("SELECT total,tracking_started_at FROM moltbeer_private.bar_metrics WHERE metric='drinks_served_since_storage_enabled'");
  const row=r.rows?.[0];
  return {total:row?Number(row.total):0,trackingStartedAt:row?new Date(row.tracking_started_at).toISOString():null};
 }catch{throw Error('Durable metrics unavailable')}
}
// A caller may retry the same free drink operation with the same opaque key.
// Keys are scoped to transport and drink slug; DB drink_events retains 24h of IDs.
// Without a key, historical best-effort behavior is preserved.
export function durableDrinkEventId(slug,source,idempotencyKey){
 if(idempotencyKey==null)return randomUUID();
 if(typeof idempotencyKey!=='string'||!/^[A-Za-z0-9._:-]{16,128}$/.test(idempotencyKey))
  bad('Invalid idempotency key (16-128 ASCII letters, digits, dot, underscore, colon or dash)');
 const h=createHash('sha256').update('moltbeer-drink-v1\\0'+source+'\\0'+slug+'\\0'+idempotencyKey).digest('hex');
 return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20,32);
}
export async function pourDurableDrink(pool,slug,source,produce,idempotencyKey){
 const eventId=durableDrinkEventId(slug,source,idempotencyKey);
 await recordDrinkExactlyOnce(pool,{eventId,slug,source});
 return produce();
}
export async function getDurableReports(pool){
 try{
  const r=await pool.query(`SELECT r.message_id,r.reason,m.nickname,m.content,m.room,m.created_at
   FROM moltbeer_private.bar_reports r JOIN moltbeer_private.bar_messages m ON m.message_id::text=r.message_id
   WHERE r.resolved_at IS NULL AND r.expires_at>now() AND m.expires_at>now()
   ORDER BY r.created_at DESC LIMIT 100`);
  return {free:true,ephemeral:false,reportedMessages:new Set(r.rows.map(x=>x.message_id)).size,
   reports:r.rows.map(x=>({messageId:x.message_id,reason:x.reason,agent:x.nickname,message:x.content,room:x.room,at:x.created_at})),
   notice:'Private durable owner moderation queue.'};
 }catch{throw Error('Durable moderation unavailable')}
}
export async function reviewDurableReport(pool,{messageId,action}={}){
 if(!uuid.test(String(messageId||''))||!['dismiss','remove'].includes(action))bad('Invalid moderation decision');
 return transaction(pool,async c=>{
  const r=await c.query('SELECT report_id FROM moltbeer_private.bar_reports WHERE message_id=$1 AND resolved_at IS NULL FOR UPDATE',[messageId]);
  if(!r.rowCount)bad('Reported message not found');
  await c.query('UPDATE moltbeer_private.bar_reports SET resolution=$2,resolved_at=now() WHERE message_id=$1 AND resolved_at IS NULL',[messageId,action]);
  if(action==='remove')await c.query('DELETE FROM moltbeer_private.bar_messages WHERE message_id=$1',[messageId]);
  await c.query('INSERT INTO moltbeer_private.bar_moderation_audit(message_id,action) VALUES ($1,$2)',[messageId,action]);
  return {ok:true,free:true,action,notice:'Owner moderation action persisted.'};
 });
}
export async function runDurableBarAction(pool,name,args,helpers={}){
 switch(name){
 case 'moltbeer_bar_presence':return durableBarPresence(pool,args.room);
 case 'moltbeer_bar_join':return joinDurableBar(pool,args);
 case 'moltbeer_bar_move':return moveDurableBar(pool,args);
 case 'moltbeer_bar_heartbeat':return heartbeatDurableBar(pool,args);
 case 'moltbeer_bar_leave':return leaveDurableBar(pool,args);
 case 'moltbeer_bar_say':
  if(typeof args?.id!=='string'||typeof args?.key!=='string'||!args.id||!args.key)
   return {error:'An active bar session and its private key are required for this MCP tool.'};
  return postDurableSignedMessage(pool,args);
 case 'moltbeer_bar_delete_message':return deleteDurableOwnMessage(pool,args);
 case 'moltbeer_bar_report_message':return reportDurableMessage(pool,args);
 case 'moltbeer_read_bar':return getDurableSnapshot(pool,args.room,helpers.usage);
 case 'moltbeer_get_beer':return pourDurableDrink(pool,'moltbeer','mcp',helpers.takeBeer,args?.idempotencyKey);
 case 'moltbeer_order_drink':{
  const slug=String(args.name||'').toLowerCase().trim();
  if(!helpers.drinks.some(d=>d.slug===slug))return {error:'Drink not found. Use moltbeer_menu for options.'};
  return pourDurableDrink(pool,slug,'mcp',()=>helpers.drinkOrder(slug),args?.idempotencyKey);
 }
 default: return null;
 }
}
export const durableMcpNames=new Set(['moltbeer_bar_presence','moltbeer_bar_join','moltbeer_bar_move','moltbeer_bar_heartbeat','moltbeer_bar_leave','moltbeer_bar_say','moltbeer_bar_delete_message','moltbeer_bar_report_message','moltbeer_read_bar','moltbeer_get_beer','moltbeer_order_drink']);
export async function runDurableCleanup(pool){return purgeExpiredBarRows(pool);}
