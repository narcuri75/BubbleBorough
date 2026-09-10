"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { buildDefinitions } = require("./generate-sprite-sheets.cjs");
const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "assets/generated/sprites/delivery-manifest.json");
const hash = buffer => crypto.createHash("sha256").update(buffer).digest("hex");
// Increment delivery.version in generate-sprite-sheets.cjs when changing presets.
const PREVIEW_SIZE = 384;

async function generateDelivery(checkOnly = false) {
  const sheets = buildDefinitions();
  const previous = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : { sheets: {} };
  const manifest = { version: 1, previewSize: PREVIEW_SIZE, sheets: {} };
  let sharp;
  let generated = 0;
  for (const sheet of sheets) {
    const outputs = Object.keys(sheet.frames).flatMap(name => [
      `${sheet.delivery.root}/${name}.thumb.webp`,
      ...(sheet.delivery.standalone ? [`${sheet.delivery.root}/${name}.webp`] : [])
    ]);
    const old = previous.sheets[sheet.path];
    const valid = old?.version === sheet.delivery.version
      && outputs.every(file => fs.existsSync(path.join(root, file)) && hash(fs.readFileSync(path.join(root, file))) === old.files[file]);
    if (valid) { manifest.sheets[sheet.path] = old; continue; }
    if (checkOnly) throw new Error(`Stale or missing delivery images for ${sheet.path}. Run npm run build:app.`);
    sharp ||= require("sharp");
    sharp.cache(false);
    sharp.concurrency(2);
    fs.mkdirSync(path.join(root, sheet.delivery.root), { recursive: true });
    // Decode once per sheet. Preserve the master's exact alpha in full-size art.
    const { data, info } = await sharp(path.join(root, sheet.path)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const entry = { version: sheet.delivery.version, files: {} };
    for (const [name, [left, top, width, height]] of Object.entries(sheet.frames)) {
      const frame = () => sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } }).extract({ left, top, width, height });
      const preview = await frame().resize({ width: PREVIEW_SIZE, height: PREVIEW_SIZE, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82, alphaQuality: 100, effort: 4 }).toBuffer();
      const previewPath = `${sheet.delivery.root}/${name}.thumb.webp`;
      fs.writeFileSync(path.join(root, previewPath), preview);
      entry.files[previewPath] = hash(preview);
      if (sheet.delivery.standalone) {
        const full = await frame().webp({ lossless: true, effort: 4 }).toBuffer();
        const fullPath = `${sheet.delivery.root}/${name}.webp`;
        fs.writeFileSync(path.join(root, fullPath), full);
        entry.files[fullPath] = hash(full);
      }
    }
    manifest.sheets[sheet.path] = entry;
    generated += 1;
  }
  if (!checkOnly) fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Sprite delivery: ${sheets.length} sheets checked; ${generated} regenerated.`);
}

if (require.main === module) generateDelivery(process.argv.includes("--check")).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { generateDelivery };
