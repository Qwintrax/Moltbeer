#!/usr/bin/env node
// Read-only deployment fence: never accept a successful smoke against old code.
// Only GET /health. No user, agent, chat, drink, payment or database writes.
import assert from "node:assert/strict";
import {setTimeout as delay} from "node:timers/promises";

const expected = process.env.MOLTBEER_EXPECTED_SHA;
const raw = process.env.MOLTBEER_BASE_URL;
assert.match(expected || "", /^[a-f0-9]{40}$/i, "Expected a full 40-character Git commit SHA");
assert.ok(raw, "MOLTBEER_BASE_URL is required");
const origin = new URL(raw);
assert.equal(origin.protocol, "https:");
assert.equal(origin.hostname, "moltbeer-free-bar-api-production.up.railway.app");
assert.equal(origin.pathname, "/");
assert.equal(origin.username, "");
assert.equal(origin.password, "");
assert.equal(origin.search, "");
assert.equal(origin.hash, "");

for (let attempt = 1; attempt <= 36; attempt++) {
  try {
    const response = await fetch(new URL("/health", origin), {
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(5000),
      headers: {"user-agent": "MoltbeerReadOnlyPostdeploy/1.0"}
    });
    if (response.status === 200 &&
        response.headers.get("x-moltbeer-deployment-commit") === expected.toLowerCase()) {
      const health = await response.json();
      assert.equal(health.ok, true);
      assert.equal(health.persistence, "durable");
      console.log("PASS production health matches tested commit", expected);
      process.exit(0);
    }
    console.log("WAIT production deployment has not reached tested commit (attempt", attempt, "of 36)");
  } catch (error) {
    console.log("WAIT production health unavailable (attempt", attempt, "of 36):", error.name);
  }
  if (attempt < 36) await delay(10000);
}
console.error("FAIL: no healthy production deployment of expected commit; smoke must NOT run against old code");
process.exitCode = 1;
