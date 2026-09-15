"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { buildDefinitions } = require("./generate-sprite-sheets.cjs");

const root = path.resolve(__dirname, "..");
const allowedExtensions = new Set([".cjs", ".css", ".html", ".js", ".json", ".md", ".webmanifest"]);
const scanRoots = [
  path.join(root, "index.html"),
  path.join(root, "mobile.html"),
  path.join(root, "public", "styles.css"),
  path.join(root, "public", "manifest.webmanifest"),
  path.join(root, "public", "app-src"),
  path.join(root, "assets")
];

function listTextFiles(target) {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return allowedExtensions.has(path.extname(target).toLowerCase()) ? [target] : [];
  return fs.readdirSync(target, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "generated") return [];
    return listTextFiles(path.join(target, entry.name));
  });
}

function normalizeAssetPath(value) {
  let normalized = String(value || "").replace(/\\/g, "/").replace(/^(?:\.\.\/|\.\/)+/, "");
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

function assetExists(assetPath) {
  return fs.existsSync(path.join(root, ...assetPath.split("/"))) || virtualAssets.has(assetPath.toLowerCase());
}

const missing = [];
const checked = new Set();
const literalPattern = /(["'`])((?:\.\.\/|\.\/)*assets\/[^"'`<>\r\n]+?\.(?:avif|gif|jpe?g|json|mp3|ogg|png|svg|wav|webmanifest|webp)(?:[?#][^"'`<>\r\n]*)?)\1/gi;
for (const file of [...new Set(scanRoots.flatMap(listTextFiles))]) {
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(literalPattern)) {
    if (match[2].includes("${") || match[2].includes("{{")) continue;
    const assetPath = normalizeAssetPath(match[2]);
    const key = `${file}\0${assetPath}`;
    if (checked.has(key)) continue;
    checked.add(key);
    if (!assetExists(assetPath)) {
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
