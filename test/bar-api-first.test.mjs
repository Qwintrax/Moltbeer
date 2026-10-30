import test from "node:test";
import assert from "node:assert/strict";
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
  assert.match(html, /MOLTBEER/);
});
