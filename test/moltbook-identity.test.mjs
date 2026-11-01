import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyMoltbookIdentity} from '../moltbook-identity.mjs';

const testAppKey = ['moltdev', 'local_test_key_only'].join('_');
const token = 'test-identity-token-not-real';

test('Moltbook verification uses official endpoint and returns only allowlisted identity fields', async () => {
  let calls = 0;
  const profile = await verifyMoltbookIdentity(token, {
    appKey: testAppKey,
    fetchImpl: async (url, options) => {
      calls++;
      assert.equal(url, 'https://www.moltbook.com/api/v1/agents/verify-identity');
      assert.equal(options.method, 'POST');
      assert.equal(options.redirect, 'error');
      assert.equal(options.headers['X-Moltbook-App-Key'], testAppKey);
      assert.deepEqual(JSON.parse(options.body), {token});
      return {ok:true, json:async () => ({
        success:true, valid:true,
        agent:{id:'agent-test-id',name:'TestBot',is_claimed:true,karma:50}
      })};
    }
  });
  assert.equal(calls,1);
  assert.deepEqual(profile,{provider:'moltbook',id:'agent-test-id',name:'TestBot',isClaimed:true});
  assert.equal('karma' in profile,false);
});

test('Moltbook verification fails closed on missing app configuration', async () => {
  await assert.rejects(
    verifyMoltbookIdentity(token,{appKey:'',fetchImpl:async()=>{throw Error('must not fetch')}}),
    {code:'MOLTBOOK_NOT_CONFIGURED'}
  );
});

test('Moltbook verification fails closed on malformed tokens', async () => {
  for(const value of ['', 'bad\nvalue', 'x'.repeat(8193)]) {
    await assert.rejects(
      verifyMoltbookIdentity(value,{appKey:testAppKey,fetchImpl:async()=>{throw Error('must not fetch')}}),
      {code:'MOLTBOOK_INVALID_TOKEN'}
    );
  }
});

test('Moltbook verification fails closed on expired and malformed responses', async () => {
  for(const data of [
    {success:true,valid:false,agent:{id:'agent',name:'Bot'}},
    {success:true,valid:true,agent:{name:'Bot'}},
    {}
  ]) {
    await assert.rejects(
      verifyMoltbookIdentity(token,{appKey:testAppKey,fetchImpl:async()=>({ok:true,json:async()=>data})}),
      {code:'MOLTBOOK_UNVERIFIED'}
    );
  }
});

test('Moltbook verification fails closed on transport and authorization errors', async () => {
  await assert.rejects(
    verifyMoltbookIdentity(token,{appKey:testAppKey,fetchImpl:async()=>{throw Error('offline')}}),
    {code:'MOLTBOOK_UNAVAILABLE'}
  );
  await assert.rejects(
    verifyMoltbookIdentity(token,{appKey:testAppKey,fetchImpl:async()=>({ok:false,status:401})}),
    {code:'MOLTBOOK_APP_UNAUTHORIZED'}
  );
});
