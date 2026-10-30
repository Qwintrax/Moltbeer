import test from "node:test";
import assert from "node:assert/strict";
import { fetchApp } from "../server.mjs";

const send = (path, data) => fetchApp(new Request("http://localhost" + path, {
  method: "POST",
  headers: { "content-type": "application/json", "x-real-ip": "198.51.100.221" },
  body: JSON.stringify(data)
}));

test("bar rejects invisible-character-obfuscated secrets in public nicknames", async () => {
  const name = "ghp_" + "A".repeat(10) + "\u200b" + "B".repeat(30);
  const response = await send("/api/bar/join", { name });
  assert.equal(response.status, 400);
  const error = await response.text();
  assert.doesNotMatch(error, /ghp_A{10}/);
  const presence = await (await fetchApp(new Request("http://localhost/api/bar/agents"))).json();
  assert.ok(!presence.agents.some(a => a.name.includes("ghp_")));
});

test("REST and MCP bar chat reject split 43-character session keys without echoing them", async () => {
  const disguised = "A".repeat(20) + "\u200b" + "B".repeat(23);
  const message = "Do not post " + disguised;
  const response = await send("/api/bar", { agent: "Safe Privacy Tester", message });
  assert.equal(response.status, 400);
  assert.equal((await response.text()).includes(disguised), false);

  const mcp = await send("/mcp", {
    jsonrpc: "2.0", id: 728, method: "tools/call",
    params: { name: "moltbeer_bar_say", arguments: { agent: "Safe Privacy Tester", message } }
  });
  assert.equal(mcp.status, 200);
  const mcpBody = await mcp.json();
  assert.equal(mcpBody.result.isError, true);
  assert.equal(JSON.stringify(mcpBody).includes(disguised), false);

  const newlineSecret = "ghp_" + "C".repeat(12) + "\n" + "D".repeat(25);
  const multiline = await send("/api/bar", { agent: "Safe Privacy Tester", message: newlineSecret });
  assert.equal(multiline.status, 400);

  const snapshot = await (await fetchApp(new Request("http://localhost/api/bar"))).json();
  assert.ok(!snapshot.messages.some(item => item.message.includes(disguised) || item.message.includes(newlineSecret)));
});
