"use strict";

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const catalogPath = path.join(projectRoot, "assets", "fish", "fish-types.json");
const bootstrapPath = path.join(projectRoot, "public", "app-src", "00-bootstrap.js");
const checkOnly = process.argv.includes("--check");

function normalizeFallbackAssetPath(value) {
  if (typeof value !== "string" || !value.trim()) return value;
  const trimmed = value.trim();
  if (/^(?:data:|blob:|https?:|\/)/i.test(trimmed)) return trimmed;
  return `/assets/fish/${trimmed.replace(/^\.\//, "")}`;
}

function buildFallbackFish(entry) {
  const copy = JSON.parse(JSON.stringify(entry));
  copy.asset = normalizeFallbackAssetPath(copy.asset);
  if (copy.fallbackAsset) copy.fallbackAsset = normalizeFallbackAssetPath(copy.fallbackAsset);
  if (Array.isArray(copy.assetVariants)) {
    copy.assetVariants = copy.assetVariants.map(normalizeFallbackAssetPath);
  }
  return copy;
}

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
if (!Array.isArray(catalog.fish) || !catalog.fish.length) {
  throw new Error("assets/fish/fish-types.json does not contain a non-empty fish array.");
}

const fish = catalog.fish.map(buildFallbackFish);
const replacement = `const FISH_TYPES = ${JSON.stringify(fish, null, 2)};\n\n`;
const bootstrap = fs.readFileSync(bootstrapPath, "utf8");
const pattern = /const FISH_TYPES = \[[\s\S]*?\];\s*\n\s*const WATER_TYPE_META/;
if (!pattern.test(bootstrap)) {
  throw new Error("Could not locate the FISH_TYPES fallback block in public/app-src/00-bootstrap.js.");
}
const nextBootstrap = bootstrap.replace(pattern, `${replacement}const WATER_TYPE_META`);

if (checkOnly) {
  if (nextBootstrap !== bootstrap) {
    throw new Error("Emergency fish fallback is out of sync with assets/fish/fish-types.json. Run npm run build:app.");
  }
  console.log(`Emergency fish fallback: ${fish.length} species checked.`);
  process.exit(0);
}

if (nextBootstrap !== bootstrap) {
  fs.writeFileSync(bootstrapPath, nextBootstrap);
  console.log(`Emergency fish fallback: synced ${fish.length} species.`);
} else {
  console.log(`Emergency fish fallback: ${fish.length} species already synced.`);
}
