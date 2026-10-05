"use strict";

const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const escape = value => String(value ?? "").replace(/[&<>\"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const titleCase = value => String(value || "").replace(/[-_]+/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    entry.isDirectory() ? walk(target, files) : files.push(target);
  }
  return files;
}

const thumbnailIndex = new Map();
for (const file of walk(path.join(root, "game/assets/generated/sprites/fish"))) {
  const relative = path.relative(path.join(root, "game/assets/generated/sprites/fish"), file).replaceAll(path.sep, "/");
  // The small_fish tree is delivery/compact artwork for the game. It is not
  // appropriate for the public catalog: use the normal generated artwork only.
  if (file.endsWith(".thumb.webp") && !relative.startsWith("small_fish/")) thumbnailIndex.set(path.basename(file), "/assets/generated/sprites/fish/" + relative);
}
const food = readJson("game/assets/foodandmeds/food-and-meds.json").food;
const fish = readJson("game/assets/fish/fish-types.json").fish
  .filter(entry => entry.seller !== "Proteus Biodyne")
  .filter(entry => entry.Fish_enabled !== false)
  .map(entry => ({ ...entry, thumbnail: thumbnailFor(entry.asset) }));
const decor = readJson("game/assets/decor/decor_types.json").decor;
const version = readJson("game/public/version.json").version;
const lastPushed = readJson("game/public/build-info.json").lastPushed;
const updateLog = readJson("update_log.json").updates || [];

function thumbnailFor(asset) {
  return thumbnailIndex.get(path.basename(asset) + ".thumb.webp") || "";
}
function foodsFor(entry) {
  return (entry.acceptedFoods || []).map(id => food[id]?.name?.replace(/^Tidewell\s*-\s*/, "") || titleCase(id));
}
function fishFacts(entry) {
  const facts = [titleCase(entry.waterType), titleCase(entry.swimStyle) + " swimmer"];
  if (entry.cleanupAnimal) facts.push("Cleanup crew");
  if (entry.socialMode === "school") facts.push("Schools with its kind");
  else if ((entry.needs?.friends?.min || 0) > 0) facts.push("Social");
  if (entry.caveEnabled) facts.push("Uses caves");
  return facts;
}
function fishCard(entry, compact = false) {
  const variants = (entry.assetVariants || []).map((asset, index) => ({ src: thumbnailFor(asset), label: entry.variantLabels?.[index] || `Variant ${index + 1}` })).filter(item => item.src);
  return `<article class="fish-card" id="${escape(entry.id)}" data-water="${escape(entry.waterType)}" data-genetics="${escape(entry.genetics)}" data-behavior="${escape(entry.swimStyle)}" data-diet="${escape(entry.dietProfile)}" data-search="${escape(entry.name.toLowerCase())}">
    <div class="catalog-art"><img data-main-fish-image src="${escape(entry.thumbnail)}" alt="${escape(entry.name)}" loading="lazy"></div>
    ${variants.length > 1 ? `<div class="variant-strip" role="group" aria-label="${escape(entry.name)} variants">${variants.map((item, index) => `<button type="button" data-variant-src="${escape(item.src)}" data-variant-alt="${escape(item.label)}" aria-pressed="${index === 0 ? "true" : "false"}" title="${escape(item.label)}"><img src="${escape(item.src)}" alt="${escape(item.label)}" loading="lazy"></button>`).join("")}</div>` : ""}
    <div class="catalog-copy"><h2>${escape(entry.name)}</h2><div class="tags">${fishFacts(entry).map(fact => `<span>${escape(fact)}</span>`).join("")}</div>
    ${compact ? "" : `<p>${escape(entry.description)}</p><dl><div><dt>Food</dt><dd>${escape(foodsFor(entry).join(", "))}</dd></div><div><dt>Diet</dt><dd>${escape(titleCase(entry.dietProfile))}</dd></div></dl>`}
    </div></article>`;
}
function decorTraits(entry) {
  const traits = [titleCase(entry.categories?.[0]), titleCase(entry.theme)];
  const tags = new Set(entry.tags || []);
  if (entry.swimmable || tags.has("swimmable")) traits.push("Fish can swim through");
  if (tags.has("grazable")) traits.push("Fish can graze nearby");
  if (tags.has("perchable")) traits.push("Fish can perch nearby");
  if (tags.has("sway") || /sway/.test(entry.behavior || "")) traits.push("Sways");
  if (entry.bubbler || entry.behavior === "bubbler") traits.push("Bubbler");
  return traits.filter(Boolean);
}
function decorCard(entry, compact = false) {
  const preview = `/assets/generated/previews/decor/${entry.behavior}/${entry.file.replace(/\.png$/i, ".webp")}`;
  return `<article class="decor-card" data-category="${escape(entry.categories?.[0] || "other")}" data-search="${escape(entry.name.toLowerCase())}">
    <div class="catalog-art"><img src="${escape(preview)}" alt="${escape(entry.name)} aquarium decoration" loading="lazy"></div><div class="catalog-copy"><h3>${escape(entry.name)}</h3><div class="tags">${decorTraits(entry).map(trait => `<span>${escape(trait)}</span>`).join("")}</div>${compact ? "" : `<p>${escape(entry.description)}</p>`}</div></article>`;
}

module.exports = { decor, decorCard, escape, fish, fishCard, lastPushed, titleCase, updateLog, version };
