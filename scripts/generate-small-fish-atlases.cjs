"use strict";

const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const sourceDirectory = path.join(root, "assets", "fish");
const outputDirectory = path.join(sourceDirectory, "small_fish");
const LONGEST_SIDE = 64;

function getGrid(data) {
  const sprites = data?.layers?.[0]?.sprites;
  if (!Array.isArray(sprites) || !sprites.length || !Number.isInteger(data.columns) || data.columns < 1) {
    throw new Error("Invalid fish sprite metadata.");
  }
  const width = data.manualCellSizeEnabled ? Number(data.manualCellWidth) : Math.max(...sprites.map(sprite => Number(sprite.width) || 0));
  const height = data.manualCellSizeEnabled ? Number(data.manualCellHeight) : Math.max(...sprites.map(sprite => Number(sprite.height) || 0));
  if (!(width > 0 && height > 0)) throw new Error("Invalid fish sprite cell size.");
  return { sprites, width, height, rows: Math.ceil(sprites.length / data.columns) };
}

async function generate(checkOnly = false) {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const files = fs.readdirSync(sourceDirectory).filter(file => file.endsWith(".webp") && fs.existsSync(path.join(sourceDirectory, `${path.basename(file, ".webp")}.json`)));
  let generated = 0;
  for (const file of files) {
    const base = path.basename(file, ".webp");
    const metadata = JSON.parse(fs.readFileSync(path.join(sourceDirectory, `${base}.json`), "utf8"));
    const grid = getGrid(metadata);
    const scale = LONGEST_SIDE / Math.max(grid.width, grid.height);
    const targetCellWidth = Math.max(1, Math.round(grid.width * scale));
    const targetCellHeight = Math.max(1, Math.round(grid.height * scale));
    const targetWidth = targetCellWidth * metadata.columns;
    const targetHeight = targetCellHeight * grid.rows;
    const outputImage = path.join(outputDirectory, file);
    const outputMetadata = path.join(outputDirectory, `${base}.json`);
    if (checkOnly && (!fs.existsSync(outputImage) || !fs.existsSync(outputMetadata))) {
      throw new Error(`Missing compact fish atlas for ${file}. Run npm run build:app.`);
    }
    if (checkOnly) continue;
    await sharp(path.join(sourceDirectory, file)).resize({ width: targetWidth, height: targetHeight, fit: "fill", kernel: sharp.kernel.lanczos3 }).webp({ lossless: true, effort: 4 }).toFile(outputImage);
    const compact = structuredClone(metadata);
    compact.layers[0].sprites = grid.sprites.map(sprite => ({ ...sprite, x: Math.max(0, Math.round(Number(sprite.x) * scale)), y: Math.max(0, Math.round(Number(sprite.y) * scale)), width: Math.max(1, Math.round(Number(sprite.width) * scale)), height: Math.max(1, Math.round(Number(sprite.height) * scale)) }));
    if (compact.manualCellSizeEnabled) {
      compact.manualCellWidth = targetCellWidth;
      compact.manualCellHeight = targetCellHeight;
    }
    compact.smallFishGeneration = { longestSide: LONGEST_SIDE, source: `assets/fish/${file}` };
    fs.writeFileSync(outputMetadata, `${JSON.stringify(compact, null, 2)}\n`);
    generated += 1;
  }
  console.log(`Small fish atlases: ${generated} generated.`);
}

if (require.main === module) generate(process.argv.includes("--check")).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { generate };
