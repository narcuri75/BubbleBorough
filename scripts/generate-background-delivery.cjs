"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const sourceDir = path.join(root, "assets", "backgrounds");
const outputDir = path.join(root, "assets", "generated", "backgrounds");
const manifestPath = path.join(outputDir, "manifest.json");
const checkOnly = process.argv.includes("--check");
const renderVersion = "background-webp-v1-q82";
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");

async function run() {
  const sources = fs.readdirSync(sourceDir).filter((name) => /\.png$/i.test(name)).sort();
  const previous = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : {};
  const next = {};
  const expected = new Set(sources.map((name) => `${name}.webp`));
  const obsolete = fs.existsSync(outputDir)
    ? fs.readdirSync(outputDir).filter((name) => /\.webp$/i.test(name) && !expected.has(name))
    : [];

  if (checkOnly && obsolete.length) {
    throw new Error(`Obsolete background delivery files: ${obsolete.join(", ")}. Run npm run build:app.`);
  }
  if (!checkOnly) fs.mkdirSync(outputDir, { recursive: true });

  for (const name of sources) {
    const source = fs.readFileSync(path.join(sourceDir, name));
    const sourceHash = hash(Buffer.concat([Buffer.from(renderVersion), source]));
    const outputName = `${name}.webp`;
    const outputPath = path.join(outputDir, outputName);
    const outputExists = fs.existsSync(outputPath);
    const outputHash = outputExists ? hash(fs.readFileSync(outputPath)) : "";
    if (previous[name]?.sourceHash === sourceHash && previous[name]?.outputHash === outputHash) {
      next[name] = previous[name];
      continue;
    }
    if (checkOnly) throw new Error(`Missing or stale background delivery for ${name}. Run npm run build:app.`);
    const encoded = await sharp(source)
      .webp({ quality: 82, alphaQuality: 100, effort: 4, smartSubsample: true })
      .toBuffer();
    fs.writeFileSync(outputPath, encoded);
    next[name] = { sourceHash, outputHash: hash(encoded) };
  }

  if (!checkOnly) {
    for (const name of obsolete) fs.unlinkSync(path.join(outputDir, name));
    fs.writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`);
  }
  console.log(`Background delivery: ${sources.length} checked.`);
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
