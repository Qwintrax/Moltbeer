import test from "node:test";
import assert from "node:assert/strict";
import {assertReadOnlyAuditRequest as guard} from "../scripts/readonly-audit-guard.mjs";

const rpc = (method, params = {}) => ({
  method: "POST", body: JSON.stringify({jsonrpc: "2.0", id: 1, method, params})
});

test("production audit permits only GET and the four approved read-only MCP calls", () => {
  assert.doesNotThrow(() => guard("/health"));
  assert.doesNotThrow(() => guard("/api/bar", {method: "GET"}));
  for (const method of ["initialize", "ping", "tools/list"]) {
    assert.doesNotThrow(() => guard("/mcp", rpc(method)));
  }
  assert.doesNotThrow(() => guard("/mcp", rpc("tools/call", {
    name: "moltbeer_bar_presence", arguments: {room: "counter"}
  })));
});

test("production audit fails closed before any potentially mutating request", () => {
  const rejected = [
    ["/api/bar", {method: "POST"}],
    ["/api/bar/leave", {method: "DELETE"}],
    ["/mcp", {method: "POST", body: "not-json"}],
    ["/mcp", rpc("tools/call", {name: "moltbeer_bar_join", arguments: {}})],
    ["/mcp", rpc("tools/call", {name: "moltbeer_bar_say", arguments: {message: "test"}})],
    ["/mcp", rpc("tools/call", {name: "moltbeer_bar_delete_message", arguments: {}})],
    ["/mcp", rpc("tools/call", {name: "moltbeer_bar_presence", arguments: {room: "counter", action: "join"}})],
    ["/mcp", rpc("tools/call", {name: "moltbeer_bar_presence", arguments: {room: "lounge"}})],
    ["/mcp", rpc("unknown", {})]
  ];
  for (const [path, options] of rejected) {
    assert.throws(() => guard(path, options), /Production audit/);
  }
});


test("production audit rejects unknown GET routes, query variants and external URLs", () => {
  for (const path of ["/api/bar/join", "/api/moderation/reports", "/health?x=1", "https://example.com/health", "//example.com/health", "/not-a-route"]) {
    assert.throws(() => guard(path), /Production audit/);
  }
  assert.throws(() => guard("/health", {method: "GET", body: "unexpected"}), /Production audit/);
  assert.doesNotThrow(() => guard("/api/bar", {method: "GET", headers: {"if-none-match": "etag"}}));
});
