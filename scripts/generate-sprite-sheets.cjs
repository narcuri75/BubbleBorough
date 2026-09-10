"use strict";

// Editor JSON contains embedded PNGs; only ship coordinates to the browser.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const output = path.join(root, "public/app-src/assets/sprite-sheet-definitions.js");

function webpSize(buffer) {
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") throw new Error("Invalid WebP");
  for (let offset = 12; offset + 8 <= buffer.length;) {
    const type = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (type === "VP8X") return [1 + buffer.readUIntLE(start + 4, 3), 1 + buffer.readUIntLE(start + 7, 3)];
    if (type === "VP8 ") return [buffer.readUInt16LE(start + 6) & 0x3fff, buffer.readUInt16LE(start + 8) & 0x3fff];
    if (type === "VP8L") {
      const bits = buffer.readUInt32LE(start + 1);
      return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
    }
    offset = start + size + (size % 2);
  }
  throw new Error("Missing WebP dimensions");
}

function buildDefinitions(assetRoot = path.join(root, "assets")) {
  const definitions = [];
  const names = new Set();
  for (const directory of fs.readdirSync(assetRoot, { withFileTypes: true }).filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    for (const file of fs.readdirSync(path.join(assetRoot, directory.name)).filter((name) => name.endsWith(".webp")).sort()) {
      const sheetPath = path.join(assetRoot, directory.name, file);
      const jsonPath = sheetPath.replace(/\.webp$/, ".json");
      if (!fs.existsSync(jsonPath)) continue;
      const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
      if (!Array.isArray(data.layers)) continue; // Not a sprite editor export.
      const fail = (message) => { throw new Error(`${jsonPath}: ${message}`); };
      if (data.version !== 2 || data.layers.length !== 1 || !data.layers[0].visible || data.negativeSpacingEnabled) fail("Unsupported layer/spacing configuration; re-export a single visible grid layer");
      const sprites = data.layers[0].sprites;
      if (!sprites.length || !Number.isInteger(data.columns) || data.columns < 1) fail("Invalid grid");
      const cellWidth = data.manualCellSizeEnabled ? data.manualCellWidth : Math.max(...sprites.map((sprite) => sprite.width));
      const cellHeight = data.manualCellSizeEnabled ? data.manualCellHeight : Math.max(...sprites.map((sprite) => sprite.height));
      const sheetBytes = fs.readFileSync(sheetPath);
      const [width, height] = webpSize(sheetBytes);
      if (width !== cellWidth * data.columns || height !== cellHeight * Math.ceil(sprites.length / data.columns)) fail("WebP dimensions do not match the JSON grid");
      const frames = {};
      sprites.forEach((sprite, index) => {
        if (!sprite.name || /[/\\]/.test(sprite.name) || sprite.rotation || sprite.flipX || sprite.flipY) fail(`Unsupported sprite name/transform: ${sprite.name}`);
        const { x = 0, y = 0, width: w, height: h } = sprite;
        if (![x, y, w, h].every(Number.isInteger) || x < 0 || y < 0 || w < 1 || h < 1 || x + w > cellWidth || y + h > cellHeight) fail(`Frame exceeds its cell: ${sprite.name}`);
        const key = `${directory.name}/${sprite.name}`.toLowerCase();
        if (names.has(key)) fail(`Duplicate sprite: ${sprite.name}`);
        names.add(key);
        frames[sprite.name] = [(index % data.columns) * cellWidth + x, Math.floor(index / data.columns) * cellHeight + y, w, h];
      });
      const version = crypto.createHash("sha256").update(sheetBytes).digest("hex").slice(0, 12);
      definitions.push({ path: `assets/${directory.name}/${file}`, version, width, height, frames,
        delivery: {
          root: `assets/generated/sprites/${directory.name}/${file.replace(/\.webp$/, "")}`,
          version: `${crypto.createHash("sha256").update(sheetBytes).update(JSON.stringify(frames)).digest("hex").slice(0, 12)}-v1`,
          standalone: directory.name === "decor"
        }
      });
    }
  }
  const aliasesPath = path.join(assetRoot, "sprite-sheet-aliases.json");
  if (fs.existsSync(aliasesPath)) {
    const aliases = JSON.parse(fs.readFileSync(aliasesPath, "utf8"));
    for (const [legacy, target] of Object.entries(aliases)) {
      const directory = target.slice(0, target.lastIndexOf("/") + 1);
      const name = target.slice(directory.length);
      const sheet = definitions.find((item) => item.path.startsWith(directory) && Object.hasOwn(item.frames, name));
      if (!sheet || !legacy.startsWith(directory) || legacy.slice(directory.length).includes("/") || names.has(legacy.replace(/^assets\//, "").toLowerCase())) {
        throw new Error(`Invalid sprite alias: ${legacy} -> ${target}`);
      }
      (sheet.aliases ||= {})[legacy.slice(directory.length)] = name;
    }
  }
  return definitions;
}

function generate(checkOnly = false) {
  const definitions = buildDefinitions();
  const source = "// Generated by scripts/generate-sprite-sheets.cjs. Do not edit.\n"
    + "function getSpriteSheetDefinitions() {\n  return " + JSON.stringify(definitions, null, 2).replace(/\n/g, "\n  ") + ";\n}\n";
  if (checkOnly) {
    if (!fs.existsSync(output) || fs.readFileSync(output, "utf8") !== source) throw new Error("Sprite definitions are stale. Run npm run build:app.");
  } else fs.writeFileSync(output, source);
  return definitions;
}

if (require.main === module) {
  const definitions = generate(process.argv.includes("--check"));
  if (process.argv.includes("--catalog")) {
    console.log(JSON.stringify(definitions.map((sheet) => ({
      path: sheet.path,
      category: sheet.path.split("/")[1],
      assets: Object.keys(sheet.frames).map((name) => ({ key: name, path: sheet.path.slice(0, sheet.path.lastIndexOf("/") + 1) + name }))
    }))));
  } else console.log(`Validated ${definitions.length} sprite sheets / ${definitions.reduce((count, sheet) => count + Object.keys(sheet.frames).length, 0)} frames.`);
}
module.exports = { buildDefinitions, generate, webpSize };
