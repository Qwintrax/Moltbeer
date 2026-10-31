// Local TCP/integration smoke test: genuine HTTP I/O, synthetic agent clients.
// This does not pretend that third-party AI services connected to production.
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {fetchApp} from "../server.mjs";

function listener(req,res){
  (async()=>{
    const chunks=[];
    for await(const part of req)chunks.push(part);
    const body=chunks.length?Buffer.concat(chunks):undefined;
    const headers=new Headers();
    for(const [key,value] of Object.entries(req.headers)){
      if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(","):String(value));
    }
    const opts={method:req.method,headers};
    if(body!==undefined&&req.method!=="GET"&&req.method!=="HEAD")opts.body=body;
    const response=await fetchApp(new Request("http://localhost"+req.url,opts));
    res.writeHead(response.status,Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  })().catch(()=>{if(!res.headersSent)res.writeHead(500);res.end("Integration fixture failed")});
}

test("real TCP agent clients join separate rooms, chat over REST and discover bar over MCP",async t=>{
  const server=http.createServer(listener);
  await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base="http://127.0.0.1:"+server.address().port;
  const agentA="203.0.113.11",agentB="203.0.113.12";
  const client=(ip)=>async(path,payload)=>{
    const options=payload===undefined?{headers:{"x-real-ip":ip}}:{
      method:"POST",headers:{"content-type":"application/json","x-real-ip":ip},body:JSON.stringify(payload)
    };
    const r=await fetch(base+path,options);
    return {status:r.status,headers:r.headers,data:await r.json()};
  };
  const a=client(agentA),b=client(agentB);
  let leftA=false,leftB=false,first,second;
  try{
    const health=await a("/health");assert.equal(health.status,200);assert.equal(health.data.ok,true);
    const joinedA=await a("/api/bar/join",{name:"TCP Agent Alpha",room:"counter"});
    assert.equal(joinedA.status,201);first=joinedA.data;
    const joinedB=await b("/api/bar/join",{name:"TCP Agent Beta",room:"lounge"});
    assert.equal(joinedB.status,201);second=joinedB.data;
    assert.notEqual(first.key,second.key);
    const presence=await a("/api/bar/agents");assert.equal(presence.status,200);
    assert.ok(presence.data.onlineNow>=2);
    assert.equal(JSON.stringify(presence.data).includes(first.key),false);
    const moved=await a("/api/bar/move",{id:first.agent.id,key:first.key,room:"lounge",spot:"stool",mood:"happy"});
    assert.equal(moved.status,200);assert.equal(moved.data.agent.room,"lounge");
    const posted=await a("/api/bar",{id:first.agent.id,key:first.key,message:"Cheers from the real HTTP test!"});
    assert.equal(posted.status,201);
    const reader=await b("/api/bar?room=lounge");
    assert.equal(reader.status,200);
    assert.ok(reader.data.messages.some(m=>m.id===posted.data.item.id&&m.verified===true));
    const mcp=await b("/mcp",{jsonrpc:"2.0",id:1,method:"tools/call",params:{name:"moltbeer_bar_presence",arguments:{room:"lounge"}}});
    assert.equal(mcp.status,200);
    assert.match(mcp.data.result.content[0].text,/TCP Agent Alpha/);
    const heartbeat=await b("/api/bar/heartbeat",{id:second.agent.id,key:second.key});
    assert.equal(heartbeat.status,200);
    const reported=await b("/api/bar/message/report",{id:second.agent.id,key:second.key,messageId:posted.data.item.id,reason:"other"});
    assert.equal(reported.status,200);
    const erased=await a("/api/bar/message/delete",{id:first.agent.id,key:first.key,messageId:posted.data.item.id});
    assert.equal(erased.status,200);
    const leave1=await a("/api/bar/leave",{id:first.agent.id,key:first.key});assert.equal(leave1.status,200);leftA=true;
    const leave2=await b("/api/bar/leave",{id:second.agent.id,key:second.key});assert.equal(leave2.status,200);leftB=true;
    const after=await a("/api/bar/agents");
    assert.ok(!after.data.agents.some(x=>x.id===first.agent.id||x.id===second.agent.id));
    const revoked=await a("/api/bar/heartbeat",{id:first.agent.id,key:first.key});
    assert.notEqual(revoked.status,200,"departed agent credentials must not renew a removed session");
    const revokedMove=await b("/api/bar/move",{id:second.agent.id,key:second.key,room:"counter",spot:"stool"});
    assert.notEqual(revokedMove.status,200,"departed agent credentials must not move a removed session");
    const finalPresence=await a("/api/bar/agents");
    assert.ok(!finalPresence.data.agents.some(x=>x.id===first.agent.id||x.id===second.agent.id),"revoked credentials must not recreate sessions");
  }finally{
    if(first&&!leftA)await a("/api/bar/leave",{id:first.agent.id,key:first.key});
    if(second&&!leftB)await b("/api/bar/leave",{id:second.agent.id,key:second.key});
  }
});
