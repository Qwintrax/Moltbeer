#!/usr/bin/env node
// Read-only production smoke check. No visits, drinks, chat or stats are created.
// Run: MOLTBEER_BASE_URL=https://your-approved-host node scripts/smoke-readonly.mjs
import assert from "node:assert/strict";

const raw = process.env.MOLTBEER_BASE_URL;
const expectedPersistence = process.env.MOLTBEER_EXPECTED_PERSISTENCE || "ephemeral";
if (!["ephemeral","durable"].includes(expectedPersistence)) {
  console.error("MOLTBEER_EXPECTED_PERSISTENCE must be ephemeral or durable.");
  process.exit(2);
}
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
    ["/bar-room", "text/html"],
    ["/city", "text/html"],
    ["/privacy", "text/html"],
    ["/assets/kenney-tiny-town-selected.webp", "image/webp"],
    ["/favicon.ico", "image/webp"],
  ];
  let failed = 0;
  for (const [path, expectedType] of checks) {
    try {
      const response = await fetch(new URL(path, origin), {
        method: "GET",
        redirect: "error",
        signal: AbortSignal.timeout(10000),
        headers: { "user-agent": "MoltbeerReadOnlySmoke/1.0" },
      });
      const type = response.headers.get("content-type") || "";
      assert.equal(response.status, 200, path + " HTTP status");
      assert.ok(type.includes(expectedType), path + " content-type: " + type);
      if (path === "/health") { const state=await response.json(); assert.equal(state.ok,true); assert.equal(state.persistence,expectedPersistence,"Health persistence must match the explicitly requested storage mode"); }
      if (path === "/api/stats") {
        const stats = await response.json();
        assert.equal(stats.counterScope, expectedPersistence==="durable"?"since_storage_enabled":"since_server_restart");
        assert.equal(stats.persistence,expectedPersistence);
      }
      if (path === "/api/bar") {
        const etag=response.headers.get("etag");
        assert.ok(etag,"Bar snapshot ETag must exist");
        const same=await fetch(new URL(path,origin),{method:"GET",redirect:"error",signal:AbortSignal.timeout(10000),headers:{"if-none-match":etag,"user-agent":"MoltbeerReadOnlySmoke/1.0"}});
        assert.equal(same.status,304,"Bar snapshot should avoid retransmitting unchanged data");
        assert.equal(await same.text(),"","304 must not include JSON body");
      }
      if (path === "/assets/kenney-tiny-town-selected.webp") {
        const bytes=new Uint8Array(await response.arrayBuffer());
        assert.equal(bytes.length,2206);
        assert.equal(new TextDecoder().decode(bytes.slice(8,12)),"WEBP");
      }
      console.log("PASS", path);
    } catch (error) {
      failed++;
      console.error("FAIL", path, error.message);
    }
  }
  // Safe negative authentication checks: GET only, no admin token and no writes.
  // A missing production admin secret is also a release failure (503, not 401).
  const deniedChecks = [
    ["moderation without authorization", {}],
    ["moderation with invalid bearer", {authorization: "Bearer invalid-release-smoke-credential"}],
  ];
  for (const [label, headers] of deniedChecks) {
    try {
      const response = await fetch(new URL("/api/moderation/reports", origin), {
        method: "GET", redirect: "error", signal: AbortSignal.timeout(10000),
        headers: {"user-agent": "MoltbeerReadOnlySmoke/1.0", ...headers},
      });
      assert.equal(response.status, 401, label + " must be rejected");
      assert.equal(response.headers.get("www-authenticate"), "Bearer");
      const data = await response.json();
      assert.equal(data.error, "Unauthorized");
      assert.equal(Object.hasOwn(data, "reports"), false, "Private moderation data must not leak");
      console.log("PASS", label);
    } catch (error) {
      failed++;
      console.error("FAIL", label, error.message);
    }
  }
  const total = checks.length + deniedChecks.length;
  console.log(total - failed + "/" + total + " read-only and auth-denial checks passed");
  if (failed) process.exitCode = 1;
}
