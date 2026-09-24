"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const sourceWebp = path.join(root, "assets/web/proteus/dna_fish/zombie_fish.webp");
const sourceJson = path.join(root, "assets/web/proteus/dna_fish/zombie_fish.json");
const outputWebp = path.join(root, "assets/web/proteus/dna_fish/small_fish/zombie_fish.webp");
const outputJson = path.join(root, "assets/web/proteus/dna_fish/small_fish/zombie_fish.json");
const LONGEST_SIDE = 64;

const hashBuffer = value => crypto.createHash("sha256").update(value).digest("hex");
const hashFile = file => hashBuffer(fs.readFileSync(file));

function getEditorGrid(data) {
  if (data?.version !== 2 || !Array.isArray(data.layers) || data.layers.length !== 1 || !data.layers[0]?.visible || data.negativeSpacingEnabled) {
    throw new Error("assets/web/proteus/dna_fish/zombie_fish.json is not a supported single-layer sprite editor export.");
  }
  const sprites = data.layers[0].sprites;
  if (!Array.isArray(sprites) || !sprites.length || !Number.isInteger(data.columns) || data.columns < 1) {
    throw new Error("assets/web/proteus/dna_fish/zombie_fish.json has an invalid sprite grid.");
  }
  const cellWidth = data.manualCellSizeEnabled ? Number(data.manualCellWidth) : Math.max(...sprites.map(sprite => Number(sprite.width) || 0));
  const cellHeight = data.manualCellSizeEnabled ? Number(data.manualCellHeight) : Math.max(...sprites.map(sprite => Number(sprite.height) || 0));
  if (!(cellWidth > 0 && cellHeight > 0)) throw new Error("assets/web/proteus/dna_fish/zombie_fish.json has invalid cell dimensions.");
  return { sprites, cellWidth, cellHeight, rows: Math.ceil(sprites.length / data.columns) };
}

function buildSmallJson(data, sourceWebpHash, sourceJsonHash, outputWebpHash, scale) {
  const next = structuredClone(data);
  next.layers[0].sprites = next.layers[0].sprites.map(sprite => ({
    ...sprite,
    width: Math.max(1, Math.round(Number(sprite.width) * scale)),
    height: Math.max(1, Math.round(Number(sprite.height) * scale)),
    x: Math.max(0, Math.round(Number(sprite.x || 0) * scale)),
    y: Math.max(0, Math.round(Number(sprite.y || 0) * scale))
  }));
  if (next.manualCellSizeEnabled) {
    next.manualCellWidth = Math.max(1, Math.round(Number(next.manualCellWidth) * scale));
    next.manualCellHeight = Math.max(1, Math.round(Number(next.manualCellHeight) * scale));
  }
  next.smallFishGeneration = {
    longestSide: LONGEST_SIDE,
    sourceWebpSha256: sourceWebpHash,
    sourceJsonSha256: sourceJsonHash,
    outputWebpSha256: outputWebpHash
  };
  return next;
}

function removeIfPresent(file) {
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

async function generate(checkOnly = false) {
  const hasWebp = fs.existsSync(sourceWebp);
  const hasJson = fs.existsSync(sourceJson);
  if (hasWebp !== hasJson) {
    throw new Error("Proteus Z-01 source art is incomplete: assets/web/proteus/dna_fish/zombie_fish.webp and assets/web/proteus/dna_fish/zombie_fish.json must be added together.");
  }
  if (!hasWebp) {
    const stale = [outputWebp, outputJson].filter(fs.existsSync);
    if (checkOnly && stale.length) throw new Error("Stale Proteus Z-01 compact atlas exists while the optional source art is absent. Run npm run build:app.");
    if (!checkOnly) stale.forEach(removeIfPresent);
    console.log("Proteus Z-01 compact atlas: optional source art absent.");
    return { present: false, generated: false };
  }

  const sourceWebpHash = hashFile(sourceWebp);
  const sourceJsonBytes = fs.readFileSync(sourceJson);
  const sourceJsonHash = hashBuffer(sourceJsonBytes);
  const data = JSON.parse(sourceJsonBytes.toString("utf8"));
  const { cellWidth, cellHeight, rows } = getEditorGrid(data);
  const scale = LONGEST_SIDE / Math.max(cellWidth, cellHeight);
  const targetCellWidth = Math.max(1, Math.round(cellWidth * scale));
  const targetCellHeight = Math.max(1, Math.round(cellHeight * scale));
  const targetWidth = targetCellWidth * data.columns;
  const targetHeight = targetCellHeight * rows;

  const isCurrent = () => {
    if (![outputWebp, outputJson].every(fs.existsSync)) return false;
    let metadata;
    try { metadata = JSON.parse(fs.readFileSync(outputJson, "utf8")); } catch { return false; }
    const generation = metadata?.smallFishGeneration;
    return generation?.longestSide === LONGEST_SIDE
      && generation?.sourceWebpSha256 === sourceWebpHash
      && generation?.sourceJsonSha256 === sourceJsonHash
      && generation?.outputWebpSha256 === hashFile(outputWebp);
  };

  if (isCurrent()) {
    console.log("Proteus Z-01 compact atlas: current.");
    return { present: true, generated: false };
  }
  if (checkOnly) throw new Error("Proteus Z-01 compact atlas is stale or missing. Run npm run build:app.");

  fs.mkdirSync(path.dirname(outputWebp), { recursive: true });
  const output = await sharp(sourceWebp)
    .resize({ width: targetWidth, height: targetHeight, fit: "fill", kernel: sharp.kernel.lanczos3 })
    .webp({ lossless: true, effort: 4 })
    .toBuffer();
  fs.writeFileSync(outputWebp, output);
  const outputWebpHash = hashBuffer(output);
  const smallJson = buildSmallJson(data, sourceWebpHash, sourceJsonHash, outputWebpHash, scale);
  fs.writeFileSync(outputJson, `${JSON.stringify(smallJson, null, 2)}\n`);
  console.log(`Proteus Z-01 compact atlas: generated ${targetWidth}x${targetHeight} with ${data.layers[0].sprites.length} frames.`);
  return { present: true, generated: true };
}

if (require.main === module) {
  generate(process.argv.includes("--check")).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
module.exports = { generate };
