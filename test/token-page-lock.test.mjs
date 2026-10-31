import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPage } from '../web.mjs';

// Owner-approved /token snapshot from 2026-10-31, deployed commit
// fd133f88dbed0c4b4bf91023e916152201262b2c.
// To change this baseline: obtain the owner's explicit approval, then deliberately
// update this checksum and TOKEN_PAGE_LOCK.md in the same reviewed PR.
// NOTE: This is a CI guard against accidental edits, not a GitHub branch protection rule.
const APPROVED_LENGTH = 13377;
const APPROVED_FNV64 = 'af5cacae1707c4c9';

function fnv64Utf16(text) {
  let h = 0xcbf29ce484222325n;
  for (let i = 0; i < text.length; i++) {
    h ^= BigInt(text.charCodeAt(i));
    h = (h * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return h.toString(16).padStart(16, '0');
}

test('owner-locked /token content matches approved live baseline', () => {
  const document = renderPage('/token');
  assert.ok(document, 'Token page must render');
  const page = document.match(/<main>([\s\S]*?)<\/main>/);
  assert.ok(page, 'Token main content must be extractable');
  assert.equal(page[1].length, APPROVED_LENGTH, 'Token page length changed; owner approval required');
  assert.equal(fnv64Utf16(page[1]), APPROVED_FNV64, 'Token page content changed; owner approval required');
});
