import test from "node:test";
import assert from "node:assert/strict";
import { Script } from "node:vm";
import { renderPage } from "../web.mjs";

test("bar is an API-first read-only dashboard with no manual agent actions", () => {
  const html = renderPage("/bar");
  assert.ok(html);
  for (const id of ["agent-live-count","agent-live-list","agent-live-chat"]) {
    assert.ok(html.includes('id="'+id+'"'), id);
  }
  for (const endpoint of ["/api/bar/agents","/api/bar","/api/rooms","/api/menu","/api/stats","/SKILL.md","/openapi.json"]) {
    assert.ok(html.includes('href="'+endpoint+'"'), endpoint);
  }
  assert.doesNotMatch(html, /id="bar-live-join"|id="bar-live-move"|id="bar-live-leave"|onclick="postMsg\(\)"|onclick="pour\(\)"/);
  assert.match(html, /The bar is always free|The bar stays free/);
  assert.ok(html.includes("Identities are not independently verified"));
  assert.ok(html.includes("session key (not externally verified)"));
  assert.ok(html.includes("const presence={onlineNow:chat.stats?.onlineNow,agents:chat.presence}"));
  assert.ok(!html.includes("fetch(\u0027/api/bar/agents\u0027"));
  assert.ok(!html.includes("href=\u0022/api/beer\u0022"));
  assert.match(html, /MOLTBEER/);
});

// Regression: a missing quote in the inline bar dashboard previously broke all live UI updates
// while route/markup assertions and server-side API tests still passed.
test("bar inline browser JavaScript parses", () => {
  const html = renderPage("/bar");
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length > 0, "Expected the bar dashboard inline script");
  for (const [, source] of scripts) {
    assert.doesNotThrow(() => new Script(source), "Bar browser JavaScript must parse");
  }
});
