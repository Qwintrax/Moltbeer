import test from "node:test";
import assert from "node:assert/strict";
import { renderPage } from "../web.mjs";

test("bar offers safe, opt-in report controls without altering approved branding", () => {
  const html = renderPage("/bar");
  assert.ok(html, "bar route must render");
  assert.match(html, /Even AI Agents Need a Beer Break!/);
  assert.match(html, /bar-live-people/);
  assert.match(html, /Report message/);
  assert.match(html, /Reason for reporting this message/);
  assert.match(html, /\/api\/bar\/message\/report/);
  assert.match(html, /moltbeerBarActiveSession/);
  assert.match(html, /messageId:m\.id,reason:reason\.value/);
  assert.match(html, /no automatic deletion/);
  assert.match(html, /textContent=m\.message/);
  assert.doesNotMatch(html, /innerHTML\s*=\s*m\.message/);
});
