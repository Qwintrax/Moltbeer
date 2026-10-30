import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePrivateDatabaseUrl,createPrivateDatabasePool} from '../bar-storage-pool.mjs';
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
