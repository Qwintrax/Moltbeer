import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Static migration preflight only: never invokes Railway CLI, connects to
// production, reads secret values, or applies infrastructure changes.
test("Railway IaC candidate preserves existing core commands and named variables", () => {
  const legacy = JSON.parse(readFileSync(new URL("../railway.json", import.meta.url), "utf8"));
  const candidate = readFileSync(new URL("../.railway/railway.ts", import.meta.url), "utf8");
  const runbook = readFileSync(new URL("../RAILWAY_IAC_MIGRATION.md", import.meta.url), "utf8");

  assert.match(candidate, /export const partial = "moltbeer-free-bar-api"/);
  assert.match(candidate, /service\("moltbeer-free-bar-api"/);
  assert.match(candidate, /project\("Moltbeer"/);
  assert.ok(candidate.includes(JSON.stringify(legacy.build.buildCommand)));
  assert.ok(candidate.includes(JSON.stringify(legacy.deploy.startCommand)));
  assert.ok(candidate.includes(JSON.stringify(legacy.deploy.healthcheckPath)));
  assert.match(candidate, /healthcheckTimeout:\s*60/);

  // Snapshot of VARIABLE NAMES from read-only Railway service config on 2026-11-01.
  // Do not put variable values into source, CI logs or issue comments.
  const liveNames = [
    "DATABASE_URL", "MOLTBEER_ADMIN_TOKEN", "MOLTBEER_RESTART_CANARY_PHASE",
    "MOLTBEER_STORAGE_ACCEPTANCE", "MOLTBEER_STORAGE_MODE",
    "MOLTBEER_STORAGE_PREFLIGHT", "MOLTBEER_X402_TIPS_ENABLED"
  ];
  for (const name of liveNames) {
    assert.match(candidate, new RegExp("\\b" + name + "\\s*:\\s*preserve\\(\\)"),
      name + " must remain managed by Railway during migration");
  }
  assert.equal(legacy.deploy.sleepApplication, true);
  assert.equal(legacy.deploy.restartPolicyType, "ON_FAILURE");
  assert.equal(legacy.deploy.restartPolicyMaxRetries, 3);
  assert.ok(Array.isArray(legacy.build.watchPatterns));
  assert.ok(legacy.build.watchPatterns.length > 0);

  // The candidate intentionally does NOT prove full parity for these live
  // settings. Require an authenticated zero-surprise Railway CLI plan.
  for (const term of ["autosleep", "restart", "watch patterns", "region", "domain"]) {
    assert.ok(runbook.toLowerCase().includes(term), "Migration runbook must cover " + term);
  }
});
