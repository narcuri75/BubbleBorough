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

async function run() {
  const sources = fs.readdirSync(sourceDir).filter(name => /\.png$/i.test(name)).sort();
  const previous = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : {};
  const next = {};
  if (!checkOnly) fs.mkdirSync(outputDir, { recursive: true });
  const expectedOutputs = new Set(sources.map(name => `${name}.webp`));
  const obsoleteOutputs = fs.existsSync(outputDir)
    ? fs.readdirSync(outputDir).filter(name => /\.webp$/i.test(name) && !expectedOutputs.has(name))
    : [];
  if (checkOnly && obsoleteOutputs.length) {
    throw new Error(`Obsolete decor previews: ${obsoleteOutputs.join(", ")}. Run npm run build:app.`);
  }
  for (const name of sources) {
    const source = fs.readFileSync(path.join(sourceDir, name));
    const sourceHash = hash(source);
    const outputName = `${name}.webp`;
    const outputPath = path.join(outputDir, outputName);
    const outputExists = fs.existsSync(outputPath);
    const outputHash = outputExists ? hash(fs.readFileSync(outputPath)) : "";
    if (previous[name]?.sourceHash === sourceHash && previous[name]?.outputHash === outputHash) {
      next[name] = previous[name];
      continue;
    }
    if (checkOnly) throw new Error(`Missing or stale decor preview for ${name}. Run npm run build:app.`);
    const preview = await sharp(source).resize({ width: 256, height: 256, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, alphaQuality: 100, effort: 4 }).toBuffer();
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
