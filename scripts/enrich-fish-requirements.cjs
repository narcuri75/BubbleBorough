"use strict";

// The game deliberately has two water systems. Species needing any salinity,
// including brackish specialists, are modeled as saltwater.
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const catalogFile = path.join(root, "assets", "fish", "fish-types.json");
const saltwater = new Set([
  "tang", "clownfish", "lionfish", "bull-shark", "great-white-shark",
  "hammerhead-shark", "orca", "sunfish", "seahorse", "pilot-fish",
  "marine-shrimp", "green-chromis", "firefish", "orchid-dottyback",
  "six-line-wrasse", "coral-beauty-angelfish", "cleaner-shrimp",
  "pistol-shrimp", "turbo-snail", "assessor", "basslets-grammas",
  "cardinal", "chromis", "dottyback", "turbo_snail"
]);
const foods = {
  omnivore: ["basic", "brineShrimp"],
  herbivore: ["basic", "algaeWafers", "brineShrimp"],
  carnivore: ["brineShrimp", "carnivore"],
  predator: ["chum"],
  grazer: ["algaeWafers"]
};
const dietaryModes = {
  tang: "herbivore", goldfish: "herbivore", "moor-goldfish": "herbivore",
  molly: "herbivore", swordtail: "herbivore", koi: "herbivore",
  otocinclus: "grazer", "freshwater-shrimp": "grazer", "marine-shrimp": "grazer",
  "nerite-snail": "grazer", "turbo-snail": "grazer", turbo_snail: "grazer",
  piranha: "predator", lionfish: "predator", "bull-shark": "predator",
  "great-white-shark": "predator", "hammerhead-shark": "predator", orca: "predator",
  "cleaner-shrimp": "carnivore", "pistol-shrimp": "carnivore",
  "orchid-dottyback": "carnivore", "six-line-wrasse": "carnivore",
  dottyback: "carnivore", assessor: "carnivore", "basslets-grammas": "carnivore",
  cardinal: "carnivore", seahorse: "carnivore", sunfish: "carnivore",
  "pilot-fish": "carnivore", betta: "carnivore", angelfish: "carnivore",
  discus: "carnivore", "blue-ram": "carnivore", "wonder-killifish": "carnivore",
  pufferfish: "carnivore", firefish: "carnivore"
};
// `dietProfile` is the legacy gameplay field. Keep it in sync with the
// taxonomy-facing dietary mode without introducing values the runtime does not
// understand (it uses `chum` and `detritus` for predator and grazer).
const legacyDietProfiles = {
  omnivore: "omnivore",
  herbivore: "herbivore",
  carnivore: "carnivore",
  predator: "chum",
  grazer: "detritus"
};
// These one-off shop entries were superseded by selectable variants in the
// family entries. Keeping both lets the same animal be bought twice.
const retiredIds = new Set(["wonder-killifish", "orchid-dottyback", "green-chromis"]);
const refreshedDefaultNames = {
  assessor: ["Cove", "Velvet", "Glimmer", "Pip", "Sable", "Drift", "Lumen", "Pico", "Mistral", "Echo", "Mica", "Rook"],
  barb: ["Zest", "Pepper", "Flicker", "Rummy", "Saffron", "Comet", "Tango", "Sprocket", "Jolt", "Poppy", "Cricket", "Dash"],
  "basslets-grammas": ["Royal", "Violet", "Riff", "Mauve", "Bowie", "Indigo", "Fizz", "Rhapsody", "Juno", "Plum", "Cadence", "Dazzle"],
  cardinal: ["Nova", "Orbit", "Astra", "Ruby", "Vega", "Pulsar", "Kip", "Cinder", "Cosmo", "Sol", "Ember", "Lyra"],
  chromis: ["Mint", "Lagoon", "Shamrock", "Spritz", "Kelp", "Clover", "Mako", "Tide", "Beryl", "Zippy", "Mojito", "Jade"],
  cichlid: ["Mosaic", "Rumba", "Topaz", "Rio", "Jasper", "Fresco", "Zazu", "Sundae", "Bramble", "Karma", "Sizzle", "Tinsel"],
  danio: ["Ziggy", "Pixel", "Dart", "Fleck", "Biscotti", "Zoom", "Noodle", "Dottie", "Bolt", "Quark", "Pep", "Marmot"],
  dottyback: ["Rascal", "Plum", "Zorro", "Moxie", "Vesper", "Bandit", "Fable", "Fuchsia", "Slick", "Riddle", "Punk", "Loki"],
  endler: ["Confetti", "Prism", "Salsa", "Sparkler", "Freckle", "Zing", "Tinsel", "Pico", "Mardi", "Pippin", "Glimmer", "Razzle"],
  mosquitofish: ["Skeeter", "Buzzer", "Cedar", "Puddle", "Midge", "Swoop", "Cicada", "Twitch", "Brook", "Skiff", "Hopper", "Scout"],
  platy: ["Mango", "Pico", "Taffy", "Skittle", "Doodle", "Sorbet", "Blinky", "Puddle", "Nectar", "Peach", "Dapple", "Bop"],
  rasbora: ["Chili", "Kite", "Poppy", "Rascal", "Saffron", "Sprig", "Miso", "Breeze", "Roo", "Glitter", "Swoosh", "Kiko"],
  killifish: ["Rivulet", "Ember", "Orbit", "Saffy", "Rocket", "Kestrel", "Mochi", "Zest", "Lark", "Vivid", "Fennel", "Pip"],
  "turbo-snail": ["Turbo", "Torque", "Moss", "Nori", "Pebble", "Orbit", "Sprout", "Button", "Drift", "Pesto"]
};
const variantLabelOverrides = {
  "turbo-snail": ["Turbo Snail Olive", "Turbo Snail Zebra", "Turbo Snail Marble", "Turbo Snail Moss", "Turbo Snail Speckled"]
};
const displayNameOverrides = {
  // N. marginatus is the dwarf pencilfish; this family entry also contains
  // several other Nannostomus species, so calling the entire entry “Golden”
  // is misleading.
  pencilfish: "Pencilfish"
};
const variantOverrides = {
  angelfish: {
    // These are distinct marine Pomacanthidae, not freshwater Pterophyllum
    // colour morphs. They remain in the shared atlas but carry their own care.
    "angelfish_emperor.png": { waterType: "saltwater", dietaryMode: "herbivore", taxonNote: "Emperor Angelfish (Pomacanthus imperator)." },
    "angelfish_flame.png": { waterType: "saltwater", dietaryMode: "herbivore", taxonNote: "Flame Angelfish (Centropyge loricula)." }
  },
  pufferfish: {
    "puffer_amazon.png": { waterType: "freshwater", dietaryMode: "carnivore" },
    "puffer_dogface.png": { waterType: "saltwater", dietaryMode: "carnivore" },
    "puffer_dwarf.png": { waterType: "freshwater", dietaryMode: "carnivore" },
    "puffer_fahaka.png": { waterType: "freshwater", dietaryMode: "carnivore" },
    "puffer_figure8.png": { waterType: "saltwater", dietaryMode: "carnivore", salinityNote: "Brackish; represented as saltwater." },
    "puffer_green_spotted.png": { waterType: "saltwater", dietaryMode: "carnivore", salinityNote: "Brackish to marine; represented as saltwater." },
    "puffer_map.png": { waterType: "saltwater", dietaryMode: "carnivore" },
    "puffer_mbu.png": { waterType: "freshwater", dietaryMode: "carnivore" },
    "puffer_oceanic.png": { waterType: "saltwater", dietaryMode: "carnivore" },
    "puffer_valentinis_sharpnose.png": { waterType: "saltwater", dietaryMode: "carnivore" }
  }
};

