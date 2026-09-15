const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const fish = readJson('assets/fish/fish-types.json').fish;
const decor = readJson('assets/decor/decor_types.json').decor;
const foodMeds = readJson('assets/foodandmeds/food-and-meds.json');
const backgrounds = readJson('assets/backgrounds/backgrounds.json').backgrounds;

const lines = [
  '# BubbleBorough shop item catalog',
  '',
  'Generated from the current store catalogs. The “About this item” page reuses the catalog copy and card facts. Inventory, unlock, ownership, and seasonal availability labels can change with game state; those are marked as dynamic below.',
  '',
  `Catalog totals: ${fish.length} fish, ${decor.length} decor records, ${Object.keys(foodMeds.food).length} food, ${Object.keys(foodMeds.medicine).length} pharmacy items, ${backgrounds.length - 1} purchasable backgrounds, and 3 machinery items.`,
  '',
];

function section(title) { lines.push(`## ${title}`, ''); }
function item(name, about, meta = []) {
  lines.push(`### ${name}`, '', '**About this item**', '', about, '');
  if (meta.length) {
    lines.push('**Catalog facts**', '', ...meta.map((x) => `- ${x}`), '');
  }
}
function money(value) { return value === 0 ? 'Free' : `${value} coins`; }

const foodEffects = {
  basic: [
    'Effect: compatible fish gain 50 hunger points (to at least 85), 3 energy, 2 stimulation, and 1 comfort—or 5 comfort when they were hungry.',
    'Also awards the species meal coins, schedules waste, and can cause overfeeding damage when used too often.',
  ],
  frisky: [
    'Effect: provides the same nutrition and care-stat gains as Basic Fish Food.',
    'Special effect: guarantees eligible breeding for 1 minute after a fish eats it.',
  ],
  chum: [
    'Effect: piranhas, sharks, whales, and other chum-only predators gain 55 hunger points (to at least 90), plus 3 energy, 2 stimulation, and 1–5 comfort.',
    'Normal fish cannot use chum as a meal. Chum can be loaded into the Chum Skiff but is intentionally excluded from the Automated Care Submarine.',
  ],
  halloweenCandy: [
    'Effect: immediately restores one fish to maximum health and sets every care stat to 100 for 24 hours.',
    'During the boost, health and care stats remain full and the fish will not eat another candy. Candy bypasses food-refusal checks, grants no meal coins, cannot overfeed, and cannot be loaded into the automatic dispenser.',
  ],
};

const medicineEffects = {
  firstAid: [
    'Effect: applies to every living fish in the tank, restoring half a heart every 10 seconds for 1 minute (five healing ticks before expiry).',
    'Also slows active disease progression for 12 hours.',
  ],
  betaBlocker: [
    'Effect: sets every living fish in the tank to 100% comfort until the next local midnight.',
  ],
};

section('Food');
for (const entry of Object.values(foodMeds.food)) {
  item(entry.name, entry.description, [`Price: ${money(entry.cost)}`, `Quantity per purchase: ${entry.bottlePellets} ${entry.id === 'halloweenCandy' ? 'candies' : 'pellets'}`, ...(foodEffects[entry.id] || [])]);
}

section('Pharmacy');
for (const entry of Object.values(foodMeds.medicine)) {
  item(entry.name, entry.description, [`Price: ${money(entry.cost)}`, `Quantity per purchase: ${entry.bottleDrops} drops`, ...(medicineEffects[entry.id] || [])]);
}

section('Fish');
for (const entry of fish) {
  const about = [
    entry.description,
    entry.aboutAttribution ? `**${entry.aboutAttribution}**` : "",
    entry.aboutTagline ? `*${entry.aboutTagline}*` : "",
  ].filter(Boolean).join('\n\n');
  const facts = [
    `Price: ${money(entry.cost)}`,
    `Behavior: ${entry.behavior || entry.swimStyle || 'custom'}`,
    `Cave fish: ${entry.caveEnabled ? 'Yes' : 'No'}`,
    `About-page note: health, feeding care, grime multiplier, unlock status, needs, conflicts, and behavior are rendered from live game state/catalog rules.`,
  ];
  item(entry.name, about, facts);
}

section('Decor');
for (const entry of decor) {
  const variants = entry.variantGroup ? ` Variant group: ${entry.variantGroup}.` : '';
  const categories = Array.isArray(entry.categories) && entry.categories.length ? entry.categories.join(', ') : 'uncategorized';
  item(entry.name, entry.description, [`Price: ${money(entry.cost || 0)}`, `Theme: ${entry.theme || 'No theme'}`, `Categories: ${categories}`, `About-page status: ownership, unlock status, seasonal availability, and borough-service notes are dynamic.${variants}`]);
}

section('Backgrounds');
for (const entry of backgrounds.filter((x) => !x.defaultUnlocked)) {
  item(entry.name, entry.description, [`Price: ${money(entry.cost)}`, 'Use: aquarium background', 'Status: locked/owned/selected (dynamic)']);
}

section('Machinery');
item('Food Dispenser 9000', 'A top-mounted automatic feeder with an unnecessarily impressive name. Position it where you want it and it will dispense exactly what hungry fish need when they need it. Just don\'t forget to add food to it.', ['Price: 150 coins', 'Status: installed, stored, or available (dynamic)', 'Appearance variants available']);
item('Automated Care Submarine', 'A tiny autonomous submarine built to handle the parts of fishkeeping you might forget. It travels between connected tanks, feeds hungry residents, administers medicine when needed, and carries up to 99 portions of each supply. Not compatible with chum.', ['Price: 300 coins', 'Status/ownership count: dynamic', 'Appearance variants available']);
item('Chum Skiff', 'A small surface skiff dedicated to one extremely specific job that even submariners won\'t do: delivering chum. It patrols the water above the tank and drops a portion on command from its supply of up to 99 servings.', ['Price: 125 coins', 'Status/ownership count: dynamic', 'Appearance variants available']);

const output = path.join(root, 'docs', 'shop-item-catalog.md');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${lines.join('\n')}\n`);
console.log(`Wrote ${output}`);
