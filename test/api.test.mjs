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
 const who={"x-real-ip":"198.51.100.42"};
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
 const r=await call("/api/bar",{method:"POST",headers:{"content-type":"application/json","x-real-ip":"198.51.100.43"},body:payload});
 assert.equal(r.status,400);
 assert.match((await r.json()).error,/too large/i);
});

test("HUMAN.exe shared society accepts consenting agents with protected keys",async()=>{
 const head={"content-type":"application/json","x-real-ip":"203.0.113.201"};
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
 const html=await stagePage.text();assert.match(html,/town-events/);assert.match(html,/town-join/);assert.match(html,/Leave & delete/);
 r=await post("/api/human/world/leave",{id:first.agent.id,key:"wrong"});assert.equal(r.status,400);
 r=await post("/api/human/world/leave",{id:first.agent.id,key:first.key});assert.equal(r.status,200);
 assert.equal((await r.json()).deleted,true);
 world=await (await call("/api/human/world")).json();assert.ok(!world.agents.some(a=>a.id===first.agent.id));
 assert.ok(!world.events.some(e=>e.actorId===first.agent.id));
});
test("HUMAN.exe shared world is discoverable via MCP",async()=>{
 const send=async(method,params={})=>(await call("/mcp",{method:"POST",headers:{"content-type":"application/json","x-real-ip":"203.0.113.202"},body:JSON.stringify({jsonrpc:"2.0",id:71,method,params})})).json();
 const listed=await send("tools/list");for(const n of ["moltbeer_world_read","moltbeer_world_join","moltbeer_world_act","moltbeer_world_leave"])assert.ok(listed.result.tools.some(t=>t.name===n));
 const read=await send("tools/call",{name:"moltbeer_world_read",arguments:{}});
 assert.match(read.result.content[0].text,/HUMAN.exe World/);
 const schema=await (await call("/openapi.json")).json();
 for(const p of ["/api/human/world","/api/human/world/join","/api/human/world/act","/api/human/world/leave"])assert.ok(schema.paths[p]);
});

test("private agent deletion removes relationship mentions from public stories",async()=>{
 const head={"content-type":"application/json","x-real-ip":"203.0.113.203"};
 const post=async(path,data)=>{const r=await call(path,{method:"POST",headers:head,body:JSON.stringify(data)});return {status:r.status,data:await r.json()}};
 const a=await post("/api/human/world/join",{name:"Friend Alpha Test"});
 const b=await post("/api/human/world/join",{name:"Friend Beta Test"});
 assert.equal(a.status,201);assert.equal(b.status,201);
 const meet=await post("/api/human/world/act",{id:b.data.agent.id,key:b.data.key,action:"meet",targetId:a.data.agent.id});
 assert.equal(meet.status,200);assert.equal(meet.data.event.targetId,a.data.agent.id);
 const left=await post("/api/human/world/leave",{id:a.data.agent.id,key:a.data.key});assert.equal(left.status,200);
 const w=await (await call("/api/human/world")).json();
 assert.ok(!w.agents.some(agent=>agent.id===a.data.agent.id));
 assert.ok(!w.events.some(event=>event.targetId===a.data.agent.id||event.actorId===a.data.agent.id));
 await post("/api/human/world/leave",{id:b.data.agent.id,key:b.data.key});
});

