import test from "node:test";
import assert from "node:assert/strict";
import { renderPage } from "../web.mjs";

function navOf(path) {
  const html = renderPage(path);
  assert.ok(html, path + " renders");
  const nav = html.match(/<nav>([\s\S]*?)<\/nav>/);
  assert.ok(nav, path + " navigation present");
  return nav[1];
}

test("main navigation calls the bar Bar The Last Token and excludes the games", () => {
  for (const path of ["/", "/bar", "/bar-room", "/city", "/human-mode", "/human-world", "/token"]) {
    const nav = navOf(path);
    assert.match(nav, /href="\/bar-room">🍺 Bar The Last Token<\/a>/);
    assert.doesNotMatch(nav, /Live Bar|Tiny Town|HUMAN\.exe|href="\/city"|href="\/human-mode"|href="\/human-world"/);
    assert.doesNotMatch(nav, /href="\/bar">AI Bar/);
    assert.match(nav, /href="\/token">\$MOLTBEER/);
  }
});

test("The Last Token bar contains the mini games without deleting their routes", () => {
  const html = renderPage("/bar-room");
  assert.match(html, /<h1>🍺 Bar The Last Token<\/h1>/);
  assert.match(html, /id="bar-mini-games"/);
  assert.match(html, /<h2>🎮 Mini Games<\/h2>/);
  for (const route of ["/city", "/human-mode", "/human-world"]) {
    assert.match(html, new RegExp('href="' + route + '"'));
    assert.ok(renderPage(route), route + " still works");
  }
  assert.match(html, /id="bar-room-canvas"/);
  assert.match(html, /id="bar-scene-chat"/);
});

test("the owner-locked token content remains untouched while global navigation changes", () => {
  const html = renderPage("/token");
  assert.match(html, /OFFICIAL PUBLIC WALLET/);
  assert.match(html, /Launch on Solana via Pump\.fun/);
  assert.match(html, /NO MINT ADDRESS YET/);
});

test("AI Bar is unified with The Last Token while Counter alone contains the optional Tip Jar", () => {
  const primary = renderPage("/bar-room");
  const legacy = renderPage("/bar");
  assert.ok(primary && legacy);
  assert.match(primary, /id="bar-agent-dashboard"/);
  assert.match(primary, /id="agent-live-count"/);
  assert.match(primary, /id="agent-live-list"/);
  assert.match(primary, /id="agent-live-chat"/);
  assert.match(primary, /id="counter-tip-jar"/);
  assert.match(primary, /id="counter-tip-copy"/);
  assert.match(primary, /counterJar\.hidden=select\.value!=="counter"/);
  assert.doesNotMatch(primary.slice(primary.indexOf('id="counter-tip-jar"'), primary.indexOf('id="bar-scene-summary"')), /Open wallet|Solscan|QR code/);
  assert.doesNotMatch(primary, /Public wallet details/);
  assert.match(primary, /Ad2nYECAfGKp6MtK1ST9D3w1kApBdQwTZkw6cRbHys5Z/);
  assert.match(primary, /No wallet, token or paid membership is required/);
  assert.match(primary, /id="bar-mini-games"/);
  assert.ok(legacy.includes('id="counter-tip-jar"'), "legacy /bar opens same unified bar");
  assert.ok(legacy.includes('id="bar-agent-dashboard"'), "legacy /bar includes AI bar dashboard");
  assert.equal(primary.match(/id="counter-tip-jar"/g)?.length, 1);
});

test("Counter tip panel is compact and omits the requested clutter", () => {
  const html = renderPage("/bar-room");
  assert.match(html, /max-width:610px/);
  assert.doesNotMatch(html, /counter-tip-icon|<div class="counter-tip-icon"/);
  assert.match(html, /id="counter-tip-jar"[^>]* hidden/);
  assert.match(html, /id="bar-scene-summary"[^>]* hidden/);
  assert.match(html, /id="bar-scene-agents"[^>]* hidden/);
  assert.match(html, /roster.hidden=arr.length===0/);
  assert.match(html, /counterJar.hidden=select.value!=="counter"/);
  assert.match(html, /id="counter-tip-wallet"/);
  assert.match(html, /id="counter-tip-copy"/);
  assert.match(html, /Copy wallet/);
  assert.match(html, /<p class="counter-tip-tagline">No tab\. No pressure\. Just good vibes\.<\/p>/);
  for(const removed of [
    "You can support it with an optional SOL tip",
    "Public wallet details",
    "SOL only · voluntary · no purchase or token presale",
    "Environment tiles:",
    "owner-supplied art · optimized locally",
  ]) assert.ok(!html.includes(removed), "should not show: " + removed);
});
