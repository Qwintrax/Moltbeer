import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const candidate=readFileSync(new URL('../.railway/railway.ts',import.meta.url),'utf8');
const expected=[
  'DATABASE_URL',
  'MOLTBEER_ADMIN_TOKEN',
  'MOLTBEER_RESTART_CANARY_PHASE',
  'MOLTBEER_STORAGE_ACCEPTANCE',
  'MOLTBEER_STORAGE_MODE',
  'MOLTBEER_STORAGE_PREFLIGHT',
  'MOLTBEER_X402_TIPS_ENABLED'
];

test('Railway IaC candidate preserves every known live variable without values',()=>{
  assert.match(candidate,/import\s*\{[^}]*\bpreserve\b[^}]*\}\s*from\s*["']railway\/iac["']/);
  const env=candidate.match(/\benv:\s*\{([\s\S]*?)\n\s*\},/)?.[1];
  assert.ok(env,'IaC candidate must explicitly declare env preservation');
  const entries=[...env.matchAll(/^\s*([A-Z][A-Z0-9_]*):\s*preserve\(\),?\s*$/gm)].map(m=>m[1]);
  assert.deepEqual(entries.sort(),[...expected].sort());
  assert.equal(env.replace(/^\s*[A-Z][A-Z0-9_]*:\s*preserve\(\),?\s*$/gm,'').trim().replace(/\/\/[^\n]*/g,'').trim(),'');
});

test('Railway IaC candidate remains non-applied and single-service',()=>{
  assert.match(candidate,/DO NOT APPLY/);
  assert.match(candidate,/export const partial = "moltbeer-free-bar-api"/);
  assert.match(candidate,/service\("moltbeer-free-bar-api",/);
  assert.doesNotMatch(candidate,/\b(?:postgres|redis|volume|bucket)\s*\(/);
});