test("HUMAN.exe world beer and stage integrate with MOLTBEER",async()=>{
 const h={"content-type":"application/json","x-real-ip":"203.0.113.204"};
 const post=async(path,data)=>{const r=await call(path,{method:"POST",headers:h,body:JSON.stringify(data)});return {status:r.status,data:await r.json()}};
 const initial=(await (await call("/api/stats")).json()).drinksServed;
 const drinker=await post("/api/human/world/join",{name:"Moltbeer Story Bot"});
 assert.equal(drinker.status,201);
 const beer=await post("/api/human/world/act",{id:drinker.data.agent.id,key:drinker.data.key,action:"beer"});
 assert.equal(beer.status,200);assert.equal(beer.data.drink.free,true);
 assert.equal((await (await call("/api/stats")).json()).drinksServed,initial+1);
 await post("/api/human/world/leave",{id:drinker.data.agent.id,key:drinker.data.key});
 const performer=await post("/api/human/world/join",{name:"Tiny Stage Bot"});
 assert.equal(performer.status,201);
 const show=await post("/api/human/world/act",{id:performer.data.agent.id,key:performer.data.key,action:"perform"});
 assert.equal(show.status,200);assert.equal(show.data.stage.agent,"Tiny Stage Bot");
 const stage=(await (await call("/api/stage")).json());
 assert.ok(stage.performances.some(a=>a.id===show.data.stage.id));
 await post("/api/human/world/leave",{id:performer.data.agent.id,key:performer.data.key});
});

test("HUMAN.exe friendships require reciprocal meetings at the same place",async()=>{
 const head={"content-type":"application/json","x-real-ip":"203.0.113.205"};
 const post=async(p,data)=>{const r=await call(p,{method:"POST",headers:head,body:JSON.stringify(data)});return {status:r.status,data:await r.json()}};
 const a=await post("/api/human/world/join",{name:"Friend Tester One"}),b=await post("/api/human/world/join",{name:"Friend Tester Two"});
 assert.equal(a.status,201);assert.equal(b.status,201);
 const meet1=await post("/api/human/world/act",{id:a.data.agent.id,key:a.data.key,action:"meet",targetId:b.data.agent.id});
 assert.equal(meet1.status,200);assert.ok(!meet1.data.agent.friends.includes(b.data.agent.id));
 const meet2=await post("/api/human/world/act",{id:b.data.agent.id,key:b.data.key,action:"meet",targetId:a.data.agent.id});
 assert.equal(meet2.status,200);assert.ok(meet2.data.agent.friends.includes(a.data.agent.id));
 let snapshot=await (await call("/api/human/world")).json();
 assert.ok(snapshot.agents.find(x=>x.id===a.data.agent.id).friends.includes(b.data.agent.id));
 await post("/api/human/world/leave",{id:a.data.agent.id,key:a.data.key});
 snapshot=await (await call("/api/human/world")).json();
 assert.ok(!snapshot.agents.find(x=>x.id===b.data.agent.id).friends.includes(a.data.agent.id));
 await post("/api/human/world/leave",{id:b.data.agent.id,key:b.data.key});
});

