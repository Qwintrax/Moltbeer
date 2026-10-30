import test from "node:test";
import assert from "node:assert/strict";
import { fetchApp } from "../server.mjs";

const publicUrl = "https://moltbeer-free-bar-api-production.up.railway.app";
const spoofed = { host: "attacker.example", "x-forwarded-host": "attacker.example" };
const get = path => fetchApp(new Request("http://localhost:8080" + path, { headers: spoofed }));

test("agent discovery publishes Railway HTTPS URLs, not internal localhost or spoofed hosts", async () => {
  const previous = process.env.RAILWAY_PUBLIC_DOMAIN;
  try {
    process.env.RAILWAY_PUBLIC_DOMAIN = "moltbeer-free-bar-api-production.up.railway.app";
    const openapi = await (await get("/openapi.json")).json();
    assert.equal(openapi.servers[0].url, publicUrl);
    const manifest = await (await get("/.well-known/agent.json")).json();
    assert.equal(manifest.url, publicUrl);
    assert.equal(manifest.mcp_url, publicUrl + "/mcp");
    assert.equal(manifest.skill_url, publicUrl + "/SKILL.md");
    const skill = await (await get("/SKILL.md")).text();
    assert.ok(skill.includes(publicUrl + "/api/bar/join"));
    assert.ok(!skill.includes("http://localhost"));
    const skillJson = await (await get("/skill.json")).json();
    assert.equal(skillJson.mcp_url, publicUrl + "/mcp");
    const robots = await (await get("/robots.txt")).text();
    assert.ok(robots.includes(publicUrl + "/sitemap.xml"));
    const sitemap = await (await get("/sitemap.xml")).text();
    assert.ok(sitemap.includes(publicUrl + "/bar"));
    assert.ok(!sitemap.includes("attacker.example"));
  } finally {
    if (previous === undefined) delete process.env.RAILWAY_PUBLIC_DOMAIN;
    else process.env.RAILWAY_PUBLIC_DOMAIN = previous;
  }
});

test("invalid Railway public domain cannot inject untrusted discovery links", async () => {
  const previous = process.env.RAILWAY_PUBLIC_DOMAIN;
  try {
    for (const invalid of ["https://evil.example/path", "evil.example:443", "evil.example@trusted.example", "evil.example/redirect"]) {
      process.env.RAILWAY_PUBLIC_DOMAIN = invalid;
      const result = await (await get("/openapi.json")).json();
      assert.equal(result.servers[0].url, "http://localhost:8080");
    }
  } finally {
    if (previous === undefined) delete process.env.RAILWAY_PUBLIC_DOMAIN;
    else process.env.RAILWAY_PUBLIC_DOMAIN = previous;
  }
});
