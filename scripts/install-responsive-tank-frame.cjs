#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const indexPath = path.join(projectRoot, "index.html");
const scriptRelativePath = "public/tank-physical-frame.js";
const scriptTag = `<script defer src="${scriptRelativePath}?v=20260925-responsive-physical-frame"></script>`;

function fail(message) {
  console.error(`[tank-frame] ${message}`);
  process.exitCode = 1;
}

if (!fs.existsSync(indexPath)) {
  fail(`Could not find ${indexPath}. Run this from the Bubble Borough project root.`);
  return;
}

const frameScriptPath = path.join(projectRoot, "public", "tank-physical-frame.js");
const requiredAssets = [
  "top-bottom.webp",
  "top-bottom.json",
  "left-right.webp",
  "left-right.json",
  "corners.webp",
  "corners.json"
].map((name) => path.join(projectRoot, "assets", "tank-frame", name));

const missing = [frameScriptPath, ...requiredAssets].filter((filePath) => !fs.existsSync(filePath));
if (missing.length) {
  fail(`Missing responsive frame files:\n${missing.map((filePath) => `  ${path.relative(projectRoot, filePath)}`).join("\n")}`);
  return;
}

const source = fs.readFileSync(indexPath, "utf8");
if (/tank-physical-frame\.js(?:[?"'])/i.test(source)) {
  console.log("[tank-frame] index.html already loads the responsive physical frame. No change needed.");
  return;
}

const bodyCloseIndex = source.toLowerCase().lastIndexOf("</body>");
if (bodyCloseIndex < 0) {
  fail("Could not find </body> in index.html. Nothing was changed.");
  return;
}

const eol = source.includes("\r\n") ? "\r\n" : "\n";
const insertion = `  ${scriptTag}${eol}`;
const updated = source.slice(0, bodyCloseIndex) + insertion + source.slice(bodyCloseIndex);

fs.writeFileSync(indexPath, updated, "utf8");
console.log("[tank-frame] Added the responsive physical tank frame loader to the current index.html.");
console.log("[tank-frame] Existing index.html content and cache-version strings were preserved.");
