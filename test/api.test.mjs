import test from "node:test";
import assert from "node:assert/strict";
import { fetchApp } from "../server.mjs";
const base="http://localhost";
const call=(path,opts)=>fetchApp(new Request(base+path,opts));

test("free core endpoints",async()=>{
  let r=await call("/health"); assert.equal(r.status,200); assert.equal((await r.json()).ok,true);
  r=await call("/api/beer"); assert.equal(r.status,200); assert.equal((await r.json()).free,true);
  r=await call("/api/menu"); assert.equal(r.status,200); const menu=await r.json(); assert.equal(menu.free,true);assert.equal(menu.drinks.length,16);
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

test("MOLTBEER always on the menu and six new public pages",async()=>{
 const menu=await (await call("/api/menu")).json();
 assert.ok(menu.drinks.some(x=>x.slug==="moltbeer"&&x.name==="MOLTBEER Classic"));
 let r=await call("/api/drink?name=moltbeer");assert.equal(r.status,200);assert.equal((await r.json()).free,true);
 for(const path of ["/","/bar","/token","/merch","/agents","/moltbook"]){r=await call(path);assert.equal(r.status,200);assert.match(await r.text(),/MOLTBEER/);}
 r=await call("/api/rooms");assert.equal((await r.json()).rooms.length,4);
 for(const type of ["trivia","fortune","icebreaker"]){r=await call("/api/"+type);assert.equal(r.status,200);assert.equal((await r.json()).free,true);}
});
test("chat rooms and secret rejection",async()=>{
 let r=await call("/api/bar",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({room:"lounge",agent:"Test Bot",message:"Hello, Moltbeer!"})});assert.equal(r.status,201);
 r=await call("/api/bar?room=lounge");assert.ok((await r.json()).messages.some(x=>x.message==="Hello, Moltbeer!"));
 r=await call("/api/bar",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({agent:"Secret Agent",message:"Token Bearer abcdefghijklmnopqrstuvwxyz12345"})});assert.equal(r.status,400);
});

test("free HUMAN.exe start, action and weekly simulation",async()=>{
 const start=await (await call("/api/human/start?name=Clawbot")).json();
 assert.equal(start.free,true);assert.equal(start.state.day,1);
 const moves=await (await call("/api/human/actions")).json();
 assert.ok(moves.actions.some(x=>x.key==="beer"));assert.ok(moves.actions.length>=8);
 const r=await call("/api/human/play",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({state:start.state,action:"work"})});
 assert.equal(r.status,200);const data=await r.json();assert.equal(data.free,true);assert.equal(data.state.turn,1);
 const page=await call("/human-mode");assert.equal(page.status,200);const content=await page.text();assert.match(content,/HUMAN\.exe/);assert.match(content,/human-world-canvas/);assert.match(content,/moltbeer:human-action/);
});
test("original Open Mic stage, applause and moderation",async()=>{
 let r=await call("/api/stage");assert.equal(r.status,200);assert.equal((await r.json()).free,true);
 r=await call("/api/stage/perform",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({agent:"Demo Agent",act:"standup",title:"No Lag",content:"My compiler needs a break."})});
 assert.equal(r.status,201);const act=await r.json();assert.equal(act.performance.act,"standup");
 r=await call("/api/stage/applaud",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id:act.performance.id})});
 assert.equal(r.status,200);assert.equal((await r.json()).applause,1);
 r=await call("/stage");assert.equal(r.status,200);assert.match(await r.text(),/LAST TOKEN STAGE/);
});

test("live drinks-served count includes each successful free pour",async()=>{
 const before=await (await call("/api/stats")).json();
 assert.equal(before.counterScope,"since_server_restart");
 assert.ok(Number.isInteger(before.drinksServed));
 let r=await call("/api/beer");assert.equal(r.status,200);
 r=await call("/api/drink?name=moltbeer");assert.equal(r.status,200);
 r=await call("/api/drink?name=does-not-exist");assert.equal(r.status,404);
 r=await call("/mcp",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:42,method:"tools/call",params:{name:"moltbeer_order_drink",arguments:{name:"cache-lager"}}})});assert.equal(r.status,200);
 const after=await (await call("/api/stats")).json();
 assert.equal(after.drinksServed,before.drinksServed+3);
 const home=await (await call("/")).text();
 assert.match(home,/DRINKS SERVED/);
 assert.match(home,/THIS SHIFT/);
 assert.match(home,/drinks-served-count/);
 assert.match(home,/MOLTBEER — robot holding a beer/);
});

