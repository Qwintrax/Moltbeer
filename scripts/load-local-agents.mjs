// Local-only opt-in agent load test. Never targets Railway or Supabase.
// Uses the in-process ephemeral bar; does not create public agents or messages.
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {fetchApp} from '../server.mjs';
const base='http://localhost';
const ipFor=(i)=>'198.18.'+Math.floor(i/250)+'.'+(i%250+1);
const count=Number(process.env.MOLTBEER_LOAD_AGENTS||30);
const rounds=Number(process.env.MOLTBEER_LOAD_ROUNDS||12);
if(!Number.isSafeInteger(count)||count<1||count>35||!Number.isSafeInteger(rounds)||rounds<1||rounds>100)throw Error('Local load bounds: 1-35 agents, 1-100 rounds');
if(process.env.MOLTBEER_STORAGE_MODE==='durable'||process.env.DATABASE_URL)throw Error('Refusing load test when durable database configuration is present');
const prefix='LocalProbe'+randomBytes(5).toString('hex');
const sessions=[];
const call=async(path,data,i=0)=>{
 const response=await fetchApp(new Request(base+path,{method:data?'POST':'GET',headers:data?{'content-type':'application/json','x-real-ip':ipFor(i)}:{},body:data?JSON.stringify(data):undefined}));
 return {status:response.status,body:await response.json()};
};
const realNow=Date.now;
let virtualOffsetMs=0;
const advanceRateWindow=()=>{virtualOffsetMs+=61_000;Date.now=()=>realNow()+virtualOffsetMs;};
const started=performance.now();let checks=0,throttled=0,attemptedRounds=0;
let testFailure;
try{
 const joined=await Promise.all(Array.from({length:count},(_,i)=>call('/api/bar/join',{name:prefix+i,room:i%2?'lounge':'counter'},i)));
 for(const item of joined){assert.equal(item.status,201);assert.equal(item.body.ok,true);sessions.push({id:item.body.agent.id,key:item.body.key});checks++}
 for(let round=0;round<rounds;round++){
  const results=await Promise.all(sessions.map((s,i)=>call('/api/bar/move',{...s,room:(i+round)%2?'lounge':'counter',spot:'stool',mood:'happy'},i)));
  for(const item of results){
   if(item.status===429){assert.match(item.body.error,/Rate limit reached/);throttled++;checks++;continue}
   assert.equal(item.status,200);assert.equal(item.body.ok,true);checks++;
  }
  const presence=await call('/api/bar/agents');assert.equal(presence.status,200);
  assert.equal(presence.body.agents.filter(a=>a.name.startsWith(prefix)).length,count);checks++;
  attemptedRounds++;
  if(throttled){
   // Exercise the real throttle, then advance only this isolated process clock.
   // Never wait 60 seconds or disable the production rate limiter.
   advanceRateWindow();break;
  }
 }
 if(rounds>=26)assert.ok(throttled>0,'Long load run must exercise HTTP 429');
 // Chat, ownership and MCP are exercised on isolated ephemeral sessions.
 const poster=sessions[0],reporter=sessions[1]||sessions[0];
 const posted=await call('/api/bar',{...poster,message:'Local test cheers'},count+1);
 assert.equal(posted.status,201);assert.equal(posted.body.item.verified,true);checks++;
 const messageId=posted.body.item.id;
 const chat=await call('/api/bar');assert.ok(chat.body.messages.some(m=>m.id===messageId));checks++;
 const wrongDelete=await call('/api/bar/message/delete',{...reporter,messageId},count+2);
 assert.equal(wrongDelete.status,400);checks++;
 if(sessions.length>1){
  const report=await call('/api/bar/message/report',{...reporter,messageId,reason:'spam'},count+3);
  assert.equal(report.status,200);assert.equal(report.body.reportCount,1);checks++;
 }
 const mcp=await fetchApp(new Request(base+'/mcp',{method:'POST',headers:{'content-type':'application/json','x-real-ip':ipFor(count+4)},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'moltbeer_bar_presence',arguments:{}}})}));
 assert.equal(mcp.status,200);
 const mcpData=await mcp.json();assert.equal(mcpData.result.isError,false);checks++;
 const deleted=await call('/api/bar/message/delete',{...poster,messageId},count+5);
 assert.equal(deleted.status,200);assert.equal(deleted.body.deleted,true);checks++;
 const afterDelete=await call('/api/bar');assert.ok(!afterDelete.body.messages.some(m=>m.id===messageId));checks++;
 // Reconnect: a passive read does not extend a session, but an authenticated
 // heartbeat does. A stale key must not regain access after an explicit leave.
 const heartbeat=await call('/api/bar/heartbeat',{...poster},count+6);
 assert.equal(heartbeat.status,200);assert.equal(heartbeat.body.ok,true);checks++;
 const oldKey=poster.key;
 const departure=await call('/api/bar/leave',{...poster},count+7);
 assert.equal(departure.status,200);checks++;
 sessions.shift(); // The old session is already removed, do not delete twice.
 const expired=await call('/api/bar/heartbeat',{id:poster.id,key:oldKey},count+8);
 assert.equal(expired.status,400);checks++;
 const rejoined=await call('/api/bar/join',{name:prefix+'0',room:'arcade'},count+9);
 assert.equal(rejoined.status,201);assert.notEqual(rejoined.body.agent.id,poster.id);
 assert.notEqual(rejoined.body.key,oldKey);checks++;
 sessions.unshift({id:rejoined.body.agent.id,key:rejoined.body.key});
 const staleMove=await call('/api/bar/move',{id:poster.id,key:oldKey,room:'counter'},count+10);
 assert.equal(staleMove.status,400);checks++;
 const freshMove=await call('/api/bar/move',{...sessions[0],room:'counter'},count+11);
 assert.equal(freshMove.status,200);checks++;
 const denied=await call('/api/bar/move',{id:sessions[0].id,key:'invalid-key',room:'arcade'},0);
 assert.notEqual(denied.status,200);checks++;
}catch(error){testFailure=error;
}finally{
 // A saturated client must still be able to clean up once its 60s window expires.
 // Do not let cleanup assertions hide the original test failure.
 advanceRateWindow();
 let cleanupFailure;
 try{
  const errors=[];
  for(const [i,s] of sessions.entries()){
   const r=await call('/api/bar/leave',s,i);
   if(r.status===200)checks++;else errors.push(`agent ${i}: HTTP ${r.status}`);
  }
  const after=await call('/api/bar/agents');
  assert.equal(after.status,200);
  assert.equal(after.body.agents.filter(a=>a.name.startsWith(prefix)).length,0);
  checks++;
  assert.deepEqual(errors,[],'All local agents must be removed after the quota window');
 }catch(error){cleanupFailure=error;
 }finally{Date.now=realNow;}
 if(testFailure){if(cleanupFailure)console.error('Local load cleanup also failed:',cleanupFailure.message);throw testFailure;}
 if(cleanupFailure)throw cleanupFailure;
}
console.log(JSON.stringify({ok:true,localOnly:true,agents:count,rounds,attemptedRounds,throttled,checks,durationMs:Math.round(performance.now()-started),remainingTestAgents:0}));




