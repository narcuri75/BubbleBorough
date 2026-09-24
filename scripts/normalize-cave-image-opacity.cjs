"use strict";

// Cave layers are authored as separate cutout PNGs.  Their visible material
// must be opaque; only genuine exterior/cave cutouts should remain transparent.
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const caveDirectory = path.resolve(__dirname, "..", "assets", "decor", "cave_layered");
const checkOnly = process.argv.includes("--check");
const ALPHA_CUTOUT_THRESHOLD = 32;

async function normalizePng(fileName) {
  const filePath = path.join(caveDirectory, fileName);
  const source = sharp(filePath);
  const metadata = await source.metadata();
  if (!metadata.hasAlpha) return { fileName, changed: false };

  const { data, info } = await source.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let changed = false;
  for (let offset = 3; offset < data.length; offset += info.channels) {
    const normalizedAlpha = data[offset] >= ALPHA_CUTOUT_THRESHOLD ? 255 : 0;
    if (data[offset] !== normalizedAlpha) {
      data[offset] = normalizedAlpha;
      changed = true;
    }
  }

  if (!changed) return { fileName, changed: false };
  if (checkOnly) return { fileName, changed: true };
  const temporaryPath = `${filePath}.normalized.png`;
  await sharp(data, { raw: info }).png().toFile(temporaryPath);
  fs.renameSync(temporaryPath, filePath);
  return { fileName, changed: true };
}

async function run() {
  const fileNames = fs.readdirSync(caveDirectory)
    .filter((fileName) => fileName.toLowerCase().endsWith(".png"))
    // Surface companions are authored alpha masks. Their soft/partial alpha is
    // meaningful receiver coverage and must never be normalized as cave art.
    .filter((fileName) => !/(?:__|_)surface\.png$/i.test(fileName))
    .sort();
  const results = await Promise.all(fileNames.map(normalizePng));
  const changed = results.filter((result) => result.changed).map((result) => result.fileName);
  if (checkOnly && changed.length) {
    throw new Error(`Cave PNGs contain non-opaque visible pixels: ${changed.join(", ")}`);
  }
  console.log(`Cave opacity: ${fileNames.length} checked; ${changed.length} normalized.`);
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
