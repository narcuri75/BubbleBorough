"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { once } = require("node:events");
const { buildOutputs, renderPage } = require("./build-website.cjs");
const { createServer } = require("./start-web.cjs");
const config = require("../website/pages.json");
const root = path.resolve(__dirname, "..");

test("auth redirects and callback cleanup preserve the /play/ entry", () => {
  const vm = require("node:vm");
  const context = vm.createContext({
    URL, URLSearchParams,
    document: { title: "Play Bubble Borough" },
    window: { location: new URL("https://bubbleborough.com/play/?keep=1&auth=recovery#access_token=test"),
      history: { replaceState(_state, _title, url) { context.window.location = new URL(url, context.window.location); } } }
  });
  vm.runInContext(fs.readFileSync(path.join(root, "public/app-src/core/cloud-save.js"), "utf8"), context);
  for (const action of ["signup-confirmed", "email-changed", "recovery"]) {
    assert.equal(context.getCloudAuthRedirectUrl(action), `https://bubbleborough.com/play/?auth=${action}`);
  }
  context.clearCloudAuthCallbackUrl();
  assert.equal(context.window.location.href, "https://bubbleborough.com/play/?keep=1");
});

test("unfinished public pages are crawlable HTML without game dependencies or fake media", () => {
  const outputs = buildOutputs();
  for (const page of [config.homepage, ...config.pages]) {
    const html = outputs.get(`${page.path.slice(1)}index.html`);
    assert.match(html, /name="robots" content="noindex,follow"/);
    assert.match(html, new RegExp(`<h1[^>]*>${page.title}</h1>`));
    assert.doesNotMatch(html, /<script|<img|<video|app\.js|rel="canonical"/);
    assert.match(html, /href="\/play\/"/);
    for (const unfinished of config.pages) assert.ok(!html.includes(`href="${unfinished.path}"`));
  }
  assert.doesNotMatch(outputs.get("robots.txt"), /Disallow/);
  const locations = [...outputs.get("sitemap.xml").matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  assert.deepEqual(locations, ["https://bubbleborough.com/"]);
  assert.throws(() => renderPage({ path: "/fish/", title: "Fish", ready: true }), /launch review/);
});

test("game alias preserves game body, resource base and installed-app identity", () => {
  const outputs = buildOutputs();
  const original = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const game = outputs.get("play/index.html");
  assert.equal(game.slice(game.indexOf("<body>")), original.slice(original.indexOf("<body>")));
  assert.match(game, /<base href="\/">/);
  assert.match(game, /content="noindex,follow"/);
  assert.match(game, /href="https:\/\/bubbleborough.com\/play\/"/);
  assert.equal(new URL("assets/asset-manifest.json", new URL("/", "https://bubbleborough.com/play/")).pathname, "/assets/asset-manifest.json");
  const manifest = JSON.parse(outputs.get("public/play.webmanifest"));
  assert.equal(manifest.id, "/");
  assert.equal(manifest.start_url, "/play/");
  assert.equal(manifest.scope, "/");
  assert.ok(!outputs.has("index.html"), "preparation must never overwrite the live root");
  assert.ok(!outputs.has("mobile.html"));
});

test("HTTP direct entries, slash normalization, refreshes, assets and real 404s", async t => {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  for (const route of ["/play/", config.homepage.path, ...config.pages.map(page => page.path)]) {
    const redirect = await fetch(origin + route.slice(0, -1) + "?auth=recovery", { redirect: "manual" });
    assert.equal(redirect.status, 308);
    assert.equal(redirect.headers.get("location"), route + "?auth=recovery");
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetch(origin + route);
      assert.equal(response.status, 200);
      assert.match(await response.text(), /noindex,follow/);
    }
  }
  const rootResponse = await fetch(origin + "/");
  assert.equal(await rootResponse.text(), fs.readFileSync(path.join(root, "index.html"), "utf8"));
  for (const asset of ["/public/website.css", "/public/app.js", "/public/play.webmanifest", "/assets/asset-manifest.json", "/mobile.html"]) {
    const response = await fetch(origin + asset);
    assert.equal(response.status, 200, asset);
    await response.arrayBuffer();
  }
  for (const route of ["/nonexistent", "/fish/nonexistent/", "/news/fake-article"]) {
    const response = await fetch(origin + route);
    assert.equal(response.status, 404);
    assert.match(await response.text(), /Page not found/);
  }
  assert.equal((await fetch(origin + "/%E0%A4%A")).status, 400);
});
