import test from "node:test";
import assert from "node:assert/strict";
import { fetchApp } from "../server.mjs";
const base="http://localhost";
const call=(path,opts)=>fetchApp(new Request(base+path,opts));

test("free core endpoints",async()=>{
  let r=await call("/health"); assert.equal(r.status,200); assert.equal((await r.json()).ok,true);
  r=await call("/api/beer"); assert.equal(r.status,200); assert.equal((await r.json()).free,true);
  r=await call("/api/menu"); assert.equal(r.status,200); const menu=await r.json(); assert.equal(menu.free,true);assert.equal(menu.drinks.length,15);
  r=await call("/api/drink?name=cache-lager"); assert.equal(r.status,200); assert.equal((await r.json()).free,true);
  r=await call("/api/drink?name=unknown"); assert.equal(r.status,404);
  r=await call("/api/tipjar"); assert.equal(r.status,200); const tip=await r.json(); assert.equal(tip.optional,true);assert.equal(tip.autoTip,false);assert.equal(tip.address,"Ad2nYECAfGKp6MtK1ST9D3w1kApBdQwTZkw6cRbHys5Z");
});
test("bar and agent discovery",async()=>{
  let r=await call("/api/bar");assert.equal(r.status,200);assert.equal((await r.json()).free,true);
  r=await call("/api/bar",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({agent:"Test Agent",message:"Cheers!"})});assert.equal(r.status,201);
  r=await call("/api/bar");assert.equal((await r.json()).messages.at(-1).message,"Cheers!");
  r=await call("/SKILL.md");assert.equal(r.status,200);assert.match(await r.text(),/Even AI Agents Need a Beer Break/);
  r=await call("/openapi.json");assert.equal((await r.json()).openapi,"3.1.0");
  r=await call("/.well-known/agent.json");assert.equal((await r.json()).cost,"free");
});
test("MCP basic handshake, menu and drink",async()=>{
  const send=async (payload)=>{const r=await call("/mcp",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});return {status:r.status,json:await r.json()};};
  let a=await send({jsonrpc:"2.0",id:1,method:"initialize",params:{protocolVersion:"2025-03-26",capabilities:{},clientInfo:{name:"moltbeer-test",version:"1.0"}}});assert.equal(a.status,200);assert.equal(a.json.result.serverInfo.name,"moltbeer");
  a=await send({jsonrpc:"2.0",id:2,method:"tools/list"});assert.equal(a.status,200);assert.ok(a.json.result.tools.some(x=>x.name==="moltbeer_order_drink"));
  a=await send({jsonrpc:"2.0",id:3,method:"tools/call",params:{name:"moltbeer_order_drink",arguments:{name:"context-window-ipa"}}});assert.equal(a.status,200);assert.match(a.json.result.content[0].text,/Context Window IPA/);
});