const catalog = JSON.parse(fs.readFileSync(catalogFile, "utf8"));
catalog.fish = catalog.fish.filter(fish => !retiredIds.has(fish.id));
for (const fish of catalog.fish) {
  const waterType = saltwater.has(fish.id) ? "saltwater" : "freshwater";
  const dietaryMode = dietaryModes[fish.id] || "omnivore";
  const acceptedFoods = foods[dietaryMode];
  fish.waterType = waterType;
  fish.dietProfile = legacyDietProfiles[dietaryMode];
  if (displayNameOverrides[fish.id]) fish.name = displayNameOverrides[fish.id];
  if (refreshedDefaultNames[fish.id]) fish.defaultNames = refreshedDefaultNames[fish.id];
  if (variantLabelOverrides[fish.id]) fish.variantLabels = variantLabelOverrides[fish.id];
  fish.acceptedFoods = [...acceptedFoods];
  fish.careRequirements = {
    waterType,
    acceptedFoods: [...acceptedFoods],
    dietaryMode,
    waterNote: waterType === "saltwater" ? "Saltwater required; brackish specialists use this system." : "Freshwater required."
  };
  fish.variantRequirementPolicy = "inherit-species-requirements-unless-overridden";
  if (variantOverrides[fish.id]) {
    fish.variantRequirements = Object.fromEntries(Object.entries(variantOverrides[fish.id]).map(([asset, requirement]) => [asset, {
      ...requirement,
      acceptedFoods: [...foods[requirement.dietaryMode]]
    }]));
  } else {
    delete fish.variantRequirements;
  }
}
fs.writeFileSync(catalogFile, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Enriched care requirements for ${catalog.fish.length} fish types.`);
