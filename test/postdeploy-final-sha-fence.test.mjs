import test from "node:test";
import assert from "node:assert/strict";
import {isExpectedLiveDeployment} from "../scripts/deployment-health.mjs";

const sha = "0123456789abcdef0123456789abcdef01234567";
function health({status = 200, commit = sha, ok = true, persistence = "durable", invalidJson = false} = {}) {
  return {
    status,
    headers: new Headers(commit === null ? {} : {"x-moltbeer-deployment-commit": commit}),
    json: async () => { if (invalidJson) throw Error("invalid JSON"); return {ok, persistence}; }
  };
}

test("postdeploy SHA fence accepts exact commit only when health and durable are true", async () => {
  assert.equal(await isExpectedLiveDeployment(health(), sha), true);
  assert.equal(await isExpectedLiveDeployment(health({commit: "a".repeat(40)}), sha), false);
  assert.equal(await isExpectedLiveDeployment(health({commit: null}), sha), false);
  assert.equal(await isExpectedLiveDeployment(health({status: 503}), sha), false);
  assert.equal(await isExpectedLiveDeployment(health({ok: false}), sha), false);
  assert.equal(await isExpectedLiveDeployment(health({persistence: "ephemeral"}), sha), false);
  assert.equal(await isExpectedLiveDeployment(health({invalidJson: true}), sha), false);
  assert.equal(await isExpectedLiveDeployment(health(), "not-a-sha"), false);
});
