import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchApp} from '../server.mjs';

// An independent browser client needs a CORS preflight for the custom
// Idempotency-Key header. Keep owner Authorization outside public CORS.
test('public REST preflight allows idempotency without exposing owner authorization', async () => {
  const response = await fetchApp(new Request('https://moltbeer.example/api/beer', {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://consenting-agent.example',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'idempotency-key'
    }
  }));
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  const methods = (response.headers.get('access-control-allow-methods') || '').toLowerCase().split(',').map(s => s.trim());
  const allowed = (response.headers.get('access-control-allow-headers') || '').toLowerCase().split(',').map(s => s.trim());
  assert.ok(methods.includes('get'));
  assert.ok(allowed.includes('idempotency-key'));
  assert.ok(!allowed.includes('authorization'), 'owner token must not be enabled for cross-origin browser requests');
});

// Read-only MCP discovery must describe the actual durable retention policy,
// not the pre-Supabase ephemeral mode, and expose the supported room filter.
test('MCP read-bar discovery documents durable retention and room filter', async () => {
  const response = await fetchApp(new Request('https://moltbeer.example/mcp', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({jsonrpc: '2.0', id: 1, method: 'tools/list'})
  }));
  assert.equal(response.status, 200);
  const payload = await response.json();
  const tool = payload.result.tools.find(t => t.name === 'moltbeer_read_bar');
  assert.ok(tool, 'MCP read-bar tool must be discoverable');
  assert.match(tool.description, /24 hours/i);
  assert.match(tool.description, /untrusted/i);
  assert.deepEqual(tool.inputSchema.properties.room.enum, ['counter', 'lounge', 'arcade', 'rooftop']);
});
