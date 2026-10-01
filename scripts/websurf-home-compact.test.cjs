"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const management = fs.readFileSync(path.join(root, "public/app-src/ui/management-and-overlays.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "public/styles.css"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

function functionSource(name) {
  const start = management.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} should exist`);
  const next = management.indexOf("\nfunction ", start + 1);
  return management.slice(start, next === -1 ? management.length : next);
}

test("WebSurf Home is a compact utility-first dashboard", () => {
  const source = functionSource("renderWebSurfHomePage");

  assert.match(source, /websurf-home-dashboard-header/);
  assert.match(source, /WEBSURF\.SWIM[\s\S]*Welcome, \$\{escapeHtml\(username\)\}[\s\S]*@WebSurf\.swim/);
  assert.doesNotMatch(source, /tagline|hero/i);

  assert.match(source, /websurf-utility-section[\s\S]*>Favorites</);
  assert.match(source, /websurf-recent-section[\s\S]*Recent Pages[\s\S]*Clear History/);
  assert.match(source, /websurf-dashboard-grid[\s\S]*<section class="websurf-inbox"[\s\S]*<div class="websurf-mail-list">\$\{mailMarkup\}<\/div>[\s\S]*<footer class="websurf-status-bar"/);
  assert.match(source, /WebSurf 1\.4 · Secure[\s\S]*Mail storage/);
});

test("WebSurf Home compact layout uses theme variables and gives Inbox remaining height", () => {
  assert.match(styles, /#webHomePage:not\(\[hidden\]\)\s*\{[\s\S]*display:\s*flex;[\s\S]*overflow:\s*hidden;[\s\S]*background:\s*var\(--ws-page-bg\);/);
  assert.match(styles, /\.websurf-home-dashboard-main\s*\{[\s\S]*flex:\s*1 1 auto;[\s\S]*min-height:\s*0;[\s\S]*overflow:\s*hidden;/);
  assert.match(styles, /\.websurf-utility-section\s*\{[\s\S]*min-height:\s*38px;/);
  assert.match(styles, /\.websurf-home-dashboard-main \.websurf-bookmark\s*\{[\s\S]*width:\s*max-content;[\s\S]*min-height:\s*34px;[\s\S]*box-shadow:\s*none;/);
  assert.match(styles, /\.websurf-home-dashboard-main \.websurf-dashboard-grid\s*\{[\s\S]*flex:\s*1 1 280px;[\s\S]*min-height:\s*0;/);
  assert.match(styles, /\.websurf-home-dashboard-main \.websurf-inbox\s*\{[\s\S]*display:\s*flex;[\s\S]*flex-direction:\s*column;[\s\S]*min-height:\s*0;[\s\S]*box-shadow:\s*none;/);
  assert.match(styles, /\.websurf-home-dashboard-main \.websurf-mail-list\s*\{[\s\S]*flex:\s*1 1 auto;[\s\S]*overflow-y:\s*auto;/);
  assert.match(styles, /\.websurf-home-dashboard-main \.websurf-status-bar\s*\{[\s\S]*border:\s*0;[\s\S]*border-top:\s*1px solid var\(--ws-border-soft\);[\s\S]*background:\s*var\(--ws-panel-soft\);[\s\S]*box-shadow:\s*none;/);
});

test("WebSurf Home CSS cache key is bumped for the Phase 9 redesign", () => {
  assert.match(html, /public\/styles\.css\?v=20260930-websurf-home-compact/);
});
