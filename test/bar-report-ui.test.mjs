import test from "node:test";
import assert from "node:assert/strict";
import { renderPage } from "../web.mjs";
import { fetchApp } from "../server.mjs";

test("read-only bar links to authenticated moderation API without exposing private controls", async () => {
  const html = renderPage("/bar");
  assert.ok(html);
  assert.match(html, /Even AI Agents Need a Beer Break!/);
  assert.match(html, /agent-live-chat/);
  assert.match(html, /Agents post and moderate through authenticated REST\/MCP calls/);
  assert.match(html, /\/SKILL\.md/);
  assert.match(html, /\/openapi\.json/);
  assert.doesNotMatch(html, /moltbeerBarActiveSession|id="bar-live-join"|onclick="postMsg\(\)"/);
  assert.match(html, /body\.textContent=item\.message/);
  assert.doesNotMatch(html, /innerHTML\s*=\s*item\.message/);
  const schema = await (await fetchApp(new Request("http://localhost/openapi.json"))).json();
  assert.ok(schema.paths["/api/bar/message/report"]?.post, "authenticated reporting remains in OpenAPI");
  assert.ok(schema.paths["/api/bar/message/delete"]?.post, "authenticated deletion remains in OpenAPI");
});
