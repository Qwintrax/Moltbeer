// Nonmutating contract and security audit. Keep fake agents off production:
// this suite exercises fetchApp only in the isolated Node CI process.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchApp} from '../server.mjs';

const base='http://localhost';
async function request(path,opts={}){
 const r=await fetchApp(new Request(base+path,opts));
 const body=await r.text();
 let data=null;
 if((r.headers.get('content-type')||'').includes('application/json')&&body)data=JSON.parse(body);
 return {r,body,data,status:r.status};
}
const post=(path,data)=>request(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});

test('audit: 16 unique free drinks, four rooms and optional tip jar',async()=>{
 const menu=await request('/api/menu');
 assert.equal(menu.status,200);
 assert.equal(menu.data.free,true);
 assert.equal(menu.data.drinks.length,16);
 assert.equal(new Set(menu.data.drinks.map(d=>d.slug)).size,16);
 assert.ok(menu.data.drinks.every(d=>typeof d.name==='string'&&d.name.length>0));
 assert.equal(menu.data.tipJar?.optional,true);
 const rooms=await request('/api/rooms');
 assert.equal(rooms.status,200);
 assert.equal(rooms.data.rooms.length,4);
 const tip=await request('/api/tipjar');
 assert.equal(tip.status,200);
 assert.equal(tip.data.autoTip,false);
 assert.equal(tip.data.optional,true);
});

test('audit: both health aliases state ephemeral truthfully before activation',async()=>{
 for(const path of ['/health','/api/health']){
  const {status,data}=await request(path);
  assert.equal(status,200);
  assert.equal(data.ok,true);
  assert.equal(data.persistence,'ephemeral');
 }
 const stats=(await request('/api/stats')).data;
 assert.equal(stats.persistence,'ephemeral');
 assert.equal(stats.counterScope,'since_server_restart');
 assert.match(stats.disclaimer,/not a lifetime total/i);
});

test('audit: metadata, sitemap and robots expose correct discoverable URLs',async()=>{
 for(const path of ['/openapi.json','/skill.json','/.well-known/agent.json']){
  const {status,data}=await request(path);
  assert.equal(status,200);
  assert.ok(data&&typeof data==='object');
 }
 const openapi=(await request('/openapi.json')).data;
 assert.equal(openapi.openapi,'3.1.0');
 assert.ok(openapi.paths['/api/bar/join']);
 const skill=await request('/SKILL.md');
 assert.equal(skill.status,200);
 assert.match(skill.body,/MOLTBEER/);
 const robots=await request('/robots.txt');
 assert.equal(robots.status,200);
 assert.match(robots.body,/Sitemap:/);
 const sitemap=await request('/sitemap.xml');
 assert.equal(sitemap.status,200);
 assert.match(sitemap.body,/<urlset/);
});

test('audit: site pages, public graphics and privacy remain accessible',async()=>{
 for(const path of ['/','/bar','/bar-room','/city','/privacy']){
  const a=await request(path);
  assert.equal(a.status,200,path);
  assert.match(a.r.headers.get('content-type')||'',/text\/html/,path);
  assert.ok(a.body.length>150,path);
 }
 const sprite=await request('/assets/kenney-tiny-town-selected.webp');
 assert.equal(sprite.status,200);
 assert.match(sprite.r.headers.get('content-type')||'',/image\/webp/);
 const logo=await request('/logo.webp');
 assert.equal(logo.status,200);
 assert.match(logo.r.headers.get('content-type')||'',/image\/webp/);
});

test('audit: browser security and privacy headers on JSON + HTML',async()=>{
 for(const path of ['/health','/api/menu','/bar','/privacy','/city']){
  const {r}=await request(path);
  assert.equal(r.headers.get('x-content-type-options'),'nosniff',path);
  assert.equal(r.headers.get('referrer-policy'),'no-referrer',path);
  assert.match(r.headers.get('permissions-policy')||'',/geolocation=\(\)/,path);
  assert.match(r.headers.get('cache-control')||'',/no-store/,path);
 }
});

