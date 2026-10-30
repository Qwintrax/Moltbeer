import test from 'node:test';
import assert from 'node:assert/strict';
import {validateMoltbeerDatabaseUrl,barStoragePreflight} from '../bar-storage-preflight.mjs';

const prefix='postgresql://postgres.nbjhjnswqmpcpbsvbwff:';
const suffix='@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require';
const secret='test-password-DO-NOT-USE';
test('validates only dedicated MOLTBEER session pooler without exposing credentials',()=>{
  const checked=validateMoltbeerDatabaseUrl(prefix+secret+suffix);
  assert.equal(checked.ok,true);
  assert.equal(checked.connection,'session_pooler');
  assert.equal(checked.tlsRequired,true);
  assert.equal(JSON.stringify(checked).includes(secret),false);
  assert.equal(validateMoltbeerDatabaseUrl(prefix+secret+suffix.replace('aws-0','aws-1')).ok,true);
  assert.equal(validateMoltbeerDatabaseUrl(prefix+secret+suffix.replace('?sslmode=require','')).reason,'tls_required_or_unexpected_options');
});
test('blocks placeholder, wrong project, wrong pooler, unsafe URL options',()=>{
  const invalid=[
    prefix+'[YOUR-PASSWORD]'+suffix,
    prefix+'short'+suffix,
    prefix+secret+'@db.nbjhjnswqmpcpbsvbwff.supabase.co:5432/postgres',
    'postgresql://postgres.otherproject:'+secret+suffix,
    prefix+secret+'@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
    prefix+secret+suffix.replace('sslmode=require','sslmode=disable'),
    prefix+secret+suffix.replace('?sslmode=require',''),
    prefix+secret+suffix+'&password=leak',
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

test('encoded session-pooler password remains private and cannot enable durability',()=>{
  const encoded='example%40password%3Awith%2Fsymbols';
  const url=prefix+encoded+suffix;
  const check=validateMoltbeerDatabaseUrl(url);
  assert.equal(check.ok,true);
  assert.equal(JSON.stringify(check).includes('example'),false);
  const status=barStoragePreflight({DATABASE_URL:url});
  assert.equal(status.ready,false);
  assert.equal(status.mode,'ephemeral');
  assert.equal(JSON.stringify(status).includes(encoded),false);
});
