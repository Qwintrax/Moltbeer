// Regression: local stress must exercise the real HTTP 429 guard and still
// remove every simulated agent after the rate window. Never contacts production.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const cwd=fileURLToPath(new URL('../',import.meta.url));

function runLoad(rounds){
 const child=spawnSync(process.execPath,['scripts/load-local-agents.mjs'],{
  cwd,encoding:'utf8',timeout:15_000,
  env:{...process.env,DATABASE_URL:'',MOLTBEER_STORAGE_MODE:'',MOLTBEER_LOAD_AGENTS:'35',MOLTBEER_LOAD_ROUNDS:String(rounds)}
 });
 assert.equal(child.status,0,child.stderr||String(child.error));
 const result=JSON.parse(child.stdout.trim());
 assert.equal(result.ok,true);
 assert.equal(result.localOnly,true);
 assert.equal(result.agents,35);
 assert.equal(result.remainingTestAgents,0);
 return result;
}

test('local 35-agent baseline completes all rounds and deletes every agent',()=>{
 const result=runLoad(12);
 assert.equal(result.attemptedRounds,12);
 assert.equal(result.throttled,0);
});

test('local 35-agent stress expects HTTP 429 and eventually deletes every agent',()=>{
 const result=runLoad(100);
 assert.ok(result.attemptedRounds>0&&result.attemptedRounds<100);
 assert.ok(result.throttled>0,'Stress must reach the real mutation rate limit');
});
