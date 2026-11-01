import test from "node:test";
import assert from "node:assert/strict";
import {fetchApp} from "../server.mjs";

test("health exposes only a validated deployment commit fingerprint", async () => {
  const oldCommit = process.env.RAILWAY_GIT_COMMIT_SHA;
  const oldMode = process.env.MOLTBEER_STORAGE_MODE;
  const good = "0123456789abcdef0123456789abcdef01234567";
  try {
    process.env.MOLTBEER_STORAGE_MODE = "ephemeral";
    process.env.RAILWAY_GIT_COMMIT_SHA = good.toUpperCase();
    for (const path of ["/health", "/api/health"]) {
      const response = await fetchApp(new Request("http://localhost" + path));
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("x-moltbeer-deployment-commit"), good);
      assert.equal((await response.json()).persistence, "ephemeral");
    }
    for (const unsafe of ["unknown", "a".repeat(39), good + "\nInjected: yes"]) {
      process.env.RAILWAY_GIT_COMMIT_SHA = unsafe;
      const response = await fetchApp(new Request("http://localhost/health"));
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("x-moltbeer-deployment-commit"), null);
    }
  } finally {
    if (oldCommit === undefined) delete process.env.RAILWAY_GIT_COMMIT_SHA;
    else process.env.RAILWAY_GIT_COMMIT_SHA = oldCommit;
    if (oldMode === undefined) delete process.env.MOLTBEER_STORAGE_MODE;
    else process.env.MOLTBEER_STORAGE_MODE = oldMode;
  }
});
