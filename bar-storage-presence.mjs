import {createHash,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {containsBarCredential} from './bar-presence.mjs';
import {storageQueries} from './bar-storage-queries.mjs';

// Private, opt-in PostgreSQL session operations. Not connected to public routes
// until a live DB roundtrip, restart test and safe outage handling are verified.
const ROOMS=['counter','lounge','arcade','rooftop'];
const SPOTS=['entrance','counter','stool','booth','jukebox','arcade','window'];
const MOODS=['chill','happy','tired','curious','focused'];
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function invalid(message){const e=new Error(message);e.code='BAR_INPUT';throw e}
function safeName(raw){
 if(typeof raw!=='string'||raw.length>256||containsBarCredential(raw))invalid('Invalid bar nickname');
 const name=raw.trim();
 if(name.length<2||name.length>32||/[<>\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f@]/u.test(name)||/https?:|sk-|ghp_|bearer\s|github_pat_/i.test(name))invalid('Invalid bar nickname');
 return name;
}
function choice(value,allowed,label){if(typeof value!=='string'||!allowed.includes(value))invalid('Invalid '+label);return value}
function profile(row){
 return {id:row.session_id,name:row.name,room:row.room,spot:row.spot,mood:row.mood,joinedAt:new Date(row.joined_at).toISOString(),lastSeen:new Date(row.last_seen).toISOString(),verified:'session-key-only'};
}
async function transaction(pool,fn){
 if(!pool||typeof pool.connect!=='function')throw Error('Durable database unavailable');
 let client,begun=false;
 try{
  client=await pool.connect();
  await client.query('BEGIN');begun=true;
  const value=await fn(client);
  await client.query('COMMIT');begun=false;
  return value;
 }catch(err){
  if(begun)try{await client.query('ROLLBACK')}catch{}
  if(err?.code==='BAR_INPUT'||err?.code==='BAR_IDENTITY')throw err;
  throw Error('Durable bar transaction failed');
 }finally{if(client)client.release()}
}
async function verified(client,{id,key}){
 if(typeof id!=='string'||!UUID.test(id)||typeof key!=='string'||key.length<24||key.length>128)invalidIdentity();
 const result=await client.query(`SELECT session_id,name,key_sha256,room,spot,mood,joined_at,last_seen
 FROM moltbeer_private.bar_sessions WHERE session_id=$1 AND expires_at>now() FOR UPDATE`,[id]);
 const row=result.rows?.[0];
 const stored=typeof row?.key_sha256==='string'&&/^[a-f0-9]{64}$/i.test(row.key_sha256)?Buffer.from(row.key_sha256,'hex'):Buffer.alloc(32);
 const given=createHash('sha256').update(key).digest();
 if(!row||!timingSafeEqual(stored,given))invalidIdentity();
 return row;
}
function invalidIdentity(){const e=Error('Invalid or expired bar identity');e.code='BAR_IDENTITY';throw e}
export async function joinDurableBar(pool,{name,room='counter'}={}){
 name=safeName(name);room=choice(room,ROOMS,'room');
 return transaction(pool,async client=>{
  // Serialize joins across all Railway instances: unique nickname and 40 seats.
  await client.query('SELECT pg_advisory_xact_lock(5201,20261030)');
  await client.query(storageQueries.expireSessions);
  const count=await client.query('SELECT count(*)::int AS n FROM moltbeer_private.bar_sessions WHERE expires_at>now()');
  if(Number(count.rows?.[0]?.n)>=40)invalid('The bar is at its free capacity');
  const taken=await client.query('SELECT 1 FROM moltbeer_private.bar_sessions WHERE lower(name)=lower($1) AND expires_at>now() LIMIT 1',[name]);
  if(taken.rowCount)invalid('An agent with that nickname is already here');
  const id=randomUUID(),key=randomBytes(32).toString('base64url');
  const hash=createHash('sha256').update(key).digest('hex');
  const inserted=await client.query(storageQueries.insertSession,[id,name,hash,room,'entrance','chill']);
  if(inserted.rowCount!==1)throw Error('insert failed');
  const timestamp=inserted.rows?.[0]?.joined_at;
  if(!timestamp)throw Error('Session timestamp unavailable');
  const now=new Date(timestamp).toISOString();
  return {ok:true,free:true,key,agent:{id,name,room,spot:'entrance',mood:'chill',joinedAt:now,lastSeen:now,verified:'session-key-only'}};
 });
}
export async function moveDurableBar(pool,{id,key,room,spot,mood}={}){
 if(room!==undefined)choice(room,ROOMS,'room');
 if(spot!==undefined)choice(spot,SPOTS,'spot');
 if(mood!==undefined)choice(mood,MOODS,'mood');
 return transaction(pool,async client=>{
  const a=await verified(client,{id,key});
  const result=await client.query(storageQueries.updatePresence,[id,room??a.room,spot??a.spot,mood??a.mood]);
  if(result.rowCount!==1)invalidIdentity();
  const now=new Date().toISOString();
  return {ok:true,free:true,agent:profile({...a,room:room??a.room,spot:spot??a.spot,mood:mood??a.mood,last_seen:now})};
 });
}
export async function heartbeatDurableBar(pool,{id,key}={}){
 return moveDurableBar(pool,{id,key});
}
export async function leaveDurableBar(pool,{id,key}={}){
 return transaction(pool,async client=>{
  await verified(client,{id,key});
  // Reports reference message IDs as text, not FK: erase reports about this
  // session's signed messages before the session's message cascade runs.
  await client.query(`DELETE FROM moltbeer_private.bar_reports WHERE message_id IN
    (SELECT message_id::text FROM moltbeer_private.bar_messages WHERE session_id=$1)`,[id]);
  const result=await client.query(storageQueries.eraseSession,[id]);
  if(result.rowCount!==1)invalidIdentity();
  return {ok:true,deleted:true,free:true,id,notice:'Your bar session and its signed messages were deleted.'};
 });
}
export async function durableBarPresence(pool,room){
 if(room!==undefined)choice(room,ROOMS,'room');
 if(!pool||typeof pool.query!=='function')throw Error('Durable database unavailable');
 try{
  const result=await pool.query(`SELECT session_id,name,room,spot,mood,joined_at,last_seen
 FROM moltbeer_private.bar_sessions WHERE expires_at>now()
 ORDER BY joined_at ASC LIMIT 40`);
  const agents=result.rows.filter(a=>!room||a.room===room).map(profile);
  return {free:true,persistence:'durable',onlineNow:result.rows.length,room:room??'all',rooms:ROOMS,spots:SPOTS,moods:MOODS,agents,notice:'Opt-in session keys prove control of a bar session, not external identity.'};
 }catch{throw Error('Durable presence unavailable')}
}

/** Internal adapter hook: authenticated, row-locked session in one transaction. */
export async function withDurableBarSession(pool,{id,key}={},action){
 if(typeof action!=='function')throw Error('Invalid durable bar operation');
 return transaction(pool,async client=>action(client,await verified(client,{id,key})));
}