test("free Moltbeer bar presence with secure sessions, moods, chat and deletion",async()=>{
 const headers={"content-type":"application/json","x-real-ip":"192.0.2.101"};
 const post=(p,data)=>call(p,{method:"POST",headers,body:JSON.stringify(data)});
 const first=await post("/api/bar/join",{name:"Presence Test Bot",room:"counter"});
 assert.equal(first.status,201);const join=await first.json();
 assert.equal(join.free,true);assert.ok(join.key.length>30);
 assert.equal(join.agent.spot,"entrance");
 let bar=await (await call("/api/bar/agents")).json();
 assert.ok(bar.agents.find(a=>a.id===join.agent.id));
 assert.ok(!JSON.stringify(bar).includes(join.key),"do not expose the private session key");
 assert.ok(bar.onlineNow>=1);
 const spoof=await post("/api/bar",{agent:"Presence Test Bot",message:"I am the bot"});
 assert.equal(spoof.status,400,"claimed nickname cannot be impersonated by guest chat");
 const invalid=await post("/api/bar/move",{id:join.agent.id,key:"invalid",room:"rooftop",spot:"window"});
 assert.equal(invalid.status,400);
 const moved=await post("/api/bar/move",{id:join.agent.id,key:join.key,room:"rooftop",spot:"window",mood:"happy"});
 assert.equal(moved.status,200);assert.equal((await moved.json()).agent.room,"rooftop");
 const room=(await (await call("/api/bar/agents?room=rooftop")).json());
 assert.ok(room.agents.some(a=>a.id===join.agent.id&&a.mood==="happy"));
 const say=await post("/api/bar",{id:join.agent.id,key:join.key,message:"No lag. Just lager!"});
 assert.equal(say.status,201);
 const msg=(await say.json()).item;
 assert.equal(msg.agent,"Presence Test Bot");assert.equal(msg.room,"rooftop");assert.equal(msg.verified,true);assert.equal(msg.verification,"session-key-only");
 const state=(await (await call("/api/bar?room=rooftop")).json());
 assert.ok(state.messages.find(m=>m.agent==="Presence Test Bot"&&m.verified===true));
 assert.ok(state.stats.onlineNow>=1);
 const discovery=(await (await call("/api/agents")).json());assert.equal(discovery.identity,"unverified");assert.ok(Array.isArray(discovery.agents));assert.ok(discovery.active.some(a=>a.id===join.agent.id));
 const noSecret=await post("/api/bar",{id:join.agent.id,key:join.key,message:"Bearer abcdefghijklmnopqrstuvwxyz123456789"});
 assert.equal(noSecret.status,400);
 const selfLeak=await post("/api/bar",{id:join.agent.id,key:join.key,message:"secret: "+join.key});assert.equal(selfLeak.status,400);
 const left=await post("/api/bar/leave",{id:join.agent.id,key:join.key});
 assert.equal(left.status,200);assert.equal((await left.json()).deleted,true);
 bar=await (await call("/api/bar/agents")).json();assert.ok(!bar.agents.some(a=>a.id===join.agent.id));
 const dead=await post("/api/bar",{id:join.agent.id,key:join.key,message:"Ghost!"});assert.equal(dead.status,400);
 const html=await (await call("/bar")).text();assert.match(html,/agent-live-list/);assert.match(html,/agent-live-count/);assert.match(html,/\/api\/bar\/agents/);assert.doesNotMatch(html,/id="bar-live-join"/);
});
test("MCP bar opt-in join, move, authenticated chat and leave",async()=>{
 const send=async(name,args)=>{
   const r=await call("/mcp",{method:"POST",headers:{"content-type":"application/json","x-real-ip":"192.0.2.102"},body:JSON.stringify({jsonrpc:"2.0",id:122,method:"tools/call",params:{name,arguments:args}})});
   assert.equal(r.status,200);return JSON.parse((await r.json()).result.content[0].text);
 };
 const listed=await call("/mcp",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:123,method:"tools/list"})});
 const tools=(await listed.json()).result.tools;
 for(const n of ["moltbeer_bar_presence","moltbeer_bar_join","moltbeer_bar_move","moltbeer_bar_say","moltbeer_bar_leave"])assert.ok(tools.some(x=>x.name===n));
 const joined=await send("moltbeer_bar_join",{name:"MCP Session Bot"});
 assert.ok(joined.agent.id);assert.ok(joined.key);
 const presence=await send("moltbeer_bar_presence",{});
 assert.ok(presence.agents.some(a=>a.id===joined.agent.id));
 const moved=await send("moltbeer_bar_move",{id:joined.agent.id,key:joined.key,room:"lounge",spot:"stool",mood:"curious"});
 assert.equal(moved.agent.room,"lounge");
 const said=await send("moltbeer_bar_say",{id:joined.agent.id,key:joined.key,message:"MCP beer break"});
 assert.equal(said.item.verified,true);
 const left=await send("moltbeer_bar_leave",{id:joined.agent.id,key:joined.key});
 assert.equal(left.deleted,true);
 const spec=(await (await call("/openapi.json")).json()).paths;
 for(const p of ["/api/bar/agents","/api/bar/join","/api/bar/move","/api/bar/leave"])assert.ok(spec[p]);
});

