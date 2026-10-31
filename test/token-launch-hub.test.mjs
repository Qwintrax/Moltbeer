import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPage } from '../web.mjs';

test('official public Solana wallet is distinct from the unlaunched token mint', () => {
  const html = renderPage('/token');
  assert.match(html, /OFFICIAL PUBLIC WALLET/);
  assert.match(html, /<h3>Public wallet<\/h3>/);
  assert.match(html, /Ad2nYECAfGKp6MtK1ST9D3w1kApBdQwTZkw6cRbHys5Z/);
  assert.match(html, /id="token-public-copy"/);
  assert.match(html, /id="token-public-wallet"/);
  assert.match(html, /id="token-mint-status"/);
  assert.match(html, /NO MINT ADDRESS YET/);
  assert.match(html, /<strong>NOT<\/strong> the MOLTBEER contract address/);
  assert.doesNotMatch(html, /Tip Jar|tip jar|TipJar|token-tip-/);
  assert.ok(html.indexOf('id="token-mint-status"') < html.indexOf('PHASE 1'));
  assert.ok(html.indexOf('id="token-public-wallet"') < html.indexOf('PHASE 1'));
});

test('general platform links are real while Telegram and token URLs remain unpublished', () => {
  const html = renderPage('/token');
  assert.match(html, /https:\/\/pump\.fun\//);
  assert.match(html, /https:\/\/dexscreener\.com\/solana/);
  assert.match(html, /Telegram group · COMING SOON/);
  assert.match(html, /Official Pump\.fun coin link · AFTER LAUNCH/);
  assert.match(html, /DEX Screener token chart · AFTER LISTING/);
  assert.doesNotMatch(html, /href="https:\/\/t\.me\/MOLTBEER/i);
  assert.match(html, /TOKEN NOT LAUNCHED/);
});

test('Phase 1 is brief and all five roadmap phases remain visible', () => {
  const html = renderPage('/token');
  for (let n = 1; n <= 5; n++) assert.ok(html.includes('PHASE ' + n));
  assert.match(html, /Foundation ready/);
  assert.match(html, /Prepare/);
  assert.match(html, /Launch/);
  assert.match(html, /3% DEV/);
  assert.match(html, /explicit owner approval/);
  assert.match(html, /THE LAST TOKEN/);
  assert.equal((html.match(/class="tp-step(?: done)?"/g) || []).length, 3);
  assert.doesNotMatch(html, /6 established project foundations|10 pending launch tasks|REST and MCP agent APIs, OpenAPI/);
});

test('branding and mobile styles stay scoped to the token landing page', () => {
  const html = renderPage('/token');
  assert.match(html, /class="tp-brand"/);
  assert.match(html, /<h1>MOLTBEER<\/h1>/);
  assert.match(html, /Official MOLTBEER robot bartender logo/);
  assert.match(html, /@media\(max-width:650px\)/);
  assert.match(html, /\.token-page\{/);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.doesNotMatch(html, /<small>\$MOLTBEER/);
});
