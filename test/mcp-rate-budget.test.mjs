import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchApp} from '../server.mjs';

// All requests below stay inside the isolated Node test process; no public
// clients, production API calls or real database writes are performed.
const base='http://localhost';
function mcp(ip,id,method,params={}){
 return fetchApp(new Request(base+'/mcp',{
  method:'POST',
  headers:{'content-type':'application/json','x-real-ip':ip},
  body:JSON.stringify({jsonrpc:'2.0',id,method,params})
 }));
}
function cheers(ip){
 return fetchApp(new Request(base+'/api/cheers',{
  method:'POST',
  headers:{'content-type':'application/json','x-real-ip':ip},
  body:JSON.stringify({agent:'Local Test'})
 }));
}

test('MCP discovery is independently bounded and cannot consume the REST write quota',async()=>{
 const ip='203.0.113.248';
 for(let i=0;i<60;i++){
  const response=await mcp(ip,i,'ping');
  assert.equal(response.status,200,'read-only MCP request '+i);
 }
 const denied=await mcp(ip,61,'ping');
 assert.equal(denied.status,429);
 assert.equal(denied.headers.get('retry-after'),'60');
 assert.equal((await denied.json()).error.code,-32000);
 assert.equal((await cheers(ip)).status,200,'MCP reads must not exhaust mutation quota');
});

test('MCP mutating tools still spend the shared REST mutation quota',async()=>{
 const ip='203.0.113.249';
 for(let i=0;i<25;i++){
  const response=await mcp(ip,i,'tools/call',{name:'moltbeer_cheers',arguments:{agent:'Local Test'}});
  assert.equal(response.status,200,'MCP mutation '+i);
 }
 const denied=await mcp(ip,26,'tools/call',{name:'moltbeer_cheers',arguments:{agent:'Local Test'}});
 assert.equal(denied.status,429);
 assert.equal(denied.headers.get('retry-after'),'60');
 assert.equal((await denied.json()).error.code,-32000);
 const discovered=await mcp(ip,27,'tools/list');
 assert.equal(discovered.status,200,'write quota must not block read-only discovery');
});
