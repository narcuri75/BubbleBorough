"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { buildDefinitions } = require("./generate-sprite-sheets.cjs");

const root = path.resolve(__dirname, "..", "game");
const projectRoot = path.dirname(root);
const allowedExtensions = new Set([".cjs", ".css", ".html", ".js", ".json", ".md", ".webmanifest"]);
// Retired standalone code has no imports or document entry point. Keep it
// untouched; it does not describe the assets used by the current game.
const retiredFiles = new Set(["grime-test-app.js", "zombie_skeleton_behaviors.js"].map(file => path.join(root, "public", file)));
const scanRoots = [
  path.join(root, "index.html"),
  path.join(root, "mobile.html"),
  path.join(root, "public"),
  path.join(root, "assets"),
  path.join(projectRoot, "website"),
  path.join(projectRoot, "index.html"),
  path.join(projectRoot, "404.html")
];

function listTextFiles(target) {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return allowedExtensions.has(path.extname(target).toLowerCase()) && !retiredFiles.has(target) ? [target] : [];
  return fs.readdirSync(target, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "generated") return [];
    return listTextFiles(path.join(target, entry.name));
  });
}

function normalizeAssetPath(value) {
  let normalized = String(value || "").replace(/^https:\/\/bubbleborough\.com\//i, "").replace(/\\/g, "/").replace(/^(?:\.\.\/|\.\/)+/, "").replace(/^\/?(?:game\/)?(?=assets\/)/, "");
  normalized = normalized.split(/[?#]/, 1)[0];
  try { normalized = decodeURIComponent(normalized); } catch { /* Report the literal path below. */ }
  return normalized;
}

const virtualAssets = new Set();
for (const sheet of buildDefinitions()) {
  const directory = sheet.path.slice(0, sheet.path.lastIndexOf("/") + 1);
  for (const name of Object.keys(sheet.frames || {})) virtualAssets.add(`${directory}${name}`.toLowerCase());
  for (const name of Object.keys(sheet.aliases || {})) virtualAssets.add(`${directory}${name}`.toLowerCase());
}

const directoryEntries = new Map();
function physicalAssetExists(assetPath) {
  let directory = root;
  for (const part of assetPath.split("/")) {
    if (!directoryEntries.has(directory)) {
      directoryEntries.set(directory, fs.existsSync(directory) && fs.statSync(directory).isDirectory() ? new Set(fs.readdirSync(directory)) : new Set());
    }
    if (!directoryEntries.get(directory).has(part)) return false;
    directory = path.join(directory, part);
  }
  return fs.statSync(directory).isFile();
}

function assetExists(assetPath) {
  return physicalAssetExists(assetPath) || virtualAssets.has(assetPath.toLowerCase());
}

const missing = [];
const checked = new Set();
// Include absolute website URLs and unquoted CSS url() values. Logical PNG
// sprite names are valid in game code, but website images need physical files.
const literalPattern = /(?:https:\/\/bubbleborough\.com\/|\/?(?:\.\.\/|\.\/)*(?:game\/)?)assets\/[^\s"'`<>()[\]{}]+?\.(?:avif|gif|jpe?g|json|mp3|ogg|png|svg|wav|webmanifest|webp)(?:[?#][^\s"'`<>()]*)?(?=[\s"'`<>()]|$)/gi;
const sources = [...new Set(scanRoots.flatMap(listTextFiles))].map(file => ({ file, source: fs.readFileSync(file, "utf8") }));
const website = require("../website/router.cjs");
for (const route of website.routes.keys()) {
  sources.push({ file: path.join(projectRoot, "website", `rendered:${route}`), source: website.render(route) });
}
for (const { file, source } of sources) {
  for (const match of source.matchAll(literalPattern)) {
    const value = match[0];
    if (value.includes("${") || value.includes("{{")) continue;
    const assetPath = normalizeAssetPath(value);
    const key = `${file}\0${assetPath}`;
    if (checked.has(key)) continue;
    checked.add(key);
    const isWebsite = !file.startsWith(root + path.sep);
    const prefix = source.slice(Math.max(0, match.index - 160), match.index);
    const directImage = /\.html$/.test(file) && /(?:\ssrc\s*=\s*["']|url\(\s*["']?)$/.test(prefix);
    const cssUrl = /\.css$/.test(file) && /url\(\s*["']?$/.test(prefix);
    if (!(isWebsite || directImage || cssUrl ? physicalAssetExists(assetPath) : assetExists(assetPath))) {
      const line = source.slice(0, match.index).split(/\r?\n/).length;
      missing.push({ file: path.relative(root, file), line, assetPath });
    }
  }
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, "assets", "asset-manifest.json"), "utf8"));
for (const [section, entries] of Object.entries(manifest)) {
  for (const entry of Array.isArray(entries) ? entries : []) {
    if (!entry?.path) continue;
    const assetPath = normalizeAssetPath(entry.path);
    if (!assetExists(assetPath)) missing.push({ file: "assets/asset-manifest.json", line: 0, assetPath, section, key: entry.key });
  }
}

if (missing.length) {
  console.error(JSON.stringify({ checkedReferences: checked.size, missing }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ checkedReferences: checked.size, missing: 0, virtualSpriteAssets: virtualAssets.size }, null, 2));
}
