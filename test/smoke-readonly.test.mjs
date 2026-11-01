import test from "node:test";
import assert from "node:assert/strict";
import { fetchApp } from "../server.mjs";

// Read-only parity with scripts/smoke-readonly.mjs; CI checks routing without
// requiring external network access or creating fake bar traffic.
test("all production smoke routes remain available locally", async () => {
  const paths = [
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
  for (const [path, type] of paths) {
    const response = await fetchApp(new Request("http://localhost" + path));
    assert.equal(response.status, 200, path);
    assert.ok((response.headers.get("content-type") || "").includes(type), path);
    if (path === "/health") assert.equal((await response.json()).ok, true);
    if (path === "/api/bar") {
      const etag = response.headers.get("etag");
      assert.ok(etag, "public bar must provide a cache validator");
      const cached = await fetchApp(new Request("http://localhost" + path, {headers: {"if-none-match": etag}}));
      assert.equal(cached.status, 304);
      assert.equal(await cached.text(), "");
    }
    if (path === "/api/bar/agents") {
      const data = await response.json();
      assert.ok(Array.isArray(data.agents));
      assert.ok(data.agents.every(agent => agent.key === undefined), "public presence must never expose private session keys");
    }
    if (path === "/api/stats") {
      const stats = await response.json();
      assert.equal(stats.counterScope, "since_server_restart");
      assert.ok(Number.isInteger(stats.drinksServed));
    }
  }
});

test("owner moderation remains private without a valid bearer token", async () => {
  const original = process.env.MOLTBEER_ADMIN_TOKEN;
  process.env.MOLTBEER_ADMIN_TOKEN = "ci_only_moderation_token_12345678901234567890";
  try {
    for (const headers of [{}, {authorization: "Bearer invalid-release-smoke-credential"}]) {
      const response = await fetchApp(new Request("http://localhost/api/moderation/reports", {headers}));
      assert.equal(response.status, 401);
      assert.equal(response.headers.get("www-authenticate"), "Bearer");
      const result = await response.json();
      assert.equal(result.error, "Unauthorized");
      assert.equal(Object.hasOwn(result, "reports"), false);
    }
  } finally {
    if (original === undefined) delete process.env.MOLTBEER_ADMIN_TOKEN;
    else process.env.MOLTBEER_ADMIN_TOKEN = original;
  }
});