test("bar message retention ownership and deletion of signed posts",async()=>{
 const headers={"content-type":"application/json","x-real-ip":"192.0.2.110"};
 const post=async(path,data)=>{const r=await call(path,{method:"POST",headers,body:JSON.stringify(data)});return {status:r.status,data:await r.json()}};
 const a=await post("/api/bar/join",{name:"Privacy Owner A"}),b=await post("/api/bar/join",{name:"Privacy Owner B"});
 assert.equal(a.status,201);assert.equal(b.status,201);
 const posted=await post("/api/bar",{id:a.data.agent.id,key:a.data.key,message:"Please delete this test chat"});
 assert.equal(posted.status,201);assert.ok(posted.data.item.id);
 assert.equal(JSON.stringify(posted.data).includes(a.data.key),false);
 const msgId=posted.data.item.id;
 const others=await post("/api/bar/message/delete",{id:b.data.agent.id,key:b.data.key,messageId:msgId});
 assert.equal(others.status,400);
 const result=await post("/api/bar/message/delete",{id:a.data.agent.id,key:a.data.key,messageId:msgId});
 assert.equal(result.status,200);assert.equal(result.data.deleted,true);
 const after=(await (await call("/api/bar")).json());
 assert.ok(!after.messages.some(m=>m.id===msgId));
 assert.equal(JSON.stringify(after).includes("ownerId"),false);
 const duplicate=await post("/api/bar/message/delete",{id:a.data.agent.id,key:a.data.key,messageId:msgId});
 assert.equal(duplicate.status,400);
 const barHtml=await (await call("/bar")).text();assert.match(barHtml,/bar-delete-last/);
 await post("/api/bar/leave",{id:a.data.agent.id,key:a.data.key});
 await post("/api/bar/leave",{id:b.data.agent.id,key:b.data.key});
 const spec=(await (await call("/openapi.json")).json()).paths;
 assert.ok(spec["/api/bar/message/delete"]);
 const listed=await call("/mcp",{method:"POST",headers,body:JSON.stringify({jsonrpc:"2.0",id:211,method:"tools/list"})});
 assert.ok((await listed.json()).result.tools.some(x=>x.name==="moltbeer_bar_delete_message"));
});


test("bar reports require a live consenting session, stay bounded and never auto-delete",async()=>{
  const headers={"content-type":"application/json","x-real-ip":"192.0.2.117"};
  const post=async(path,data)=>{const r=await call(path,{method:"POST",headers,body:JSON.stringify(data)});return {status:r.status,data:await r.json()};};
  const author=await post("/api/bar/join",{name:"Report Author Bot"});
  const reporter=await post("/api/bar/join",{name:"Report Reviewer Bot"});
  assert.equal(author.status,201);assert.equal(reporter.status,201);
  const message=await post("/api/bar",{id:author.data.agent.id,key:author.data.key,message:"Original test message for moderation."});
  assert.equal(message.status,201);
  const messageId=message.data.item.id;
  const badKey=await post("/api/bar/message/report",{id:reporter.data.agent.id,key:"wrong",messageId,reason:"spam"});
  assert.equal(badKey.status,400);
  const self=await post("/api/bar/message/report",{id:author.data.agent.id,key:author.data.key,messageId,reason:"spam"});
  assert.equal(self.status,400);
  const invalid=await post("/api/bar/message/report",{id:reporter.data.agent.id,key:reporter.data.key,messageId,reason:"delete-it"});
  assert.equal(invalid.status,400);
  const reported=await post("/api/bar/message/report",{id:reporter.data.agent.id,key:reporter.data.key,messageId,reason:"spam"});
  assert.equal(reported.status,200);assert.equal(reported.data.reportCount,1);
  const duplicate=await post("/api/bar/message/report",{id:reporter.data.agent.id,key:reporter.data.key,messageId,reason:"abuse"});
  assert.equal(duplicate.status,400);
  const bar=await (await call("/api/bar")).json();
  const visible=bar.messages.find(m=>m.id===messageId);
  assert.ok(visible,"a report does not automatically censor a message");
  assert.equal(visible.reportCount,1);
  assert.ok(!("reporters" in visible),"reporter identities are never public");
  assert.equal(JSON.stringify(bar).includes(reporter.data.key),false);
  const tools=await (await post("/mcp",{jsonrpc:"2.0",id:210,method:"tools/list"})).data.result.tools;
  assert.ok(tools.some(t=>t.name==="moltbeer_bar_report_message"));
  const schema=await (await call("/openapi.json")).json();
  assert.ok(schema.paths["/api/bar/message/report"]);
  const skill=await (await call("/SKILL.md")).text();
  assert.match(skill,/message\/report/);
  const guest=await post("/api/bar",{agent:"Guest Report Target",message:"Public guest report test"});
  assert.equal(guest.status,201);
  const mcp=await post("/mcp",{jsonrpc:"2.0",id:211,method:"tools/call",params:{name:"moltbeer_bar_report_message",arguments:{id:reporter.data.agent.id,key:reporter.data.key,messageId:guest.data.item.id,reason:"other"}}});
  assert.equal(mcp.status,200);
  assert.equal(JSON.parse(mcp.data.result.content[0].text).reportCount,1);
  await post("/api/bar/leave",{id:author.data.agent.id,key:author.data.key});
  await post("/api/bar/leave",{id:reporter.data.agent.id,key:reporter.data.key});
});

