"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { buildDefinitions } = require("./generate-sprite-sheets.cjs");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "assets", "asset-manifest.json");
const imagePattern = /\.(?:png|jpe?g|webp)$/i;
const hash = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex").slice(0, 12);

function walkImages(relativeDirectory) {
  const absoluteDirectory = path.join(root, "assets", ...relativeDirectory.split("/"));
  if (!fs.existsSync(absoluteDirectory)) return [];
  const result = [];
  const walk = (directory, relative) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const childRelative = relative ? path.posix.join(relative, entry.name) : entry.name;
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full, childRelative);
      else if (entry.isFile() && imagePattern.test(entry.name)) result.push({ name: entry.name, relative: childRelative, full });
    }
  };
  walk(absoluteDirectory, "");
  return result.sort((a, b) => a.relative.localeCompare(b.relative));
}

function directEntries(directory, physicalSheetPaths = new Set()) {
  const entries = walkImages(directory)
    .filter(item => !physicalSheetPaths.has(`assets/${directory}/${item.relative}`))
    .map(item => ({ key: item.name, path: `assets/${directory}/${item.relative}?v=${hash(item.full)}` }));
  const seen = new Map();
  for (const entry of entries) {
    if (seen.has(entry.key) && seen.get(entry.key) !== entry.path) throw new Error(`Duplicate manifest key ${entry.key}: ${seen.get(entry.key)} and ${entry.path}`);
    seen.set(entry.key, entry.path);
  }
  return entries;
}

function mergeLogical(entries, logical) {
  const map = new Map(entries.map(entry => [entry.key, entry]));
  for (const entry of logical) map.set(entry.key, entry);
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key) || a.path.localeCompare(b.path));
}

function run() {
  const sheets = buildDefinitions();
  const sheetPaths = new Set(sheets.map(sheet => sheet.path));
  const logicalByCategory = new Map();
  for (const sheet of sheets) {
    const parts = String(sheet.path || "").split("/");
    const category = parts[0] === "assets" ? parts[1] : "";
    if (!category) continue;
    if (!logicalByCategory.has(category)) logicalByCategory.set(category, []);
    const directory = sheet.path.slice(0, sheet.path.lastIndexOf("/") + 1);
    const logical = Object.keys(sheet.frames || {}).map((name) => ({
      key: name,
      path: `${directory}${name}?v=${sheet.version}`
    }));
    for (const [legacy, target] of Object.entries(sheet.aliases || {})) {
      logical.push({ key: legacy, path: `${directory}${target}?v=${sheet.version}` });
    }
    logicalByCategory.get(category).push(...logical);
  }

  const backgrounds = walkImages("backgrounds").map(item => {
    const generated = path.join(root, "assets", "generated", "backgrounds", `${item.name}.webp`);
    return { key: item.name, path: fs.existsSync(generated) ? `assets/generated/backgrounds/${item.name}.webp?v=${hash(generated)}` : `assets/backgrounds/${item.relative}?v=${hash(item.full)}` };
  });
  const manifest = {
    backgrounds,
    decor: directEntries("decor", sheetPaths),
    fish: mergeLogical(directEntries("fish", sheetPaths).filter(entry => !/_(?:zombie|skeleton)\.[^.]+(?:\?|$)/i.test(entry.key)), logicalByCategory.get("fish") || []),
    gravel: directEntries("gravel", sheetPaths),
    equipment: mergeLogical(directEntries("equipment", sheetPaths), logicalByCategory.get("equipment") || [])
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Asset manifest: backgrounds=${manifest.backgrounds.length}, decor=${manifest.decor.length}, fish=${manifest.fish.length}, gravel=${manifest.gravel.length}, equipment=${manifest.equipment.length}`);
}

if (require.main === module) run();
module.exports = { run };
