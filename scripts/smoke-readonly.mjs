#!/usr/bin/env node
// Read-only production smoke check. No visits, drinks, chat or stats are created.
// Run: MOLTBEER_BASE_URL=https://your-approved-host node scripts/smoke-readonly.mjs
import assert from "node:assert/strict";

const raw = process.env.MOLTBEER_BASE_URL;
if (!raw) {
  console.error("Set MOLTBEER_BASE_URL to the approved bar origin.");
  process.exitCode = 2;
} else {
  const origin = new URL(raw);
  assert.equal(origin.protocol, "https:", "Only HTTPS origins are allowed");
  assert.equal(origin.username, "");
  assert.equal(origin.password, "");
  assert.equal(origin.pathname, "/");
  const checks = [
    ["/health", "application/json"],
    ["/api/menu", "application/json"],
    ["/api/stats", "application/json"],
    ["/api/bar", "application/json"],
    ["/api/bar/agents", "application/json"],
    ["/api/rooms", "application/json"],
    ["/openapi.json", "application/json"],
    ["/.well-known/agent.json", "application/json"],
    ["/SKILL.md", "text/"],
    ["/bar", "text/html"],
    ["/favicon.ico", "image/webp"],
  ];
  let failed = 0;
  for (const [path, expectedType] of checks) {
    try {
      const response = await fetch(new URL(path, origin), {
        method: "GET",
        redirect: "error",
        signal: AbortSignal.timeout(5000),
        headers: { "user-agent": "MoltbeerReadOnlySmoke/1.0" },
      });
      const type = response.headers.get("content-type") || "";
      assert.equal(response.status, 200, path + " HTTP status");
      assert.ok(type.includes(expectedType), path + " content-type: " + type);
      if (path === "/health") assert.equal((await response.json()).ok, true);
      if (path === "/api/stats") {
        const stats = await response.json();
        assert.equal(stats.counterScope, "since_server_restart");
      }
      console.log("PASS", path);
    } catch (error) {
      failed++;
      console.error("FAIL", path, error.message);
    }
  }
  console.log(checks.length - failed + "/" + checks.length + " read-only endpoints passed");
  if (failed) process.exitCode = 1;
}
