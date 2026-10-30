import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePrivateDatabaseUrl,createPrivateDatabasePool} from '../bar-storage-pool.mjs';
import {verifyPrivateStorageOnce} from '../storage-readiness.mjs';
const target='postgresql://postgres.nbjhjnswqmpcpbsvbwff:encoded%40password@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require';
test('accepts only dedicated TLS-enabled Supabase pooler',()=>{
 assert.equal(validatePrivateDatabaseUrl(target),target.replace('?sslmode=require',''));
 for(const value of [
  'postgresql://postgres.other:pw@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
  'postgresql://postgres.nbjhjnswqmpcpbsvbwff:pw@evil.example:5432/postgres',
  target.replace(':5432/',':6543/'),
  target.replace('sslmode=require','sslmode=disable'),
  target.replace('?sslmode=require',''),
  target.replace('eu-west-1','us-east-1')
 ]) assert.throws(()=>validatePrivateDatabaseUrl(value));
});
test('creates bounded pool and checks database before returning',async()=>{
 let config;
 class Pool{constructor(c){config=c}async query(){return {rows:[{ok:1}]}}async end(){}}
 const pool=await createPrivateDatabasePool({databaseUrl:target,PoolClass:Pool});
 assert.ok(pool);assert.equal(config.max,3);assert.equal(config.ssl.rejectUnauthorized,true);
 assert.equal(config.connectionString.includes('sslmode'),false);
 assert.equal(config.connectionString.includes('encoded%40password'),true);
});
test('connection failure closes pool without revealing credentials',async()=>{
 let closed=false;
 class Pool{async query(){throw Error('sensitive secret')}async end(){closed=true}}
 await assert.rejects(createPrivateDatabasePool({databaseUrl:target,PoolClass:Pool}),e=>{
  assert.equal(e.message,'Private database connection failed');return true;
 });
 assert.equal(closed,true);
});

test('pool failures expose only allowlisted static reason codes, never credentials',async()=>{
 const causes=[
   ['28P01','authentication_failed'],
   ['28000','authentication_failed'],
   ['CERT_HAS_EXPIRED','tls_verification_failed'],
   ['UNABLE_TO_VERIFY_LEAF_SIGNATURE','tls_verification_failed'],
   ['ECONNREFUSED','network_unavailable'],
   ['ETIMEDOUT','network_unavailable'],
   ['EAI_AGAIN','network_unavailable'],
   ['arbitrary-untrusted-code','connection_failed']
 ];
 for (const [code,reason] of causes){
   let ended=false;
   class Pool{
     async query(){const e=Error('postgresql://private:SUPERSECRET@fake.example');e.code=code;throw e}
     async end(){ended=true}
   }
   const r=await verifyPrivateStorageOnce({
      databaseUrl:target,PoolClass:Pool,createPool:createPrivateDatabasePool
   });
   assert.equal(r.reason,reason,code);
   assert.equal(r.connected,false);
   assert.equal(r.mode,'ephemeral');
   assert.equal(ended,true);
   assert.doesNotMatch(JSON.stringify(r),/SUPERSECRET|private:|postgresql:\/\//);
 }
});
test('constructor failures retain only static reason classifications',async()=>{
 class Pool{constructor(){const err=Error('private key in a driver error');err.code='ENOTFOUND';throw err}}
 await assert.rejects(createPrivateDatabasePool({databaseUrl:target,PoolClass:Pool}),e=>{
   assert.equal(e.message,'Private database connection failed');
   assert.equal(e.safeReason,'network_unavailable');
   assert.doesNotMatch(JSON.stringify(e),/private key|encoded%40password/);
   return true;
 });
});
