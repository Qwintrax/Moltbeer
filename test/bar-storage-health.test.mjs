import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyDurablePoolHealth} from '../bar-storage-health.mjs';

test('durable health probes an actual live PostgreSQL SELECT',async()=>{
 const queries=[];
 const ok=await verifyDurablePoolHealth({query:async q=>{
  queries.push(q);return {rows:[{ok:1}]};
 }});
 assert.equal(ok,true);
 assert.equal(queries.length,1);
 assert.equal(queries[0].text,'SELECT 1 AS ok');
 assert.equal(queries[0].query_timeout,3000);
});
test('durable health fails closed on malformed or unreachable pools',async()=>{
 assert.equal(await verifyDurablePoolHealth(null),false);
 assert.equal(await verifyDurablePoolHealth({query:async()=>({rows:[]})}),false);
 assert.equal(await verifyDurablePoolHealth({query:async()=>({rows:[{ok:0}]})}),false);
 assert.equal(await verifyDurablePoolHealth({query:async()=>{throw Error('database offline with private details')}}),false);
});
