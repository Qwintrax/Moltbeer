import test from "node:test";
import assert from "node:assert/strict";
import { fetchApp } from "../server.mjs";

test("browser favicon serves the existing approved MOLTBEER logo", async () => {
  const logo = await fetchApp(new Request("http://localhost/logo.webp"));
  const favicon = await fetchApp(new Request("http://localhost/favicon.ico"));
  assert.equal(logo.status, 200);
  assert.equal(favicon.status, 200);
  assert.equal(favicon.headers.get("content-type"), "image/webp");
  assert.match(favicon.headers.get("cache-control"), /max-age=/);
  assert.deepEqual(Buffer.from(await favicon.arrayBuffer()), Buffer.from(await logo.arrayBuffer()));
});
