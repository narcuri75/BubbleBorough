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
const PREVIEW_RENDER_VERSION = "layered-decor-v1";

function getCompanionType(name) {
  const lower = String(name || "").toLowerCase();
  if (/_color1\.[^.]+$/.test(lower)) return "color1";
  if (/_color2\.[^.]+$/.test(lower)) return "color2";
  if (/_color3\.[^.]+$/.test(lower)) return "color3";
  if (/_bg\.[^.]+$/.test(lower)) return "bg";
  if (/_mask\.[^.]+$/.test(lower)) return "mask";
  if (/_light\.[^.]+$/.test(lower)) return "light";
  if (/_mid\.[^.]+$/.test(lower)) return "mid";
  if (/_(?:triggers|trigger|seats|seat)\.[^.]+$/.test(lower)) return "utility";
  return "base";
}

function getBaseKey(name) {
  return String(name || "").toLowerCase()
    .replace(/_color[123](?=\.[^.]+$)/, "")
    .replace(/_(?:triggers|trigger|seats|seat)(?=\.[^.]+$)/, "")
    .replace(/_(?:bg|mask|light|mid)(?=\.[^.]+$)/, "")
    .replace(/_cave(?=\.[^.]+$)/, "");
}

async function renderPreview(layerNames) {
  const layers = await Promise.all(layerNames.map(name => sharp(path.join(sourceDir, name))
    .resize({
      width: 256,
      height: 256,
      fit: "contain",
      position: "bottom",
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer()));
  return sharp({
    create: {
      width: 256,
      height: 256,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  }).composite(layers.map(input => ({ input, blend: "over" })))
    .webp({ quality: 82, alphaQuality: 100, effort: 4 })
    .toBuffer();
}

async function run() {
  const sources = fs.readdirSync(sourceDir).filter(name => /\.png$/i.test(name)).sort();
  const previous = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : {};
  const next = {};
  const groups = new Map();
  for (const name of sources) {
    const baseKey = getBaseKey(name);
    if (!groups.has(baseKey)) groups.set(baseKey, {});
    groups.get(baseKey)[getCompanionType(name)] = name;
  }
  if (!checkOnly) fs.mkdirSync(outputDir, { recursive: true });
  const expectedOutputs = new Set(sources.map(name => `${name}.webp`));
  const obsoleteOutputs = fs.existsSync(outputDir)
    ? fs.readdirSync(outputDir).filter(name => /\.webp$/i.test(name) && !expectedOutputs.has(name))
    : [];
  if (checkOnly && obsoleteOutputs.length) {
    throw new Error(`Obsolete decor previews: ${obsoleteOutputs.join(", ")}. Run npm run build:app.`);
  }
  for (const name of sources) {
    const group = groups.get(getBaseKey(name)) || {};
    const layerNames = getCompanionType(name) === "base"
      ? [group.bg, group.base, group.color2, group.color3].filter(Boolean)
      : [name];
    const layerSources = layerNames.map(layerName => fs.readFileSync(path.join(sourceDir, layerName)));
    const sourceHash = hash(Buffer.concat([Buffer.from(PREVIEW_RENDER_VERSION), ...layerSources]));
    const outputName = `${name}.webp`;
    const outputPath = path.join(outputDir, outputName);
    const outputExists = fs.existsSync(outputPath);
    const outputHash = outputExists ? hash(fs.readFileSync(outputPath)) : "";
    if (previous[name]?.sourceHash === sourceHash && previous[name]?.outputHash === outputHash) {
      next[name] = previous[name];
      continue;
    }
    if (checkOnly) throw new Error(`Missing or stale decor preview for ${name}. Run npm run build:app.`);
    const preview = await renderPreview(layerNames);
    fs.writeFileSync(outputPath, preview);
    next[name] = { sourceHash, outputHash: hash(preview) };
  }
  if (!checkOnly) {
    for (const name of obsoleteOutputs) fs.unlinkSync(path.join(outputDir, name));
    fs.writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`);
  }
  console.log(`Loose decor previews: ${sources.length} checked.`);
}

run().catch(error => { console.error(error.message); process.exitCode = 1; });