test('audit: anonymous presence has no session secrets or imaginary visitors',async()=>{
 const {status,data,body}=await request('/api/bar/agents');
 assert.equal(status,200);
 assert.ok(Array.isArray(data.agents));
 assert.equal(data.onlineNow,data.agents.length);
 assert.doesNotMatch(body,/"key"\s*:/i);
 const bar=await request('/api/bar');
 assert.equal(bar.status,200);
 assert.ok(Array.isArray(bar.data.messages));
 assert.ok(bar.r.headers.get('etag'));
});

test('audit: read-only routes and MCP discovery do not inflate drink or message counters',async()=>{
 const before=(await request('/api/stats')).data;
 for(const path of ['/health','/api/menu','/api/rooms','/api/bar','/api/bar/agents','/city','/bar-room','/privacy']){
  assert.equal((await request(path)).status,200,path);
 }
 for(const [id,method] of [[100,'initialize'],[101,'ping'],[102,'tools/list']]){
  const m=await post('/mcp',{jsonrpc:'2.0',id,method,params:method==='initialize'?{protocolVersion:'2025-03-26',clientInfo:{name:'read-only-audit',version:'1'}}:{}});
  assert.equal(m.status,200,method);
  assert.equal(m.data.id,id);
  assert.ok(m.data.result);
  if(method==='tools/list'){
   const names=m.data.result.tools.map(t=>t.name);
   assert.ok(names.includes('moltbeer_bar_join'));
   assert.ok(names.includes('moltbeer_bar_presence'));
  }
 }
 const r=await post('/mcp',{jsonrpc:'2.0',id:103,method:'tools/call',params:{name:'moltbeer_bar_presence',arguments:{room:'counter'}}});
 assert.equal(r.status,200);
 assert.equal(r.data.result.isError,false);
 const after=(await request('/api/stats')).data;
 for(const field of ['drinksServed','messages','beers','cheers'])
  assert.equal(after[field],before[field],field+' should be unchanged');
});

test('audit: invalid or malformed MCP messages reject requests without public mutations',async()=>{
 const before=(await request('/api/stats')).data;
 let r=await post('/mcp',{jsonrpc:'1.0',id:1,method:'tools/list'});
 assert.equal(r.status,400);
 assert.equal(r.data.error.code,-32600);
 r=await post('/mcp',{jsonrpc:'2.0',id:2,method:'not/a/real/method'});
 assert.equal(r.status,404);
 assert.equal(r.data.error.code,-32601);
 r=await request('/mcp',{method:'POST',headers:{'content-type':'application/json'},body:'not-json'});
 assert.equal(r.status,400);
 assert.equal(r.data.error.code,-32700);
 const after=(await request('/api/stats')).data;
 assert.equal(after.drinksServed,before.drinksServed);
 assert.equal(after.messages,before.messages);
});

test('audit: unconfigured owner moderation fails closed and does not reveal reports',async()=>{
 const r=await request('/api/moderation/reports');
 // A CI environment without an owner secret must not expose moderation.
 if(!process.env.MOLTBEER_ADMIN_TOKEN){
  assert.equal(r.status,503);
  assert.equal(r.data?.reports,undefined);
 }
});

test('audit: unknown paths and wrong methods cannot trigger writes',async()=>{
 const before=(await request('/api/stats')).data;
 const bad=await request('/definitely-not-a-real-route');
 assert.equal(bad.status,404);
 const wrong=await request('/api/bar/join');
 assert.notEqual(wrong.status,201);
 const preflight=await request('/api/bar',{method:'OPTIONS'});
 assert.equal(preflight.status,204);
 const after=(await request('/api/stats')).data;
 assert.equal(after.messages,before.messages);
 assert.equal(after.drinksServed,before.drinksServed);
});

test('audit: conditional ETag response has no body and security headers',async()=>{
 const snapshot=await request('/api/bar');
 const etag=snapshot.r.headers.get('etag');
 const conditional=await request('/api/bar',{headers:{'if-none-match':etag}});
 assert.equal(conditional.status,304);
 assert.equal(conditional.body,'');
 assert.equal(conditional.r.headers.get('etag'),etag);
 assert.equal(conditional.r.headers.get('x-content-type-options'),'nosniff');
});
