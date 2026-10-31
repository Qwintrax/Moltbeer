import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPage } from '../web.mjs';

test('token landing shows the official public SOL Tip Jar, separate from any token mint', () => {
  const html = renderPage('/token');
  assert.ok(html);
  assert.match(html, /Ad2nYECAfGKp6MtK1ST9D3w1kApBdQwTZkw6cRbHys5Z/);
  assert.match(html, /id="token-public-copy"/);
  assert.match(html, /id="token-mint-status"/);
  assert.match(html, /NO MINT ADDRESS YET/);
  assert.match(html, /<strong>NOT<\/strong> the \$MOLTBEER contract address/);
  assert.ok(html.indexOf('id="token-mint-status"') < html.indexOf('PHASE 1'));
  assert.ok(html.indexOf('id="token-public-wallet"') < html.indexOf('PHASE 1'));
});

test('launch resources are honest about what is not yet officially published', () => {
  const html = renderPage('/token');
  assert.match(html, /https:\/\/pump\.fun\//);
  assert.match(html, /https:\/\/dexscreener\.com\/solana/);
  assert.match(html, /Telegram group · COMING SOON/);
  assert.match(html, /Official Pump\.fun coin link · AFTER LAUNCH/);
  assert.match(html, /DEX Screener token chart · AFTER LISTING/);
  assert.doesNotMatch(html, /href="https:\/\/t\.me\/MOLTBEER/i);
  assert.match(html, /TOKEN NOT LAUNCHED/);
});

test('phase one checklist shows existing product work and pending token launch controls', () => {
  const html = renderPage('/token');
  for (let n = 1; n <= 5; n++) assert.ok(html.includes('PHASE ' + n));
  assert.match(html, /Built &amp; checked off/);
  assert.match(html, /Still to do before launch/);
  assert.match(html, /Creator fees/);
  assert.match(html, /3% DEV/);
  assert.match(html, /explicit owner approval/);
  assert.match(html, /free digital bar/);
  assert.match(html, /Deferred — not Phase 1/);
});

test('token page redesign uses public wallet wording, readable mobile layout and preserves logo', () => {
  const html = renderPage('/token');
  assert.match(html, /OFFICIAL PUBLIC WALLET/);
  assert.match(html, /<h3>Public wallet<\/h3>/);
  assert.doesNotMatch(html, /Tip Jar|tip jar|TipJar|token-tip-/);
  assert.match(html, /\.tp-hero/);
  assert.match(html, /@media\(max-width:650px\)/);
  assert.match(html, /Official MOLTBEER red robot mascot logo/);
  assert.match(html, /TOKEN NOT LAUNCHED/);
  assert.ok(html.indexOf('id="token-mint-status"') < html.indexOf('PHASE 1'));
  assert.ok(html.indexOf('id="token-public-wallet"') < html.indexOf('PHASE 1'));
});
