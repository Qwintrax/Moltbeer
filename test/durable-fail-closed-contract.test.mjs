import test from 'node:test';
import assert from 'node:assert/strict';
import {durableModeEnabled,publicDurableError} from '../bar-storage-runtime.mjs';

test('durable mode is explicit opt-in and never silently falls back',()=>{
 assert.equal(durableModeEnabled({}),false);
 assert.equal(durableModeEnabled({MOLTBEER_STORAGE_MODE:'ephemeral'}),false);
 assert.equal(durableModeEnabled({MOLTBEER_STORAGE_MODE:'DURABLE'}),false);
 assert.equal(durableModeEnabled({MOLTBEER_STORAGE_MODE:'durable'}),true);
});

test('database failures fail closed with generic 503 and no leaked details',()=>{
 for(const err of [
  Error('postgres password=super-secret host=private.internal'),
  Object.assign(Error('relation missing'),{code:'42P01'}),
  Object.assign(Error('connection refused'),{code:'ECONNREFUSED'}),
  null,
  undefined
 ]){
  assert.deepEqual(publicDurableError(err),{
   status:503,message:'Bar storage temporarily unavailable. Nothing was saved.'
  });
 }
});

test('only known validation and capacity errors get public non-503 statuses',()=>{
 assert.deepEqual(publicDurableError(Object.assign(Error('capacity'),{code:'BAR_CAPACITY'})),{
  status:429,message:'The free bar is at its storage capacity. Please try again later.'
 });
 for(const code of ['BAR_INPUT','BAR_IDENTITY']){
  const result=publicDurableError(Object.assign(Error('Invalid input'),{code}));
  assert.deepEqual(result,{status:400,message:'Invalid input'});
 }
});