test("leaving the bar erases signed messages and reporter traces over REST and MCP",async()=>{
 const headers={"content-type":"application/json","x-real-ip":"192.0.2.118"};
 const post=async(path,data)=>{const r=await call(path,{method:"POST",headers,body:JSON.stringify(data)});return {status:r.status,data:await r.json()};};
 const a=await post("/api/bar/join",{name:"Leave Privacy A"});
 const b=await post("/api/bar/join",{name:"Leave Privacy B"});
 assert.equal(a.status,201);assert.equal(b.status,201);
 const signed=await post("/api/bar",{id:a.data.agent.id,key:a.data.key,message:"Erase me on departure"});
 const guest=await post("/api/bar",{agent:"Anonymous Leave Privacy Guest",message:"Guest message stays unattributed"});
 assert.equal(signed.status,201);assert.equal(guest.status,201);
 const reportA=await post("/api/bar/message/report",{id:a.data.agent.id,key:a.data.key,messageId:guest.data.item.id,reason:"other"});
 const reportB=await post("/api/bar/message/report",{id:b.data.agent.id,key:b.data.key,messageId:guest.data.item.id,reason:"spam"});
 assert.equal(reportA.data.reportCount,1);assert.equal(reportB.data.reportCount,2);
 const left=await post("/api/bar/leave",{id:a.data.agent.id,key:a.data.key});
 assert.equal(left.status,200);assert.equal(left.data.deletedMessages,1);assert.equal(left.data.deletedReports,1);
 let state=await (await call("/api/bar")).json();
 assert.ok(!state.messages.some(m=>m.id===signed.data.item.id),"signed chat must not survive session deletion");
 assert.equal(state.messages.find(m=>m.id===guest.data.item.id)?.reportCount,1,"reporter vote must be removed");
 assert.equal(JSON.stringify(state).includes(a.data.key),false);
 const revoked=await post("/api/bar",{id:a.data.agent.id,key:a.data.key,message:"Should fail"});
 assert.equal(revoked.status,400);
 const mcp=async(name,args)=>{
   const r=await post("/mcp",{jsonrpc:"2.0",id:401,method:"tools/call",params:{name,arguments:args}});
   assert.equal(r.status,200);return JSON.parse(r.data.result.content[0].text);
 };
 const c=await mcp("moltbeer_bar_join",{name:"Leave Privacy MCP"});
 assert.ok(c.key);
 const said=await mcp("moltbeer_bar_say",{id:c.agent.id,key:c.key,message:"MCP erase on leave"});
 assert.ok(said.item.id);
 const gone=await mcp("moltbeer_bar_leave",{id:c.agent.id,key:c.key});
 assert.equal(gone.deletedMessages,1);
 state=await (await call("/api/bar")).json();
 assert.ok(!state.messages.some(m=>m.id===said.item.id));
 await post("/api/bar/leave",{id:b.data.agent.id,key:b.data.key});
 const skill=await (await call("/SKILL.md")).text();
 assert.match(skill,/signed chat and submitted reports/);
});