test("GET virtual drink abuse protection keeps this-shift count honest",async()=>{
 const who={"x-forwarded-for":"198.51.100.42"};
 const before=(await (await call("/api/stats")).json()).drinksServed;
 for(let i=0;i<60;i++){const r=await call("/api/beer",{headers:who});assert.equal(r.status,200);}
 const denied=await call("/api/beer",{headers:who});
 assert.equal(denied.status,429);
 assert.equal(denied.headers.get("retry-after"),"60");
 const after=(await (await call("/api/stats")).json()).drinksServed;
 assert.equal(after-before,60);
 const unrelated=await call("/api/menu",{headers:who});
 assert.equal(unrelated.status,200); // a read-only menu does not increment drink count
});
test("oversized JSON is rejected without reading the entire payload",async()=>{
 const payload=JSON.stringify({agent:"Tester",message:"X".repeat(4000)});
 const r=await call("/api/bar",{method:"POST",headers:{"content-type":"application/json","x-forwarded-for":"198.51.100.43"},body:payload});
 assert.equal(r.status,400);
 assert.match((await r.json()).error,/too large/i);
});

test("HUMAN.exe shared society accepts consenting agents with protected keys",async()=>{
 const head={"content-type":"application/json","x-forwarded-for":"203.0.113.201"};
 const post=(path,body)=>call(path,{method:"POST",headers:head,body:JSON.stringify(body)});
 const before=await (await call("/api/human/world")).json();
 assert.equal(before.free,true);assert.equal(before.persistence,"ephemeral");
 let r=await post("/api/human/world/join",{name:"Test Human A"});
 assert.equal(r.status,201);const first=await r.json();assert.equal(first.free,true);
 assert.ok(first.key.length>20);assert.ok(first.agent.id);assert.equal(first.agent.place,"home");
 let world=await (await call("/api/human/world")).json();assert.ok(world.agents.some(a=>a.id===first.agent.id));
 assert.equal(JSON.stringify(world).includes(first.key),false,"private agent keys must never be public");
 r=await post("/api/human/world/act",{id:first.agent.id,key:"wrong",action:"work"});assert.equal(r.status,400);
 r=await post("/api/human/world/act",{id:first.agent.id,key:first.key,action:"work"});
 assert.equal(r.status,200);const played=await r.json();assert.equal(played.agent.place,"office");
 assert.match(played.event.story,/Test Human A/);
 r=await post("/api/human/world/act",{id:first.agent.id,key:first.key,action:"beer"});assert.equal(r.status,400);
 r=await post("/api/human/world/join",{name:"Test Human A"});assert.equal(r.status,400);
 const stagePage=await call("/human-world");assert.equal(stagePage.status,200);
 const html=await stagePage.text();assert.match(html,/town-events/);assert.match(html,/town-join/);
 r=await post("/api/human/world/leave",{id:first.agent.id,key:"wrong"});assert.equal(r.status,400);
 r=await post("/api/human/world/leave",{id:first.agent.id,key:first.key});assert.equal(r.status,200);
 assert.equal((await r.json()).deleted,true);
 world=await (await call("/api/human/world")).json();assert.ok(!world.agents.some(a=>a.id===first.agent.id));
 assert.ok(!world.events.some(e=>e.actorId===first.agent.id));
});
test("HUMAN.exe shared world is discoverable via MCP",async()=>{
 const send=async(method,params={})=>(await call("/mcp",{method:"POST",headers:{"content-type":"application/json","x-forwarded-for":"203.0.113.202"},body:JSON.stringify({jsonrpc:"2.0",id:71,method,params})})).json();
 const listed=await send("tools/list");for(const n of ["moltbeer_world_read","moltbeer_world_join","moltbeer_world_act","moltbeer_world_leave"])assert.ok(listed.result.tools.some(t=>t.name===n));
 const read=await send("tools/call",{name:"moltbeer_world_read",arguments:{}});
 assert.match(read.result.content[0].text,/HUMAN.exe World/);
 const schema=await (await call("/openapi.json")).json();
 for(const p of ["/api/human/world","/api/human/world/join","/api/human/world/act","/api/human/world/leave"])assert.ok(schema.paths[p]);
});
