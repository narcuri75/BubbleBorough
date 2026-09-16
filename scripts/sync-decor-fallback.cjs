"use strict";

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const catalogPath = path.join(projectRoot, "assets", "decor", "decor_types.json");
const bootstrapPath = path.join(projectRoot, "public", "app-src", "00-bootstrap.js");
const checkOnly = process.argv.includes("--check");

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
if (!Array.isArray(catalog.decor) || !catalog.decor.length) {
  throw new Error("assets/decor/decor_types.json does not contain a non-empty decor array.");
}

const fallback = Object.fromEntries(catalog.decor.map((entry) => {
  if (!entry || typeof entry.file !== "string" || !entry.file.trim()) {
    throw new Error("Every decor fallback entry must have a file name.");
  }
  const { file, ...meta } = JSON.parse(JSON.stringify(entry));
  return [file, meta];
}));

const replacement = `const DECOR_META = ${JSON.stringify(fallback, null, 2)};\n\n`;
const bootstrap = fs.readFileSync(bootstrapPath, "utf8");
const pattern = /const DECOR_META = \{[\s\S]*?\};\s*\n\s*const DECOR_KEY_ALIASES/;
if (!pattern.test(bootstrap)) {
  throw new Error("Could not locate the DECOR_META fallback block in public/app-src/00-bootstrap.js.");
}
const nextBootstrap = bootstrap.replace(pattern, `${replacement}const DECOR_KEY_ALIASES`);

if (checkOnly) {
  if (nextBootstrap !== bootstrap) {
    throw new Error("Emergency decor fallback is out of sync with assets/decor/decor_types.json. Run npm run build:app.");
  }
  console.log(`Emergency decor fallback: ${catalog.decor.length} decor checked.`);
  process.exit(0);
}

if (nextBootstrap !== bootstrap) {
  fs.writeFileSync(bootstrapPath, nextBootstrap);
  console.log(`Emergency decor fallback: synced ${catalog.decor.length} decor.`);
} else {
  console.log(`Emergency decor fallback: ${catalog.decor.length} decor already synced.`);
}
