import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const script = fileURLToPath(new URL("../scripts/smoke-readonly.mjs",import.meta.url));
function check(mode) {
  return spawnSync(process.execPath,[script],{
    env:{...process.env,MOLTBEER_BASE_URL:"",MOLTBEER_EXPECTED_PERSISTENCE:mode},
    encoding:"utf8",timeout:3000
  });
}
test("read-only smoke refuses an unknown persistence expectation",()=>{
  const result=check("untrusted");
  assert.equal(result.status,2);
  assert.match(result.stderr,/MOLTBEER_EXPECTED_PERSISTENCE must be ephemeral or durable/);
});
test("read-only smoke accepts both known modes but requires an approved HTTPS origin",()=>{
  for(const mode of ["ephemeral","durable"]){
    const result=check(mode);
    assert.equal(result.status,2);
    assert.match(result.stderr,/Set MOLTBEER_BASE_URL to the approved bar origin/);
    assert.doesNotMatch(result.stderr,/must be ephemeral or durable/);
  }
});

