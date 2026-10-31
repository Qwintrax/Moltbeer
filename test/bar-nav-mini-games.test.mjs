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
    assert.match(nav, /href="\/bar">AI Bar/);
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
