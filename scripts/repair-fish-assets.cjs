"use strict";

// Keeps the editable fish sheets, their compact copies, and the shop catalog
// in lockstep.  Source WebPs are authoritative; a sheet is never useful
// without its coordinate sidecar.
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const fishRoot = path.join(root, "assets", "fish");
const smallRoot = path.join(fishRoot, "small_fish");
const protectedJson = new Set(["fish-types.json", "FISH_RENAME_MANIFEST.json"]);
const restrictedStoreIds = new Set([
  "bioluminescent-angler-pike",
  "bioluminescent-glass-fangfish",
  "dwarf-chimera-barracuda",
  "dwarf-hyperfin",
  "zombie_fish",
  // These are shared sprite sheets for the named Other-category creatures,
  // not separate generic store products.
  "shrimp",
  "turbo_snail"
]);
const renames = new Map([
  ["moor__genetics-natural", "moor-goldfish__genetics-natural"],
  ["puffer__genetics-natural", "pufferfish__genetics-natural"],
  ["puffer-inflated__genetics-natural", "pufferfish__genetics-natural__state-inflated"],
  ["rainbow__genetics-natural", "rainbowfish__genetics-natural"],
  ["nerite_snail", "nerite-snail__genetics-natural"]
]);

function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")); }
function writeJson(file, value) { fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); }
function stripEmbeddedImages(value) {
  if (Array.isArray(value)) return value.map(stripEmbeddedImages);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).flatMap(([key, child]) => (
    typeof child === "string" && child.startsWith("data:image/") ? [] : [[key, stripEmbeddedImages(child)]]
  )));
}
function pairs(directory) {
  const names = fs.readdirSync(directory, { withFileTypes: true }).filter(item => item.isFile()).map(item => item.name);
  const json = new Set(names.filter(name => name.endsWith(".json") && !protectedJson.has(name)).map(name => name.slice(0, -5)));
  const webp = new Set(names.filter(name => name.endsWith(".webp")).map(name => name.slice(0, -5)));
  return { json, webp, valid: [...webp].filter(stem => json.has(stem)).sort() };
}
function title(value) {
  return value.replace(/__genetics-(natural|enhanced)(?:__state-[a-z0-9-]+)?$/, "")
    .split("-").map(word => word === "dna" ? "DNA" : `${word[0].toUpperCase()}${word.slice(1)}`).join(" ");
}
function labelFromFrame(name) {
  return name.replace(/\.png$/i, "").replace(/[_-]+/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());
}
function frameAssets(stem) {
  const data = readJson(path.join(fishRoot, `${stem}.json`));
  return (data.layers?.[0]?.sprites || []).map(sprite => `/assets/fish/${sprite.name}`);
}

