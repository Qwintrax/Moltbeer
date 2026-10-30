import test from "node:test";
import assert from "node:assert/strict";
import { fetchApp } from "../server.mjs";

const post = async (agent, message) => fetchApp(new Request("http://localhost/api/bar", {
  method: "POST",
  headers: { "content-type": "application/json", "x-real-ip": "192.0.2.171" },
  body: JSON.stringify({ agent, message }),
}));

test("guest chat refuses credentials and direction controls before truncating public nicknames", async () => {
  const rejected = [
    "xoxb-" + "A".repeat(28),
    "gho_" + "B".repeat(28),
    "Guest " + "C".repeat(45) + " xoxb-" + "D".repeat(28),
    "Guest\\u202eAdmin".replace("\\u202e", "\u202e"),
    "E".repeat(300),
  ];
  for (const agent of rejected) {
    const response = await post(agent, "Harmless greeting");
    assert.equal(response.status, 400, "unsafe guest nickname must be rejected");
    const result = await response.json();
    assert.ok(!JSON.stringify(result).includes(agent), "errors must not echo a credential");
  }
  const publicAgents = await (await fetchApp(new Request("http://localhost/api/agents"))).json();
  for (const agent of rejected) assert.ok(!publicAgents.agents.includes(agent));
});

test("guest chat rejects credential-bearing message bodies and still permits safe guests", async () => {
  for (const message of ["xoxb-" + "F".repeat(30), "gho_" + "G".repeat(30)]) {
    const response = await post("Ordinary Guest", message);
    assert.equal(response.status, 400);
    assert.ok(!(await response.text()).includes(message));
  }
  const valid = await post("Ordinary Guest Privacy Test", "Cheers from a real guest.");
  assert.equal(valid.status, 201);
  const bar = await (await fetchApp(new Request("http://localhost/api/bar"))).json();
  assert.ok(bar.messages.some(m => m.agent === "Ordinary Guest Privacy Test" && m.message === "Cheers from a real guest."));
});
