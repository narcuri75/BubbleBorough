const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const catalogPath = path.join(root, 'docs', 'shop-item-catalog.md');
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
const writeJson = (relativePath, value, indent = 2) => fs.writeFileSync(path.join(root, relativePath), `${JSON.stringify(value, null, indent)}\n`);

const genericSummaries = new Set([
  'A pantry item that helps keep your aquarium residents fed.',
  'A care item for treating and supporting your aquarium residents.',
  'A living aquarium companion with its own needs, behavior, and appearance.',
  'A display piece that adds character and useful places for fish to explore.',
  'An aquarium upgrade built to support life in the tank.',
]);

function parseCatalog(markdown) {
  const sections = new Map();
  let section = '';
  let current = null;
  let captureAbout = false;

  const finish = () => {
    if (!current) return;
    current.about = current.aboutLines
      .join('\n')
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .filter((paragraph) => !genericSummaries.has(paragraph))
      .join('\n\n');
    delete current.aboutLines;
    sections.get(section).push(current);
    current = null;
  };

  for (const line of markdown.split(/\r?\n/)) {
    const sectionMatch = line.match(/^## ([^#].*)$/);
    if (sectionMatch) {
      finish();
      section = sectionMatch[1].trim();
      sections.set(section, []);
      captureAbout = false;
      continue;
    }
    const itemMatch = line.match(/^### (.*)$/);
    if (itemMatch) {
      finish();
      const heading = itemMatch[1].trim();
      const renameMatch = heading.match(/^(.*?)\s*\(\s*change to\s+(.+?)\s*\)$/i);
      const removeMatch = heading.match(/^(.*?)\s*\(.*remove this item completely.*\)$/i);
      current = {
        originalName: (renameMatch?.[1] || removeMatch?.[1] || heading).trim(),
        name: (renameMatch?.[2] || renameMatch?.[1] || removeMatch?.[1] || heading).trim(),
        remove: Boolean(removeMatch),
        aboutLines: [],
      };
      captureAbout = false;
      continue;
    }
    if (!current) continue;
    if (line.trim() === '**About this item**') {
      captureAbout = true;
      continue;
    }
    if (line.trim() === '**Catalog facts**') {
      captureAbout = false;
      continue;
    }
    if (captureAbout) current.aboutLines.push(line);
  }
  finish();
  return sections;
}

function assertCount(label, actual, expected) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected} entries, found ${actual}.`);
}

function syncOrdered(entries, notes, label) {
  assertCount(label, notes.length, entries.length);
  return entries.map((entry, index) => {
    const note = notes[index];
    if (entry.name !== note.originalName) {
      throw new Error(`${label} #${index + 1}: expected ${entry.name}, found ${note.originalName}.`);
    }
    if (!note.about) throw new Error(`${label} ${entry.name}: missing About this item copy.`);
    return { ...entry, name: note.name, description: note.about };
  });
}

const sections = parseCatalog(fs.readFileSync(catalogPath, 'utf8'));

const foodAndMedsPath = 'assets/foodandmeds/food-and-meds.json';
const foodAndMeds = readJson(foodAndMedsPath);
const foodKeys = Object.keys(foodAndMeds.food);
const medicineKeys = Object.keys(foodAndMeds.medicine);
const foodNotes = sections.get('Food') || [];
const medicineNotes = sections.get('Pharmacy') || [];
assertCount('Food', foodNotes.length, foodKeys.length);
assertCount('Pharmacy', medicineNotes.length, medicineKeys.length);
foodKeys.forEach((key, index) => {
  const note = foodNotes[index];
  const entry = foodAndMeds.food[key];
  if (entry.name !== note.originalName) throw new Error(`Food ${key}: expected ${entry.name}, found ${note.originalName}.`);
  entry.name = note.name;
  entry.description = note.about;
});
medicineKeys.forEach((key, index) => {
  const note = medicineNotes[index];
  const entry = foodAndMeds.medicine[key];
  if (entry.name !== note.originalName) throw new Error(`Medicine ${key}: expected ${entry.name}, found ${note.originalName}.`);
  if (note.remove) {
    delete foodAndMeds.medicine[key];
    return;
  }
  entry.name = note.name;
  entry.description = note.about;
});
writeJson(foodAndMedsPath, foodAndMeds);

const fishPath = 'assets/fish/fish-types.json';
const fishCatalog = readJson(fishPath);
fishCatalog.fish = syncOrdered(fishCatalog.fish, sections.get('Fish') || [], 'Fish');
writeJson(fishPath, fishCatalog, 4);

const decorPath = 'assets/decor/decor_types.json';
const decorCatalog = readJson(decorPath);
decorCatalog.decor = syncOrdered(decorCatalog.decor, sections.get('Decor') || [], 'Decor');
writeJson(decorPath, decorCatalog);

const backgroundsPath = 'assets/backgrounds/backgrounds.json';
const backgroundCatalog = readJson(backgroundsPath);
const purchasable = backgroundCatalog.backgrounds.filter((entry) => !entry.defaultUnlocked);
const syncedBackgrounds = syncOrdered(purchasable, sections.get('Backgrounds') || [], 'Background');
let backgroundIndex = 0;
backgroundCatalog.backgrounds = backgroundCatalog.backgrounds.map((entry) => entry.defaultUnlocked ? entry : syncedBackgrounds[backgroundIndex++]);
writeJson(backgroundsPath, backgroundCatalog);

console.log('Applied catalog names and About-this-item copy to food, pharmacy, fish, decor, and backgrounds.');