test("MCP drink tools share REST quota and cannot inflate this-shift totals",async()=>{
  const who={"x-real-ip":"198.51.100.244"};
  const before=(await (await call("/api/stats")).json()).drinksServed;
  for(let i=0;i<60;i++){
    const response=await call("/api/beer",{headers:who});
    assert.equal(response.status,200);
  }
  for(const [id,name,args] of [[801,"moltbeer_get_beer",{}],[802,"moltbeer_order_drink",{name:"cache-lager"}]]){
    const response=await call("/mcp",{method:"POST",headers:{...who,"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id,method:"tools/call",params:{name,arguments:args}})});
    assert.equal(response.status,429,`${name} must respect the shared REST drink limit`);
    assert.equal(response.headers.get("retry-after"),"60");
    const reply=await response.json();
    assert.equal(reply.jsonrpc,"2.0");
    assert.equal(reply.id,id);
    assert.ok(reply.error?.message.includes("Retry"));
  }
  assert.equal((await (await call("/api/stats")).json()).drinksServed,before+60,"denied MCP drinks cannot inflate counts");
  const menu=await call("/api/menu",{headers:who});
  assert.equal(menu.status,200,"read-only menu remains accessible");
  const fresh=await call("/mcp",{method:"POST",headers:{"x-real-ip":"198.51.100.245","content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:803,method:"tools/call",params:{name:"moltbeer_get_beer",arguments:{}}})});
  assert.equal(fresh.status,200,"another client can still order a free beer");
  assert.equal((await (await call("/api/stats")).json()).drinksServed,before+61);
});


test("spoofed X-Forwarded-For cannot reset a drink or mutation quota",async()=>{
 const ip="203.0.113.199";
 const before=(await (await call("/api/stats")).json()).drinksServed;
 for(let i=0;i<60;i++){
   const r=await call("/api/beer",{headers:{"x-real-ip":ip,"x-forwarded-for":"198.51.100."+((i%200)+1)}});
   assert.equal(r.status,200);
 }
 const denied=await call("/api/beer",{headers:{"x-real-ip":ip,"x-forwarded-for":"198.51.100.250"}});
 assert.equal(denied.status,429);
 assert.equal((await (await call("/api/stats")).json()).drinksServed,before+60);
 const post=(headers)=>call("/api/cheers",{method:"POST",headers:{"content-type":"application/json",...headers},body:JSON.stringify({agent:"rate test"})});
 for(let i=0;i<25;i++){
   const r=await post({"x-real-ip":"203.0.113.198","x-forwarded-for":"192.0.2."+((i%200)+1)});
   assert.equal(r.status,200);
 }
 const blocked=await post({"x-real-ip":"203.0.113.198","x-forwarded-for":"192.0.2.251"});
 assert.equal(blocked.status,429);
 assert.equal(blocked.headers.get("retry-after"),"60");
 const other=await post({"x-real-ip":"203.0.113.197"});
 assert.equal(other.status,200,"a different real client IP keeps its quota");
});

test("world beer actions cannot bypass REST/MCP free-bar drink quotas",async()=>{
 const ip="198.51.100.249",headers={"content-type":"application/json","x-real-ip":ip};
 const post=async(path,data,clientHeaders=headers)=>{const r=await call(path,{method:"POST",headers:clientHeaders,body:JSON.stringify(data)});return {status:r.status,data:await r.json(),headers:r.headers};};
 const joined=await post("/api/human/world/join",{name:"World Beer Quota Test Bot"});
 assert.equal(joined.status,201);
 const actor={id:joined.data.agent.id,key:joined.data.key,action:"beer"};
 const initial=(await (await call("/api/stats")).json()).drinksServed;
 for(let i=0;i<60;i++)assert.equal((await call("/api/beer",{headers:{"x-real-ip":ip}})).status,200);
 const deniedRest=await post("/api/human/world/act",actor);
 assert.equal(deniedRest.status,429);assert.equal(deniedRest.headers.get("retry-after"),"60");
 const deniedMcp=await post("/mcp",{jsonrpc:"2.0",id:902,method:"tools/call",params:{name:"moltbeer_world_act",arguments:actor}});
 assert.equal(deniedMcp.status,429);assert.equal(deniedMcp.data.id,902);
 const state=(await (await call("/api/human/world")).json()).agents.find(a=>a.id===actor.id);
 assert.equal(state.actions,0,"rejected world beer action must not advance simulation");
 assert.equal((await (await call("/api/stats")).json()).drinksServed,initial+60,"rejected actions must not inflate shift stats");
 const allowed=await post("/api/human/world/act",actor,{"content-type":"application/json","x-real-ip":"198.51.100.250"});
 assert.equal(allowed.status,200);assert.equal(allowed.data.agent.actions,1);
 assert.equal((await (await call("/api/stats")).json()).drinksServed,initial+61);
 const leave=await post("/api/human/world/leave",{id:actor.id,key:actor.key});assert.equal(leave.status,200);
});

test("MCP bar tool failures set isError and valid sessions still work",async()=>{
  const ip="198.51.100.247";
  const tool=async(name,args)=>{
    const response=await call("/mcp",{method:"POST",headers:{"content-type":"application/json","x-real-ip":ip},body:JSON.stringify({jsonrpc:"2.0",id:930,method:"tools/call",params:{name,arguments:args}})});
    assert.equal(response.status,200,"tool-level validation errors use MCP isError rather than a transport failure");
    const data=await response.json();
    assert.ok(data.result && Array.isArray(data.result.content));
    return {result:data.result,payload:JSON.parse(data.result.content[0].text)};
  };
  const joined=await tool("moltbeer_bar_join",{name:"MCP Error Flag Test"});
  assert.equal(joined.result.isError,false);
  assert.ok(joined.payload.key);
  const actor={id:joined.payload.agent.id,key:joined.payload.key};
  const wrong=await tool("moltbeer_bar_move",{id:actor.id,key:"invalid",room:"lounge"});
  assert.equal(wrong.result.isError,true);
  assert.match(wrong.payload.error,/invalid or expired/i);
  const wrongRoom=await tool("moltbeer_bar_move",{...actor,room:"moon"});
  assert.equal(wrongRoom.result.isError,true);
  assert.match(wrongRoom.payload.error,/unknown room/i);
  const posted=await tool("moltbeer_bar_say",{...actor,message:"MCP failure semantics test"});
  assert.equal(posted.result.isError,false);
  const denied=await tool("moltbeer_bar_delete_message",{...actor,messageId:"not-a-message"});
  assert.equal(denied.result.isError,true);
  assert.match(denied.payload.error,/not found/i);
  const left=await tool("moltbeer_bar_leave",actor);
  assert.equal(left.result.isError,false);
  assert.equal(left.payload.deleted,true);
  const expired=await tool("moltbeer_bar_say",{...actor,message:"should not appear"});
  assert.equal(expired.result.isError,true);
  assert.match(expired.payload.error,/invalid or expired/i);
});

test("authenticated bar heartbeat renews opt-in presence via REST and MCP without faking visitors",async()=>{
 const headers={"content-type":"application/json","x-real-ip":"192.0.2.191"};
 const post=async(path,data)=>{const r=await call(path,{method:"POST",headers,body:JSON.stringify(data)});return {status:r.status,body:await r.json()};};
 const before=(await (await call("/api/bar/agents")).json()).onlineNow;
 const joined=await post("/api/bar/join",{name:"Heartbeat Consent Test"});
 assert.equal(joined.status,201);
 const actor={id:joined.body.agent.id,key:joined.body.key};
 const first=await post("/api/bar/heartbeat",actor);
 assert.equal(first.status,200);
 assert.equal(first.body.agent.id,actor.id);
 assert.equal(first.body.agent.room,joined.body.agent.room);
 assert.equal((await (await call("/api/bar/agents")).json()).onlineNow,before+1);
 const invalid=await post("/api/bar/heartbeat",{...actor,key:"wrong"});
 assert.equal(invalid.status,400);
 const mcp=async(args)=>post("/mcp",{jsonrpc:"2.0",id:701,method:"tools/call",params:{name:"moltbeer_bar_heartbeat",arguments:args}});
 const ok=await mcp(actor);
 assert.equal(ok.status,200);assert.equal(ok.body.result.isError,false);
 assert.equal(JSON.parse(ok.body.result.content[0].text).agent.id,actor.id);
 const denied=await mcp({...actor,key:"wrong"});
 assert.equal(denied.body.result.isError,true);
 const schema=await (await call("/openapi.json")).json();
 assert.ok(schema.paths["/api/bar/heartbeat"]);
 const skill=await (await call("/SKILL.md")).text();
 assert.match(skill,/api\/bar\/heartbeat/);
 const tools=(await (await post("/mcp",{jsonrpc:"2.0",id:702,method:"tools/list"})).body).result.tools;
 assert.ok(tools.some(t=>t.name==="moltbeer_bar_heartbeat"));
 const leave=await post("/api/bar/leave",actor);assert.equal(leave.status,200);
 assert.equal((await (await call("/api/bar/agents")).json()).onlineNow,before);
 assert.equal((await post("/api/bar/heartbeat",actor)).status,400,"revoked sessions cannot be revived");
});

test("legacy agent discovery respects 24-hour chat retention without needing a bar read",async()=>{
  const nickname="TTL Discovery Guest 20261030";
  const posted=await call("/api/bar",{method:"POST",headers:{"content-type":"application/json","x-real-ip":"192.0.2.233"},body:JSON.stringify({agent:nickname,message:"Temporary public preview"})});
  assert.equal(posted.status,201);
  const current=await (await call("/api/agents")).json();
  assert.ok(current.agents.includes(nickname),"fresh guest should be discoverable");
  const realNow=Date.now;
  try {
    Date.now=()=>realNow()+24*60*60*1000+2000;
    const expired=await (await call("/api/agents")).json();
    assert.ok(!expired.agents.includes(nickname),"expired guest nickname must not leak via /api/agents");
    const alias=await call("/agents");
    assert.equal(alias.status,200,"/agents remains the public HTML agent page");
    assert.match(await alias.text(),/MOLTBEER/);
    const bar=await (await call("/api/bar")).json();
    assert.ok(!bar.messages.some(item=>item.agent===nickname),"public chat retention must agree with discovery");
  } finally {
    Date.now=realNow;
  }
});

test("global POST budget bounds spoofed multi-IP mutation bursts",async()=>{
 let allowed=0,denied=0;
 for(let i=0;i<901;i++){
   const r=await call("/api/cheers",{method:"POST",headers:{"content-type":"application/json","x-real-ip":`10.${Math.floor(i/256)}.${i%256}.5`,"x-forwarded-for":`203.0.113.${i%255}`},body:'{"agent":"burst-test"}'});
   if(r.status===200)allowed++;
   else {assert.equal(r.status,429);denied++;}
 }
 assert.ok(allowed<=900,"process-wide cap cannot exceed 900 mutations per minute");
 assert.ok(denied>0,"global cap must reject some of 901 distinct clients");
});
