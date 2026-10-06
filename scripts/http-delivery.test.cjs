"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const zlib = require("node:zlib");
const { createHttpDelivery, chooseEncoding } = require("./http-delivery.cjs");
const { createServer } = require("./start-web.cjs");

async function listen(server, t) {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return async (url = "/", headers = {}, method = "GET") => new Promise((resolve, reject) => {
    const request = http.request({ hostname: "127.0.0.1", port: server.address().port, path: url, headers, method }, response => {
      const chunks = [];
      response.on("data", chunk => chunks.push(chunk));
      response.on("end", () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks) }));
    });
    request.on("error", reject); request.end();
  });
}
async function fixture(t, production = true) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "bubble-delivery-"));
  const file = path.join(directory, "fixture.js");
  const content = Buffer.from('const fish = "swimming";\n'.repeat(2000));
  await fs.writeFile(file, content);
  t.after(async () => { await fs.unlink(file); await fs.rmdir(directory); });
  const delivery = createHttpDelivery({ production, maxCacheBytes: 256 * 1024 });
  const request = await listen(http.createServer((req, res) => {
    res.setHeader("Cache-Control", "no-store");
    void delivery.sendFile(req, res, file, "text/javascript; charset=utf-8").catch(() => {
      res.writeHead(404, { "Cache-Control": "no-store" }); res.end();
    });
  }), t);
  return { file, content, request };
}

test("encoding negotiation respects weights, exclusions and identity", () => {
  for (const [header, expected] of [[undefined, "identity"], ["gzip, br", "br"], ["br;q=0, gzip", "gzip"],
    ["br;q=0.3, gzip;q=0.8, identity;q=0", "gzip"], ["gzip;q=0, br;q=0", "identity"],
    ["*;q=0", null], ["*;q=0, gzip;q=1", "gzip"], ["gzip, identity;q=0.5", "gzip"]]) {
    assert.equal(chooseEncoding(header, true), expected);
  }
  assert.equal(chooseEncoding("gzip, br", false), "identity", "compressed image formats stay intact");
});

test("production compression round-trips exactly and HEAD describes the same representation", async t => {
  const { content, request } = await fixture(t);
  for (const [encoding, decode] of [["br", zlib.brotliDecompressSync], ["gzip", zlib.gunzipSync]]) {
    const response = await request("/?v=old", { "Accept-Encoding": encoding });
    assert.equal(response.status, 200);
    assert.equal(response.headers["content-encoding"], encoding);
    assert.equal(response.headers.vary, "Accept-Encoding");
    assert.deepEqual(decode(response.body), content);
    assert.ok(response.body.length < content.length / 10);
    const head = await request("/", { "Accept-Encoding": encoding }, "HEAD");
    assert.equal(head.body.length, 0);
    assert.equal(head.headers["content-length"], String(response.body.length));
    assert.equal(head.headers.etag, response.headers.etag);
  }
});

test("mutable URLs revalidate with weak ETags and changed bytes cannot reuse stale data", async t => {
  const { file, content, request } = await fixture(t);
  const first = await request("/?v=20261003");
  assert.equal(first.headers["cache-control"], "public, max-age=0, must-revalidate");
  assert.deepEqual(first.body, content);
  const cached = await request("/?v=20261003", { "If-None-Match": `"other", ${first.headers.etag}`, "Accept-Encoding": "br" });
  assert.equal(cached.status, 304); assert.equal(cached.body.length, 0);
  assert.equal(cached.headers.vary, "Accept-Encoding");
  const changed = Buffer.from(content.toString().replaceAll("swimming", "sleeping"));
  await fs.writeFile(file, changed);
  const future = new Date(Date.now() + 2000); await fs.utimes(file, future, future);
  const updated = await request("/?v=20261003", { "If-None-Match": first.headers.etag, "Accept-Encoding": "gzip" });
  assert.equal(updated.status, 200); assert.notEqual(updated.headers.etag, first.headers.etag);
  assert.deepEqual(zlib.gunzipSync(updated.body), changed);
  const parallel = await Promise.all(Array.from({ length: 8 }, () => request("/", { "Accept-Encoding": "br" })));
  for (const response of parallel) assert.deepEqual(zlib.brotliDecompressSync(response.body), changed);
});

test("development keeps no-store and reads edited bytes instead of production caches", async t => {
  const { file, content, request } = await fixture(t, false);
  const first = await request("/", { "Accept-Encoding": "br" });
  assert.equal(first.headers["cache-control"], "no-store");
  assert.equal(first.headers.etag, undefined); assert.equal(first.headers["content-encoding"], undefined);
  assert.deepEqual(first.body, content);
  await fs.writeFile(file, "updated");
  assert.equal((await request("/")).body.toString(), "updated");
});

test("production routes preserve fresh HTML, binary assets, errors, redirects and path protection", async t => {
  const request = await listen(createServer({ production: true }), t);
  const html = await request("/play", { "Accept-Encoding": "br" });
  assert.equal(html.status, 200); assert.equal(html.headers["cache-control"], "no-store");
  assert.equal(html.headers["x-robots-tag"], "noindex,follow");
  assert.match(zlib.brotliDecompressSync(html.body).toString(), /<!doctype html>/i);
  const image = await request("/assets/misc/favicon.webp", { "Accept-Encoding": "br" });
  assert.equal(image.status, 200); assert.equal(image.headers["content-encoding"], undefined);
  assert.equal(image.headers["content-type"], "image/webp");
  const asset = await request("/public/app.js", { "Accept-Encoding": "br" });
  assert.equal(asset.status, 200);
  assert.deepEqual(zlib.brotliDecompressSync(asset.body), await fs.readFile(path.join(__dirname, "../game/public/app.js")));
  for (const url of ["/public/no-such-file.js", "/assets/.private", "/site/router.cjs", "/public/../../scripts/start-web.cjs"]) {
    const error = await request(url); assert.equal(error.status, 404); assert.equal(error.headers["cache-control"], "no-store");
  }
  assert.equal((await request("/play/")).status, 308);
  assert.equal((await request("/public/app.js", {}, "POST")).status, 405);
  assert.equal((await request("/public/app.js", { "Accept-Encoding": "identity;q=0, br;q=0, gzip;q=0" })).status, 406);
});

test("cave playtest is opt-in, unavailable in production, and isolates every save channel", async t => {
  for (const options of [{ production: false }, { production: true, debugTools: true }]) {
    const request = await listen(createServer(options), t);
    for (const url of ["/.cave-behavior-audit.html", "/public/cave-behavior-audit.js"]) {
      assert.equal((await request(url)).status, 404);
    }
  }
  const request = await listen(createServer({ production: false, debugTools: true }), t);
  const html = await request("/.cave-behavior-audit.html");
  assert.equal(html.status, 200);
  assert.match(html.body.toString(), /script\.src = "\/public\/cave-behavior-audit\.js"/);
  const script = await request("/public/cave-behavior-audit.js");
  assert.equal(script.status, 200);
  assert.equal(script.headers["cache-control"], "no-store");
  assert.match(script.body.toString(), /^getDesktopBridge = \(\) => null; loadState = \(\) => null; saveState = \(\) => \{\};/);
  assert.match(script.body.toString(), /initializeCloudSaveRuntime = async \(\) => \{ runtime\.cloudSession = null; runtime\.cloudWritesAllowed = false;/);
  assert.match(script.body.toString(), /Cave playtest · memory only/);
});
