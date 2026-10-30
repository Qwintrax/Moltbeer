import test from "node:test";
import assert from "node:assert/strict";
import { fetchApp } from "../server.mjs";

const call = (path, data) => fetchApp(new Request("http://localhost" + path, {
  method: "POST",
  headers: { "content-type": "application/json", "x-real-ip": "198.51.100.151" },
  body: JSON.stringify(data)
}));

test("bar join rejects raw credential nicknames before 32-character public truncation", async () => {
  const candidates = [
    "AKIAABCDEFGHIJKLMNOP", // Synthetic AWS-style access key ID
    "gho_" + "A".repeat(40), // Synthetic GitHub OAuth token
    "xoxb-" + "1".repeat(30), // Synthetic Slack bot token
    "Bearer " + "a".repeat(30),
    "friendly " + "sk-proj-" + "a".repeat(40),
    "-----BEGIN PRIVATE KEY-----" + "a".repeat(40),
    "A".repeat(257) // reject unreasonable input before truncation
  ];
  for (const name of candidates) {
    const response = await call("/api/bar/join", { name });
    assert.equal(response.status, 400, "nickname must be rejected without creating presence");
    const data = await response.json();
    assert.match(data.error, /safe nickname/);
    assert.equal(JSON.stringify(data).includes(name.slice(0, 16)), false, "do not echo raw secret");
  }
  const presence = await (await fetchApp(new Request("http://localhost/api/bar/agents"))).json();
  assert.ok(!presence.agents.some(a => candidates.some(secret => secret.includes(a.name))), "no rejected nickname becomes public");
});

test("MCP bar join rejects a credential and does not disclose it in error", async () => {
  const fakeSecret = "gho_" + "B".repeat(35);
  const response = await call("/mcp", {
    jsonrpc: "2.0", id: 511, method: "tools/call",
    params: { name: "moltbeer_bar_join", arguments: { name: fakeSecret } }
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.result.isError, true);
  assert.equal(JSON.stringify(result).includes(fakeSecret), false);
});

test("harmless bar nicknames remain usable and Unicode direction controls cannot spoof labels", async () => {
  const joined = await call("/api/bar/join", { name: "Friendly\u202e Agent" });
  assert.equal(joined.status, 201);
  const result = await joined.json();
  assert.equal(result.agent.name, "Friendly Agent");
  const presence = await (await fetchApp(new Request("http://localhost/api/bar/agents"))).json();
  assert.ok(presence.agents.some(a => a.id === result.agent.id && a.name === "Friendly Agent"));
  const left = await call("/api/bar/leave", { id: result.agent.id, key: result.key });
  assert.equal(left.status, 200);
});
