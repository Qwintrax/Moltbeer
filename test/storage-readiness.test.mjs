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
 assert.equal(invalid.reason,'wrong_project_or_pooler');
 assert.equal(JSON.stringify(invalid).includes('secret'),false);
 assert.equal(ended,3);
});

test('preflight categorizes invalid URL safely without exposing a credential',async()=>{
 const prefix='postgresql://postgres.nbjhjnswqmpcpbsvbwff:';
 const suffix='@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require';
 const secret='example-PRIVATE-test-password';
 class Pool{}
 const createPool=async()=>{throw Error('Database target is not the dedicated Supabase session pooler')};
 const cases=[
  [prefix+'[YOUR-PASSWORD]'+suffix,'missing_password'],
  [prefix+secret+suffix.replace('sslmode=require','sslmode=disable'),'tls_required_or_unexpected_options'],
  [prefix+secret+suffix.replace('aws-0-eu-west-1','aws-0-us-east-1'),'wrong_project_or_pooler'],
  [prefix+secret+suffix+'&extra=1','tls_required_or_unexpected_options'],
  ['not a database URL','malformed']
 ];
 for(const [databaseUrl,expected] of cases){
  const status=await verifyPrivateStorageOnce({databaseUrl,PoolClass:Pool,createPool});
  assert.equal(status.connected,false);
  assert.equal(status.mode,'ephemeral');
  assert.equal(status.reason,expected);
  assert.equal(JSON.stringify(status).includes(secret),false);
  assert.equal(JSON.stringify(status).includes('postgresql://'),false);
 }
});


test('both pool validation error classes map to fixed, secret-free categories',async()=>{
 const password='do-not-leak-this-test-secret';
 const base='postgresql://postgres.nbjhjnswqmpcpbsvbwff:'+password+'@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require';
 for(const message of ['Invalid database configuration','Database target is not the dedicated Supabase session pooler']){
  for(const [url,reason] of [
   [base.replace('sslmode=require','sslmode=disable'),'tls_required_or_unexpected_options'],
   [base.replace('eu-west-1','us-east-1'),'wrong_project_or_pooler'],
   [base.replace(password,'[YOUR-PASSWORD]'),'missing_password']
  ]){
   const result=await verifyPrivateStorageOnce({databaseUrl:url,PoolClass:class {},createPool:async()=>{throw Error(message)}});
   assert.equal(result.reason,reason);
   assert.equal(result.mode,'ephemeral');
   assert.equal(result.connected,false);
   assert.equal(JSON.stringify(result).includes(password),false);
   assert.equal(JSON.stringify(result).includes('postgresql://'),false);
  }
 }
});
