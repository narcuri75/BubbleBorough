"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const sourceDir = path.join(root, "assets", "decor");
const outputDir = path.join(root, "assets", "generated", "previews", "decor");
const manifestPath = path.join(outputDir, "manifest.json");
const checkOnly = process.argv.includes("--check");
const hash = value => crypto.createHash("sha256").update(value).digest("hex");
const PREVIEW_RENDER_VERSION = "layered-decor-v2-nested";

function walkPngs(directory, relative = "") {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const relativePath = relative ? path.posix.join(relative, entry.name) : entry.name;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...walkPngs(fullPath, relativePath));
    else if (entry.isFile() && /\.png$/i.test(entry.name)) result.push(relativePath);
  }
  return result.sort();
}

function getCompanionType(relativePath) {
  const lower = path.posix.basename(String(relativePath || "")).toLowerCase();
  const stem = lower.replace(/\.[^.]+$/, "");
  const tokens = stem.split("__").slice(2);
  if (tokens.includes("color1")) return "color1";
  if (tokens.includes("color2")) return "color2";
  if (tokens.includes("color3")) return "color3";
  if (tokens.includes("bg")) return "bg";
  if (tokens.includes("mask")) return "mask";
  if (tokens.includes("light")) return "light";
  if (tokens.includes("mid")) return "mid";
  if (tokens.includes("trigger") || tokens.includes("triggers") || tokens.includes("seat") || tokens.includes("seats")) return "utility";
  if (tokens.includes("trypophobia")) return "special";
  return "base";
}

function getBaseKey(relativePath) {
  const directory = path.posix.dirname(relativePath);
  const name = path.posix.basename(relativePath);
  const extension = path.posix.extname(name);
  const stem = name.slice(0, -extension.length);
  if (!stem.includes("__")) return path.posix.join(directory, name.toLowerCase());
  const removable = new Set(["front", "bg", "mask", "light", "mid", "trypophobia", "color1", "color2", "color3", "trigger", "triggers", "seat", "seats"]);
  const parts = stem.split("__").filter((part, index) => index < 2 || !removable.has(part.toLowerCase()));
  return path.posix.join(directory, `${parts.join("__")}${extension}`.toLowerCase());
}

async function renderPreview(layerNames) {
  const layers = await Promise.all(layerNames.map(name => sharp(path.join(sourceDir, ...name.split("/")))
    .resize({ width: 256, height: 256, fit: "contain", position: "bottom", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer()));
  return sharp({ create: { width: 256, height: 256, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(layers.map(input => ({ input, blend: "over" })))
    .webp({ quality: 82, alphaQuality: 100, effort: 4 }).toBuffer();
}

function walkWebps(directory, relative = "") {
  if (!fs.existsSync(directory)) return [];
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const relativePath = relative ? path.posix.join(relative, entry.name) : entry.name;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...walkWebps(fullPath, relativePath));
    else if (entry.isFile() && /\.webp$/i.test(entry.name)) result.push(relativePath);
  }
  return result;
}

function pruneEmptyDirectories(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const fullPath = path.join(directory, entry.name);
    pruneEmptyDirectories(fullPath);
    if (!fs.readdirSync(fullPath).length) fs.rmdirSync(fullPath);
  }
}

async function run() {
  const sources = walkPngs(sourceDir);
  const previous = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : {};
  const next = {};
  const groups = new Map();
  for (const relativePath of sources) {
    const baseKey = getBaseKey(relativePath);
    if (!groups.has(baseKey)) groups.set(baseKey, {});
    const type = getCompanionType(relativePath);
    if (!groups.get(baseKey)[type] || type !== "special") groups.get(baseKey)[type] = relativePath;
  }
  if (!checkOnly) fs.mkdirSync(outputDir, { recursive: true });
  const expectedOutputs = new Set(sources.map(name => `${name}.webp`));
  const obsoleteOutputs = walkWebps(outputDir).filter(name => !expectedOutputs.has(name));
  if (checkOnly && obsoleteOutputs.length) throw new Error(`Obsolete decor previews: ${obsoleteOutputs.join(", ")}. Run npm run build:app.`);

  for (const relativePath of sources) {
    const group = groups.get(getBaseKey(relativePath)) || {};
    const layerNames = getCompanionType(relativePath) === "base"
      ? [group.bg, group.base, group.color2, group.color3].filter(Boolean)
      : [relativePath];
    const layerSources = layerNames.map(name => fs.readFileSync(path.join(sourceDir, ...name.split("/"))));
    const sourceHash = hash(Buffer.concat([Buffer.from(PREVIEW_RENDER_VERSION), ...layerSources]));
    const outputName = `${relativePath}.webp`;
    const outputPath = path.join(outputDir, ...outputName.split("/"));
    const outputExists = fs.existsSync(outputPath);
    const outputHash = outputExists ? hash(fs.readFileSync(outputPath)) : "";
    if (previous[relativePath]?.sourceHash === sourceHash && previous[relativePath]?.outputHash === outputHash) {
      next[relativePath] = previous[relativePath];
      continue;
    }
    if (checkOnly) throw new Error(`Missing or stale decor preview for ${relativePath}. Run npm run build:app.`);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    const preview = await renderPreview(layerNames);
    fs.writeFileSync(outputPath, preview);
    next[relativePath] = { sourceHash, outputHash: hash(preview) };
  }
  if (!checkOnly) {
    for (const relativePath of obsoleteOutputs) fs.unlinkSync(path.join(outputDir, ...relativePath.split("/")));
    pruneEmptyDirectories(outputDir);
    fs.writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`);
  }
  console.log(`Loose decor previews: ${sources.length} checked.`);
}

run().catch(error => { console.error(error.message); process.exitCode = 1; });
