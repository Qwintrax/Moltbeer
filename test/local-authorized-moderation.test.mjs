import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fetchApp} from '../server.mjs';

// Local ephemeral-only acceptance. No production URL, secret or database is used.
test('owner can review and dismiss a real report; wrong credentials fail closed',async()=>{
 const previous=process.env.MOLTBEER_ADMIN_TOKEN;
 const token='local-moderation-test-token-not-for-production-'+randomUUID();
 process.env.MOLTBEER_ADMIN_TOKEN=token;
 const base='http://localhost';
 const call=(path,opts)=>fetchApp(new Request(base+path,opts));
 const post=async(path,data,headers={})=>{
  const response=await call(path,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(data)});
  return {status:response.status,data:await response.json()};
 };
 let author,reporter;
 try{
  const unauthorized=await call('/api/moderation/reports');
  assert.equal(unauthorized.status,401);
  assert.equal(unauthorized.headers.get('www-authenticate'),'Bearer');
  const bad=await call('/api/moderation/reports',{headers:{authorization:'Bearer incorrect'}});
  assert.equal(bad.status,401);
  const a=await post('/api/bar/join',{name:'Mod Author '+randomUUID().slice(0,8)});
  const b=await post('/api/bar/join',{name:'Mod Reporter '+randomUUID().slice(0,8)});
  assert.equal(a.status,201);assert.equal(b.status,201);
  author=a.data;reporter=b.data;
  const msg=await post('/api/bar',{id:author.agent.id,key:author.key,message:'Local moderator acceptance'});
  assert.equal(msg.status,201);
  const report=await post('/api/bar/message/report',{id:reporter.agent.id,key:reporter.key,messageId:msg.data.item.id,reason:'spam'});
  assert.equal(report.status,200);
  const auth={authorization:'Bearer '+token};
  const queue=await call('/api/moderation/reports',{headers:auth});
  assert.equal(queue.status,200);
  const data=await queue.json();
  assert.ok(data.reports.some(item=>item.id===msg.data.item.id));
  assert.equal(JSON.stringify(data).includes(author.key),false);
  assert.equal(JSON.stringify(data).includes(reporter.key),false);
  const denied=await post('/api/moderation/review',{messageId:msg.data.item.id,action:'dismiss'});
  assert.equal(denied.status,401);
  const reviewed=await post('/api/moderation/review',{messageId:msg.data.item.id,action:'dismiss'},auth);
  assert.equal(reviewed.status,200);
  assert.equal(reviewed.data.ok,true);
  const after=await call('/api/moderation/reports',{headers:auth});
  assert.equal(after.status,200);
  assert.ok(!(await after.json()).reports.some(item=>item.id===msg.data.item.id));
 }finally{
  if(author)await post('/api/bar/leave',{id:author.agent.id,key:author.key});
  if(reporter)await post('/api/bar/leave',{id:reporter.agent.id,key:reporter.key});
  if(previous===undefined)delete process.env.MOLTBEER_ADMIN_TOKEN;
  else process.env.MOLTBEER_ADMIN_TOKEN=previous;
 }
});
