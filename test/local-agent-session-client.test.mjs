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
