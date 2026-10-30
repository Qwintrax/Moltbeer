import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyPrivateStorageOnce} from '../storage-readiness.mjs';

test('private storage verification never switches bar to durable mode or exposes secrets',async()=>{
 let constructed=0,ended=0;
 class Pool {constructor(){constructed++}async end(){ended++}}
 const no=await verifyPrivateStorageOnce({});
 assert.deepEqual(no,{configured:false,connected:false,mode:'ephemeral',reason:'missing_config'});
 const secret='postgresql://postgres.example:secret@example.invalid:5432/postgres';
 const valid=await verifyPrivateStorageOnce({
  databaseUrl:secret,PoolClass:Pool,
  createPool:async()=>({query:async()=>({rows:[{n:6}]}),end:async()=>{ended++}})
 });
 assert.deepEqual(valid,{configured:true,connected:true,mode:'ephemeral',reason:'ok'});
 assert.equal(JSON.stringify(valid).includes('secret'),false);
 const bad=await verifyPrivateStorageOnce({
  databaseUrl:secret,PoolClass:Pool,
  createPool:async()=>({query:async()=>{throw Error('password secret must never leak')},end:async()=>{ended++}})
 });
 assert.deepEqual(bad,{configured:true,connected:false,mode:'ephemeral',reason:'connection_failed'});
 assert.equal(JSON.stringify(bad).includes('secret'),false);
 const missing=await verifyPrivateStorageOnce({
  databaseUrl:secret,PoolClass:Pool,
  createPool:async()=>({query:async()=>({rows:[{n:5}]}),end:async()=>{ended++}})
 });
 assert.equal(missing.connected,false);
 assert.equal(missing.reason,'schema_incomplete');
 const invalid=await verifyPrivateStorageOnce({databaseUrl:secret,PoolClass:Pool,createPool:async()=>{throw Error('Database target is not the dedicated Supabase session pooler')}});
 assert.equal(invalid.reason,'wrong_database_target');
 assert.equal(JSON.stringify(invalid).includes('secret'),false);
 assert.equal(ended,3);
});
