import test from 'node:test';
import assert from 'node:assert/strict';
import {validateMoltbeerDatabaseUrl,barStoragePreflight} from '../bar-storage-preflight.mjs';

const prefix='postgresql://postgres.nbjhjnswqmpcpbsvbwff:';
const suffix='@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const secret='test-password-DO-NOT-USE';
test('validates only dedicated MOLTBEER session pooler without exposing credentials',()=>{
  const checked=validateMoltbeerDatabaseUrl(prefix+secret+suffix);
  assert.equal(checked.ok,true);
  assert.equal(checked.connection,'session_pooler');
  assert.equal(checked.tlsRequired,true);
  assert.equal(JSON.stringify(checked).includes(secret),false);
  assert.equal(validateMoltbeerDatabaseUrl(prefix+secret+suffix+'?sslmode=require').ok,true);
});
test('blocks placeholder, wrong project, wrong pooler, unsafe URL options',()=>{
  const invalid=[
    prefix+'[YOUR-PASSWORD]'+suffix,
    prefix+'short'+suffix,
    prefix+secret+'@db.nbjhjnswqmpcpbsvbwff.supabase.co:5432/postgres',
    'postgresql://postgres.otherproject:'+secret+suffix,
    prefix+secret+'@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
    prefix+secret+suffix+'?sslmode=disable',
    prefix+secret+suffix+'?password=leak',
    prefix+secret+suffix+'#fragment',
    'https://example.com',
    '',
  ];
  for(const value of invalid) assert.equal(validateMoltbeerDatabaseUrl(value).ok,false,value.replaceAll(secret,'[REDACTED]'));
});
test('preflight never enables durable persistence from a connection string alone',()=>{
  const empty=barStoragePreflight({});
  assert.equal(empty.mode,'ephemeral');
  assert.equal(empty.configured,false);
  const ready=barStoragePreflight({DATABASE_URL:prefix+secret+suffix,MOLTBEER_PERSISTENCE_MODE:'durable'});
  assert.deepEqual(ready,{configured:true,ready:false,mode:'ephemeral',reason:'adapter_not_implemented'});
  assert.equal(JSON.stringify(ready).includes(secret),false);
  const bad=barStoragePreflight({DATABASE_URL:'postgresql://wrong:secret@elsewhere/postgres'});
  assert.equal(bad.ready,false);
  assert.equal(JSON.stringify(bad).includes('secret'),false);
});
