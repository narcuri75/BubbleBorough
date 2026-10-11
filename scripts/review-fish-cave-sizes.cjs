"use strict";

// Read-only sizing audit. Writes its measurements to the supplied JSON path.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const sharp = require("sharp");
const root = path.resolve(__dirname, "..");
const sourceRoot = path.join(root, "game/public/app-src");
const output = process.argv[2];
if (!output) throw new Error("Usage: node scripts/review-fish-cave-sizes.cjs output.json");
const proposedBand = diameter => Math.ceil(diameter) >= 180 ? "Large" : Math.ceil(diameter) >= 100 ? "Medium" : "Small";
const context = vm.createContext({ PROTEUS_ZOMBIE_FISH_SPECIES_ID: "proteus-zombie-fish" });
function loadFunctions(file, names) {
  const parsed = ts.createSourceFile(file, fs.readFileSync(path.join(sourceRoot, file), "utf8"), ts.ScriptTarget.Latest, true);
  for (const name of names) {
    const declaration = parsed.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
    if (!declaration) throw new Error(`Missing function ${name}`);
    vm.runInContext(declaration.getText(parsed), context);
  }
}
loadFunctions("assets/sprite-sheet-definitions.js", ["getSpriteSheetDefinitions"]);
context.getAllSpriteSheetDefinitions = context.getSpriteSheetDefinitions;
loadFunctions("store/catalog.js", ["getProteusZombieFishVariantAssetNames", "getProteusZombieFishCatalogDefinition", "getDavyMutationCatalogDefinitions"]);
const frames = new Map();
for (const sheet of context.getSpriteSheetDefinitions()) {
  const directory = sheet.path.slice(0, sheet.path.lastIndexOf("/") + 1);
  for (const [name, rect] of Object.entries(sheet.frames)) frames.set((directory + name).toLowerCase(), { sheet, rect });
  for (const [alias, name] of Object.entries(sheet.aliases || {})) frames.set((directory + alias).toLowerCase(), frames.get((directory + name).toLowerCase()));
}
const catalog = JSON.parse(fs.readFileSync(path.join(root, "game/assets/fish/fish-types.json"), "utf8")).fish;
catalog.push(...context.getDavyMutationCatalogDefinitions(), context.getProteusZombieFishCatalogDefinition());
const decoded = new Map();
async function getPixels(asset) {
  const key = asset.replace(/^\//, "").toLowerCase();
  const frame = frames.get(key);
  if (!frame) throw new Error(`Missing frame ${asset}`);
  const file = path.join(root, "game", frame.sheet.path);
  if (!decoded.has(file)) decoded.set(file, await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true }));
  return { ...decoded.get(file), rect: frame.rect };
}
function resolveAsset(fish, value) {
  return value.includes("/") ? value.replace(/^\//, "") : `assets/${fish.assetFolder || "fish"}/${value}`;
}
async function measure(fish, value) {
  const asset = resolveAsset(fish, value);
  const { data, info, rect: [left, top, width, height] } = await getPixels(asset);
  // Reference: desktop viewport scale=1, adult scale=100%, middle depth=1.2.
  const displayWidth = Math.min(488, Math.max(70, fish.displayWidth || fish.width)) * 0.85 * 1.2;
  const scale = displayWidth / width;
  let minX = width, minY = height, maxX = -1, maxY = -1, radiusSquared = 0;
  const points = [];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[((top + y) * info.width + left + x) * info.channels + 3] < 40) continue;
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    // Pixel corners conservatively include the complete visible silhouette.
    const dx = Math.max(Math.abs(x - width / 2), Math.abs(x + 1 - width / 2));
    const dy = Math.max(Math.abs(y - height / 2), Math.abs(y + 1 - height / 2));
    radiusSquared = Math.max(radiusSquared, dx * dx + dy * dy);
    points.push([dx, dy]);
  }
  if (!points.length) throw new Error(`Empty frame ${asset}`);
  const rx = Math.max(width / 2 - minX, maxX + 1 - width / 2);
  const ry = Math.max(height / 2 - minY, maxY + 1 - height / 2);
  let ellipseScale = 1;
  for (const [dx, dy] of points) ellipseScale = Math.max(ellipseScale, Math.hypot(dx / rx, dy / ry));
  return {
    asset,
    visibleWidth: (maxX - minX + 1) * scale,
    visibleHeight: (maxY - minY + 1) * scale,
    ovalWidth: 2 * rx * ellipseScale * scale * 1.1,
    ovalHeight: 2 * ry * ellipseScale * scale * 1.1,
    roundDiameter: 2 * Math.sqrt(radiusSquared) * scale * 1.1
  };
}
(async () => {
  const rows = [];
  for (const fish of catalog) {
    const listedVariants = [...new Set([fish.asset, ...(fish.assetVariants || [])])];
    // These are layered appendages, not alternate whole-animal silhouettes.
    const variants = listedVariants.filter(asset => !/_(antenna|legs|feelers|fin)\.png$/i.test(asset));
    // Otocinclus must enter in its swimming pose rather than its glass view.
    const assets = fish.id === "otocinclus"
      ? variants.filter(asset => !/_(bottom|side)\.png$/i.test(asset)).map(asset => asset.replace(/\.png$/i, "_side.png"))
      : variants;
    const measurements = [];
    for (const asset of assets) measurements.push(await measure(fish, asset));
    const range = key => [Math.min(...measurements.map(row => row[key])), Math.max(...measurements.map(row => row[key]))].map(value => Math.ceil(value));
    rows.push({
      id: fish.id, name: fish.name, behavior: fish.behavior || "free",
      caveEnabled: fish.caveEnabled !== false, currentMinimum: fish.caveMinSize || "fit only",
      catalogWidth: fish.displayWidth || fish.width, variants: measurements.length,
      excludedLayerAssets: listedVariants.filter(asset => !variants.includes(asset)),
      visibleWidth: range("visibleWidth"), visibleHeight: range("visibleHeight"),
      ovalWidth: range("ovalWidth"), ovalHeight: range("ovalHeight"),
      roundDiameter: range("roundDiameter"),
      defaultSuggestedBand: proposedBand(Math.min(measurements[0].ovalWidth, measurements[0].ovalHeight)),
      variantSuggestedBands: [...new Set(measurements.map(row => proposedBand(Math.min(row.ovalWidth, row.ovalHeight))))],
      measurements
    });
  }
  fs.writeFileSync(path.resolve(output), JSON.stringify({ reference: { adultScale: 1, depthScale: 1.2, visualScale: 0.85, alphaThreshold: 40, clearance: 1.1 }, proposedThresholds: { mediumMin: 100, largeMin: 180 }, rows }, null, 2) + "\n");
  console.log(`Measured ${rows.length} species and ${rows.reduce((sum, row) => sum + row.variants, 0)} variants.`);
  for (const row of rows) console.log(`${row.id.padEnd(35)} visible ${row.visibleWidth.join("-")} x ${row.visibleHeight.join("-")} oval ${row.ovalWidth.join("-")} x ${row.ovalHeight.join("-")} round ${row.roundDiameter.join("-")}`);
})().catch(error => { console.error(error); process.exitCode = 1; });
