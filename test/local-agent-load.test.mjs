import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('local load harness runs and cleans up all simulated agents',()=>{
 const r=spawnSync(process.execPath,[fileURLToPath(new URL('../scripts/load-local-agents.mjs',import.meta.url))],{
  encoding:'utf8',timeout:15000,env:{...process.env,DATABASE_URL:'',MOLTBEER_STORAGE_MODE:'',MOLTBEER_LOAD_AGENTS:'10',MOLTBEER_LOAD_ROUNDS:'3'}
 });
 assert.equal(r.status,0,r.stderr);
 const result=JSON.parse(r.stdout.trim());
 assert.equal(result.ok,true);assert.equal(result.localOnly,true);
 assert.equal(result.agents,10);assert.equal(result.remainingTestAgents,0);
});

