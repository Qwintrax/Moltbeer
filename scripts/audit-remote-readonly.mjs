#!/usr/bin/env node
// Independent, non-mutating production acceptance audit. No join, beer,
// cheers, chat, tipping, registration, fake agents or public writes.
// Uses only GET plus metadata/presence MCP calls (which cannot create visitors).
import assert from 'node:assert/strict';
import {assertReadOnlyAuditRequest} from './readonly-audit-guard.mjs';
const origin=process.env.MOLTBEER_BASE_URL;
if(!origin)throw Error('MOLTBEER_BASE_URL must point to an approved HTTPS host');
const root=new URL(origin);
assert.equal(root.protocol,'https:');
assert.equal(root.pathname,'/');
assert.equal(root.username,'');
assert.equal(root.password,'');
const expected=process.env.MOLTBEER_EXPECTED_PERSISTENCE||'ephemeral';
assert.ok(['ephemeral','durable'].includes(expected));
const checks=[
 ['/', 'text/html'],['/bar','text/html'],['/bar-room','text/html'],
 ['/city','text/html'],['/privacy','text/html'],
 ['/human-mode','text/html'],['/human-world','text/html'],
 ['/stage','text/html'],['/token','text/html'],
 ['/health','application/json'],['/api/health','application/json'],
 ['/api/stats','application/json'],['/api/menu','application/json'],
 ['/api/rooms','application/json'],['/api/tipjar','application/json'],
 ['/api/bar','application/json'],['/api/bar/agents','application/json'],
 ['/api/agents','application/json'],['/openapi.json','application/json'],
 ['/skill.json','application/json'],['/.well-known/agent.json','application/json'],
 ['/SKILL.md','text/'],['/robots.txt','text/plain'],
 ['/sitemap.xml','application/xml'],['/favicon.ico','image/webp'],
 ['/logo.webp','image/webp'],['/assets/kenney-tiny-town-selected.webp','image/webp']
];
const failures=[],durations=[];
let health,menu,rooms,bar;
const userAgent='MoltbeerFullReadOnlyAudit/1.0';
async function http(path,options={}){
 assertReadOnlyAuditRequest(path, options);
 const start=Date.now();
 const response=await fetch(new URL(path,root),{
  method:options.method||'GET',
  headers:{'user-agent':userAgent,...options.headers},
  body:options.body,
  redirect:'error',
  signal:AbortSignal.timeout(10000),
  cache:'no-store'
 });
 durations.push({path,ms:Date.now()-start,status:response.status});
 return response;
}
for(const [path,type] of checks){
 try{
  const r=await http(path);
  assert.equal(r.status,200,path+' returned HTTP '+r.status);
  assert.ok((r.headers.get('content-type')||'').includes(type),path+' incorrect MIME');
  if(['/','/bar','/city','/privacy','/bar-room'].includes(path)){
   assert.equal(r.headers.get('x-content-type-options'),'nosniff',path);
   assert.equal(r.headers.get('referrer-policy'),'no-referrer',path);
  }
  if(path==='/health'||path==='/api/health'){
   const j=await r.json();assert.equal(j.ok,true);assert.equal(j.persistence,expected);
   if(path==='/health')health=j;
  }
  if(path==='/api/menu'){
   menu=await r.json();assert.equal(menu.free,true);assert.equal(menu.drinks.length,16);
   assert.equal(new Set(menu.drinks.map(d=>d.slug)).size,16);
   assert.equal(menu.tipJar.optional,true);
  }
  if(path==='/api/rooms'){
   rooms=await r.json();assert.equal(rooms.rooms.length,4);
  }
  if(path==='/api/stats'){
   const stats=await r.json();
   assert.equal(stats.persistence,expected);
   assert.equal(stats.counterScope,expected==='durable'?'since_storage_enabled':'since_server_restart');
  }
  if(path==='/api/bar'){
   bar=await r.json();assert.ok(Array.isArray(bar.messages));
   const tag=r.headers.get('etag');
   assert.ok(tag,'Bar must expose stable ETag');
   const cached=await http(path,{headers:{'if-none-match':tag}});
   assert.equal(cached.status,304);
   assert.equal(await cached.text(),'');
  }
  if(path==='/api/bar/agents'){
   const a=await r.json();
   assert.ok(Array.isArray(a.agents));
   assert.equal(a.agents.length,a.onlineNow);
   assert.ok(a.agents.every(x=>x.key===undefined),'private session keys must not be public');
  }
  if(path==='/api/tipjar'){
   const tip=await r.json();assert.equal(tip.optional,true);assert.equal(tip.autoTip,false);
  }
  if(path==='/openapi.json'){
   const api=await r.json();
   assert.equal(api.openapi,'3.1.0');
   assert.ok(api.paths['/api/bar/join']);
  }
  // Other paths: status, MIME and security/header checks above are sufficient.
  console.log('PASS HTTP',path);
 }catch(err){failures.push(path);console.error('FAIL HTTP',path,err.message)}
}
const mcp=(id,method,params={})=>http('/mcp',{
 method:'POST',headers:{'content-type':'application/json'},
 body:JSON.stringify({jsonrpc:'2.0',id,method,params})
});
for(const [id,method,params] of [
 [201,'initialize',{protocolVersion:'2025-03-26',clientInfo:{name:'readonly-audit',version:'1'}}],
 [202,'ping',{}],[203,'tools/list',{}],
 [204,'tools/call',{name:'moltbeer_bar_presence',arguments:{room:'counter'}}]
]){
 try{
  const r=await mcp(id,method,params);
  assert.equal(r.status,200,method);
  const j=await r.json();
  assert.equal(j.id,id);
  assert.ok(j.result,method);
  if(method==='tools/list'){
   const names=j.result.tools.map(t=>t.name);
   for(const n of ['moltbeer_bar_join','moltbeer_bar_presence','moltbeer_bar_say','moltbeer_bar_leave'])
    assert.ok(names.includes(n),n);
  }
  if(method==='tools/call')assert.equal(j.result.isError,false);
  console.log('PASS MCP',method);
 }catch(err){failures.push('MCP '+method);console.error('FAIL MCP',method,err.message)}
}
// Moderation's expected 503/401 belongs in isolated local tests, not in
// public CI probes: expected 503s pollute production error-rate metrics.
// The external audit checks only safe public reads and MCP discovery.
const d=durations.map(x=>x.ms).sort((a,b)=>a-b);
const percentile=p=>d.length?d[Math.min(d.length-1,Math.ceil(d.length*p)-1)]:null;
console.log('RESULT',JSON.stringify({http:checks.length,mcp:4,ownerAuth:0,moderationAuth:'local_only',passed:checks.length+4-failures.length,failed:failures.length,failedChecks:failures,p50ms:percentile(0.5),p95ms:percentile(0.95),maxMs:d.at(-1),persistence:health?.persistence,menuDrinks:menu?.drinks?.length,rooms:rooms?.rooms?.length,barMessages:bar?.messages?.length}));
if(failures.length)process.exitCode=1;
