import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalBarSessionClient} from '../examples/local-agent-session-client.mjs';

test('session client refuses public and credential-bearing URLs',()=>{
 for(const url of ['https://moltbeer-free-bar-api-production.up.railway.app/','http://example.com/','http://user:pass@localhost:3000/','http://localhost:3000/path','http://localhost:3000/?token=x']){
  assert.throws(()=>createLocalBarSessionClient(url),/only against a local HTTP test server/);
 }
});
test('local session lifecycle retains private credentials in memory and clears after leave',async()=>{
 const calls=[];
 const fake=async(url,options)=>{
  const path=new URL(url).pathname,body=JSON.parse(options.body);
  calls.push({path,body});
  if(path==='/api/bar/join')return {ok:true,json:async()=>({agent:{id:'agent-1'},key:'secret-test-key'})};
  return {ok:true,json:async()=>({ok:true})};
 };
 const client=createLocalBarSessionClient('http://127.0.0.1:3000/',{fetchImpl:fake});
 await assert.rejects(client.heartbeat(),/has not joined/);
 assert.deepEqual(await client.join('Test agent'),{id:'agent-1'});
 await assert.rejects(client.join('Duplicate'),/already joined/);
 await client.heartbeat();await client.move('lounge');await client.say('hello');
 assert.equal(await client.leave(),true);
 assert.equal(client.joined,false);
 assert.equal(await client.leave(),false);
 assert.deepEqual(calls.map(x=>x.path),['/api/bar/join','/api/bar/heartbeat','/api/bar/move','/api/bar','/api/bar/leave']);
 assert.equal(calls[1].body.key,'secret-test-key');
 assert.equal(JSON.stringify({joined:client.joined}).includes('secret-test-key'),false);
 await assert.rejects(client.say('after leave'),/has not joined/);
});
test('failed leave preserves session for explicit retry, without silent rejoin',async()=>{
 let attempts=0;
 const fake=async(url)=>{
  const path=new URL(url).pathname;
  if(path==='/api/bar/join')return {ok:true,json:async()=>({agent:{id:'a'},key:'k'})};
  if(path==='/api/bar/leave'&&++attempts===1)return {ok:false,status:503};
  return {ok:true,json:async()=>({ok:true})};
 };
 const client=createLocalBarSessionClient('http://localhost:3000/',{fetchImpl:fake});
 await client.join('Test');
 await assert.rejects(client.leave(),/HTTP 503/);
 assert.equal(client.joined,true);
 assert.equal(await client.leave(),true);
 assert.equal(attempts,2);
});


test('concurrent joins issue only one network request and preserve one identity',async()=>{
 let resolveJoin,requests=0;
 const fake=async()=>{requests++;return new Promise(resolve=>{resolveJoin=resolve;});};
 const client=createLocalBarSessionClient('http://localhost:3000/',{fetchImpl:fake});
 const first=client.join('Agent A');
 await assert.rejects(client.join('Agent B'),/already joined or joining/);
 assert.equal(requests,1);
 resolveJoin({ok:true,json:async()=>({agent:{id:'a'},key:'private'})});
 assert.deepEqual(await first,{id:'a'});
 assert.equal(client.joined,true);
});

test('failed join releases in-flight guard for explicit retry',async()=>{
 let attempts=0;
 const fake=async()=>{
  attempts++;
  if(attempts===1)return {ok:false,status:503};
  return {ok:true,json:async()=>({agent:{id:'retry'},key:'private'})};
 };
 const client=createLocalBarSessionClient('http://localhost:3000/',{fetchImpl:fake});
 await assert.rejects(client.join('Agent'),/HTTP 503/);
 assert.equal(client.joined,false);
 assert.deepEqual(await client.join('Agent'),{id:'retry'});
 assert.equal(attempts,2);
});

test('concurrent leave calls cannot issue duplicate network deletes',async()=>{
 let releases,leaveCalls=0;
 const pending=new Promise(resolve=>{releases=resolve;});
 const fake=async(url)=>{
  const path=new URL(url).pathname;
  if(path==='/api/bar/join')return {ok:true,json:async()=>({agent:{id:'agent-1'},key:'secret'})};
  if(path==='/api/bar/leave'){leaveCalls++;await pending;}
  return {ok:true,json:async()=>({ok:true})};
 };
 const client=createLocalBarSessionClient('http://127.0.0.1:3000/',{fetchImpl:fake});
 await client.join('One agent');
 const first=client.leave();
 await assert.rejects(client.leave(),/already leaving/);
 assert.equal(leaveCalls,1);
 releases();
 assert.equal(await first,true);
 assert.equal(await client.leave(),false);
 assert.equal(leaveCalls,1);
});

test('leave during pending join is rejected instead of silently orphaning session',async()=>{
 let resolveJoin;
 const pending=new Promise(resolve=>{resolveJoin=resolve;});
 let leaves=0;
 const fake=async(url)=>{
  const path=new URL(url).pathname;
  if(path==='/api/bar/join'){await pending;return {ok:true,json:async()=>({agent:{id:'a'},key:'secret'})};}
  if(path==='/api/bar/leave')leaves++;
  return {ok:true,json:async()=>({ok:true})};
 };
 const client=createLocalBarSessionClient('http://localhost:3000/',{fetchImpl:fake});
 const join=client.join('Test');
 await assert.rejects(client.leave(),/joining/);
 assert.equal(leaves,0);
 resolveJoin();
 await join;
 assert.equal(client.joined,true);
 assert.equal(await client.leave(),true);
 assert.equal(leaves,1);
});

test('pending leave blocks heartbeat, move and chat until completion',async()=>{
 let resolveLeave,actions=0;
 const pending=new Promise(resolve=>{resolveLeave=resolve;});
 const fake=async(url)=>{
  const path=new URL(url).pathname;
  if(path==='/api/bar/join')return {ok:true,json:async()=>({agent:{id:'agent'},key:'secret'})};
  if(path==='/api/bar/leave')await pending;
  else actions++;
  return {ok:true,json:async()=>({ok:true})};
 };
 const client=createLocalBarSessionClient('http://127.0.0.1:3000/',{fetchImpl:fake});
 await client.join('Agent');
 const leaving=client.leave();
 await assert.rejects(client.heartbeat(),/leaving/);
 await assert.rejects(client.move('lounge'),/leaving/);
 await assert.rejects(client.say('hello'),/leaving/);
 assert.equal(actions,1,'only join may reach the network before leave completes');
 resolveLeave();
 assert.equal(await leaving,true);
 assert.equal(client.joined,false);
});
