import test from 'node:test';
import assert from 'node:assert/strict';
import {Pool} from 'pg';
import {validatePrivateDatabaseUrl} from '../bar-storage-pool.mjs';

test('pinned PostgreSQL driver loads without opening a connection',()=>{
 assert.equal(typeof Pool,'function');
 const url='postgresql://postgres.nbjhjnswqmpcpbsvbwff:encoded%40password@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require';
 const safe=validatePrivateDatabaseUrl(url);
 assert.equal(safe.includes('sslmode'),false);
 const pool=new Pool({connectionString:safe,ssl:{rejectUnauthorized:true},max:1});
 assert.equal(pool.options.max,1);
 assert.equal(pool.options.ssl.rejectUnauthorized,true);
 return pool.end();
});
