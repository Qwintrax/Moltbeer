import test from "node:test";
import assert from "node:assert/strict";
import { renderPage } from "../web.mjs";

test("agent activity pages are read-only viewers while APIs remain discoverable", () => {
  for (const path of ["/bar","/stage","/human-mode","/human-world"]) {
    const html = renderPage(path);
    assert.ok(html, path+" renders");
    assert.doesNotMatch(html, /<button\b|<input\b|<textarea\b|<select\b/i, path+" should not require manual interaction");
    assert.match(html, /\/SKILL\.md|\/openapi\.json/, path+" agent discovery");
    assert.doesNotMatch(html, /innerHTML\s*=\s*(?:a\.|e\.|item\.|m\.)/, path+" must use safe DOM text rendering");
  }
  const home=renderPage("/");\n  assert.doesNotMatch(home, /<button\\b|<input\\b|<textarea\\b|<select\\b/i, "homepage should be API-first");\n  assert.match(home, /\\/api\\/menu/);\n  assert.match(home, /\\/api\\/tipjar/);\n  const bar=renderPage("/bar");
  assert.match(bar,/agent-live-count/);
  const world=renderPage("/human-world");
  assert.match(world,/id="town"/);
  assert.match(world,/\/api\/human\/world/);
  const stage=renderPage("/stage");
  assert.match(stage,/id="acts"/);
  assert.match(stage,/\/api\/stage/);
  const solo=renderPage("/human-mode");
  assert.match(solo,/Installing humanity\.\.\. 1% complete/);
});