async function main() {
  // Normalize the four old duplicate stems before pruning orphan sidecars.
  for (const [from, to] of renames) {
    for (const extension of [".webp", ".json"]) {
      const oldFile = path.join(fishRoot, `${from}${extension}`);
      const newFile = path.join(fishRoot, `${to}${extension}`);
      if (fs.existsSync(oldFile)) fs.renameSync(oldFile, newFile);
    }
  }

  let source = pairs(fishRoot);
  let removed = 0;
  for (const stem of source.json) {
    if (!source.webp.has(stem)) {
      fs.unlinkSync(path.join(fishRoot, `${stem}.json`));
      removed += 1;
    }
  }
  source = pairs(fishRoot);

  // small_fish is a derivative, never an independent source of truth. Remove
  // stale compact pairs left behind by a source rename or deletion.
  let compactRemoved = 0;
  const currentSmall = pairs(smallRoot);
  for (const stem of currentSmall.valid) {
    if (source.valid.includes(stem)) continue;
    fs.unlinkSync(path.join(smallRoot, `${stem}.webp`));
    fs.unlinkSync(path.join(smallRoot, `${stem}.json`));
    compactRemoved += 1;
  }

  // Strip data URLs from every editor sidecar. The WebP is the shipped image.
  for (const directory of [fishRoot, smallRoot]) {
    for (const name of fs.readdirSync(directory).filter(name => name.endsWith(".json") && !protectedJson.has(name))) {
      const file = path.join(directory, name);
      writeJson(file, stripEmbeddedImages(readJson(file)));
    }
  }

  // Make a compact, matching copy of every source pair missing from small_fish.
  // Existing hand-curated small sheets are deliberately left untouched.
  let copied = 0;
  const small = pairs(smallRoot);
  for (const stem of source.valid) {
    if (small.valid.includes(stem)) continue;
    const sourceImage = path.join(fishRoot, `${stem}.webp`);
    const sourceJson = readJson(path.join(fishRoot, `${stem}.json`));
    const metadata = await sharp(sourceImage).metadata();
    const scale = 1 / 8;
    const width = Math.max(1, Math.round(metadata.width * scale));
    const height = Math.max(1, Math.round(metadata.height * scale));
    await sharp(sourceImage).resize(width, height, { kernel: sharp.kernel.lanczos3 }).webp({ quality: 82, alphaQuality: 100, effort: 4 })
      .toFile(path.join(smallRoot, `${stem}.webp`));
    const compact = stripEmbeddedImages(sourceJson);
    compact.manualCellSizeEnabled = true;
    compact.manualCellWidth = Math.max(1, Math.round((metadata.width / compact.columns) * scale));
    compact.manualCellHeight = Math.max(1, Math.round((metadata.height / Math.ceil(compact.layers[0].sprites.length / compact.columns)) * scale));
    for (const sprite of compact.layers[0].sprites) {
      for (const key of ["x", "y", "width", "height"]) sprite[key] = Math.max(0, Math.round(sprite[key] * scale));
    }
    writeJson(path.join(smallRoot, `${stem}.json`), compact);
    copied += 1;
  }

  // Add every newly valid sheet to the store and make each sheet's real frames
  // selectable appearances. Existing hand-authored catalog details are retained.
  const catalogFile = path.join(fishRoot, "fish-types.json");
  const catalog = readJson(catalogFile);
  // Restricted specimens have separate sellers; never restore them to the
  // public BubbleBodega catalog during a future asset reconciliation.
  catalog.fish = catalog.fish.filter(fish => !restrictedStoreIds.has(fish?.id));
  const template = catalog.fish.find(fish => fish.id === "guppy");
  for (const stem of source.valid) {
    if (restrictedStoreIds.has(stem)) continue;
    const assets = frameAssets(stem);
    if (!assets.length) continue;
    const genetics = stem.includes("__genetics-enhanced") ? "enhanced" : "natural";
    const id = stem.replace(/__genetics-(natural|enhanced)(?:__state-([a-z0-9-]+))?$/, "");
    const existing = catalog.fish.find(fish => fish.id === id);
    const entry = existing || {
      ...template,
      id,
      name: title(stem),
      cost: genetics === "enhanced" ? 30 : 10,
      description: `A ${genetics} ${title(stem).toLowerCase()} with selectable appearances.`,
    };
    Object.assign(entry, { genetics, asset: assets[0], assetVariants: assets, variantLabels: assets.map(asset => labelFromFrame(path.basename(asset))) });
    if (!existing) catalog.fish.push(entry);
  }
  // A previous incomplete synchronization may have made duplicate IDs. Keep
  // the first (hand-authored) entry, which has just received the fresh frames.
  const ids = new Set();
  catalog.fish = catalog.fish.filter(fish => !ids.has(fish.id) && ids.add(fish.id));
  // Do not leave a purchasable listing pointing to a deleted atlas/frame. This
  // also guarantees the store thumbnail has a real source image.
  const availableFrames = new Set(source.valid.flatMap(frameAssets));
  catalog.fish = catalog.fish.filter(fish => {
    const asset = String(fish.asset || "");
    return availableFrames.has(asset) || (asset.startsWith("/assets/") && fs.existsSync(path.join(root, asset.slice(1))));
  });
  writeJson(catalogFile, catalog);
  console.log(`Removed ${removed} orphan JSON sidecars and ${compactRemoved} stale compact pairs; copied ${copied} compact sheet pairs; catalog now lists ${catalog.fish.length} store fish.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
