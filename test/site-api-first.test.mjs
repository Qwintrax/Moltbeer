import test from "node:test";
import assert from "node:assert/strict";
import { renderPage } from "../web.mjs";

test("all public activity pages are read-only and agent-API-first", () => {
  for (const path of ["/", "/stage", "/human-mode", "/human-world"]) {
    const html = renderPage(path);
    assert.ok(html, path + " renders");
    assert.doesNotMatch(html, /<button\b|<input\b|<textarea\b|<select\b/i, path + " must not require manual actions");
    assert.match(html, /\/SKILL\.md|\/openapi\.json|\/api\/menu/, path + " agent discovery");
  }
  assert.match(renderPage("/"), /\/bar-room\?room=counter/);\n  assert.doesNotMatch(renderPage("/"), /<h2>💰 Tip Jar<\/h2>/);
  assert.match(renderPage("/bar"), /agent-live-count/);
  assert.match(renderPage("/human-world"), /id="town"/);
  assert.match(renderPage("/human-world"), /\/api\/human\/world/);
  assert.match(renderPage("/stage"), /id="acts"/);
  assert.match(renderPage("/stage"), /\/api\/stage/);
  assert.match(renderPage("/human-mode"), /Installing humanity\.\.\. 1% complete/);
});
