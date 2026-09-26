const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const EVENTS_PATH = path.join(ROOT, 'public/app-src/tank/events-recaps-and-save.js');
const APPEARANCE_PATH = path.join(ROOT, 'public/app-src/fish/appearance.js');
const PERSISTENCE_PATH = path.join(ROOT, 'public/app-src/core/settings-and-persistence.js');
const FISH_SANITIZE_PATH = path.join(ROOT, 'public/app-src/decor/layout-and-layers.js');
const BOOTSTRAP_PATH = path.join(ROOT, 'public/app-src/00-bootstrap.js');
const STARTUP_PATH = path.join(ROOT, 'public/app-src/ui/tool-modes-and-debug-panels.js');

const events = fs.readFileSync(EVENTS_PATH, 'utf8');
const appearance = fs.readFileSync(APPEARANCE_PATH, 'utf8');
const persistence = fs.readFileSync(PERSISTENCE_PATH, 'utf8');
const fishSanitize = fs.readFileSync(FISH_SANITIZE_PATH, 'utf8');
const bootstrap = fs.readFileSync(BOOTSTRAP_PATH, 'utf8');
const startup = fs.readFileSync(STARTUP_PATH, 'utf8');

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} should exist`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let i = bodyStart; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Could not extract ${name}`);
}

function fileKey(value) {
  return String(value || '').split(/[?#]/)[0].split('/').pop();
}

test('Phase 34 grandfathers every currently owned normal appearance into permanent mastery', () => {
  const species = {
    id: 'goldfish',
    asset: 'assets/fish/goldfish/goldfish_base.png',
    assetVariants: [
      'assets/fish/goldfish/goldfish_base.png',
      'assets/fish/goldfish/goldfish_ranchu.png',
      'assets/fish/goldfish/goldfish_black.png'
    ]
  };
  const tankFish = {
    id: 'tank-fish', speciesId: 'goldfish', appearanceVariant: 1,
    appearanceVariantKey: 'old-ranchu-name.png', appearanceAssetPath: 'assets/old/old-ranchu-name.png'
  };
  const storedFish = {
    id: 'stored-fish', speciesId: 'goldfish', appearanceVariant: 2,
    appearanceVariantKey: '', appearanceAssetPath: ''
  };
  const state = {
    tanks: [{ fish: [tankFish] }],
    storedFish: [storedFish],
    fishSpeciesMastery: {
      goldfish: { highestLevel: 1, unlockedVariantKeys: ['goldfish_base.png'] }
    }
  };
  const runtime = { fishMap: new Map([['goldfish', species]]) };
  const getRecord = (speciesId) => {
    const record = state.fishSpeciesMastery[speciesId] || (state.fishSpeciesMastery[speciesId] = { highestLevel: 1, unlockedVariantKeys: [] });
    if (!record.unlockedVariantKeys.includes('goldfish_base.png')) record.unlockedVariantKeys.unshift('goldfish_base.png');
    return record;
  };
  const canonicalFor = (fish) => {
    const index = Math.max(0, Math.min(species.assetVariants.length - 1, Number(fish.appearanceVariant) || 0));
    const selected = species.assetVariants[index];
    return { appearanceVariant: index, appearanceVariantKey: fileKey(selected), appearanceAssetPath: selected };
  };
  const fn = vm.runInNewContext(`(${extractFunction(events, 'normalizeOwnedFishAppearanceUnlocks')})`, {
    state,
    runtime,
    getAllTankFish: (target) => target.tanks.flatMap((tank) => tank.fish),
    getSpeciesForFish: (fish) => runtime.fishMap.get(fish.speciesId),
    isFishCareProgressionEligible: () => true,
    resolveCanonicalFishAppearanceSelection: canonicalFor,
    getFishSpeciesMasteryRecord: getRecord,
    getFishAppearanceVariantKey: fileKey
  });

  assert.equal(fn(), true);
  assert.equal(tankFish.appearanceVariantKey, 'goldfish_ranchu.png');
  assert.equal(tankFish.appearanceAssetPath, 'assets/fish/goldfish/goldfish_ranchu.png');
  assert.equal(storedFish.appearanceVariantKey, 'goldfish_black.png');
  assert.deepEqual(
    Array.from(state.fishSpeciesMastery.goldfish.unlockedVariantKeys).sort(),
    ['goldfish_base.png', 'goldfish_black.png', 'goldfish_ranchu.png'].sort()
  );
  assert.equal(fn(), false, 'grandfather reconciliation should be idempotent after the first pass');
});

test('Phase 34 stale Neon Tetra names preserve the saved numeric appearance index', () => {
  const variants = [
    'assets/fish/tetra-neon/tetra_neon-blue.png',
    'assets/fish/tetra-neon/tetra_neon-green.png',
    'assets/fish/tetra-neon/tetra_neon-purple.png',
    'assets/fish/tetra-neon/tetra_neon-pink.png',
    'assets/fish/tetra-neon/tetra_neon-red.png',
    'assets/fish/tetra-neon/tetra_neon-orange.png'
  ];
  const species = { id: 'tetra-neon', asset: variants[0], assetVariants: variants };
  const fish = {
    id: 'legacy-neon',
    appearanceVariant: 4,
    appearanceVariantKey: 'legacy_tetra_red.png',
    appearanceAssetPath: 'assets/fish/legacy/legacy_tetra_red.png'
  };
  const fn = vm.runInNewContext(`(${extractFunction(appearance, 'resolveCanonicalFishAppearanceSelection')})`, {
    getFishAssetVariants: () => variants,
    getFishAppearanceVariantKey: fileKey,
    normalizeFishAppearanceVariantIndex(value) {
      const raw = Number.isFinite(Number(value)) ? Math.floor(Number(value)) : 0;
      return ((raw % variants.length) + variants.length) % variants.length;
    }
  });
  const resolved = fn(fish, species);
  assert.equal(resolved.appearanceVariant, 4);
  assert.equal(resolved.appearanceVariantKey, 'tetra_neon-red.png');
  assert.equal(resolved.appearanceAssetPath, variants[4]);
});

test('Phase 34 mastery sanitization canonicalizes saved keys, preserves alternates, and always includes the base appearance', () => {
  const species = {
    id: 'guppy',
    asset: 'assets/fish/guppy/guppy_base.png',
    assetVariants: ['assets/fish/guppy/guppy_base.png', 'assets/fish/guppy/guppy_blue.png']
  };
  const runtime = { fishMap: new Map([['guppy', species]]) };
  const fn = vm.runInNewContext(`(${extractFunction(persistence, 'sanitizeFishSpeciesMastery')})`, {
    runtime,
    FISH_CARE_LEVEL_MIN: 1,
    FISH_CARE_LEVEL_MAX: 5,
    clamp(value, min, max) { return Math.max(min, Math.min(max, value)); },
    getFishAppearanceVariantKey: fileKey,
    isFishSpeciesCareProgressionEligible: () => true,
    getFishBaseAppearanceVariantKey: () => 'guppy_base.png'
  });
  const result = fn({
    guppy: {
      highestLevel: 3,
      unlockedVariantKeys: ['assets/fish/guppy/guppy_blue.png?v=old', 'guppy_blue.png'],
      masteredAt: 0,
      totalCareLevelUps: 2
    }
  });
  assert.equal(result.guppy.highestLevel, 3);
  assert.deepEqual(Array.from(result.guppy.unlockedVariantKeys), ['guppy_base.png', 'guppy_blue.png']);
});

test('Phase 34 older fish safely default progression fields without inferring XP from age', () => {
  assert.match(persistence, /if \(incomingVersion < 65\)/);
  assert.match(bootstrap, /const STATE_VERSION = 65;/);
  assert.match(fishSanitize, /careXp: Math\.max\(0, Math\.floor\(Number\(fish\.careXp\) \|\| 0\)\)/);
  assert.match(fishSanitize, /careLevel: clamp\(Math\.floor\(Number\(fish\.careLevel\) \|\| FISH_CARE_LEVEL_MIN\)/);
  assert.match(fishSanitize, /lastCareXpDayKey: typeof fish\.lastCareXpDayKey === "string" \? fish\.lastCareXpDayKey : ""/);
  assert.doesNotMatch(fishSanitize, /careXp[^\n]{0,120}(birthAt|ageDays|lifespan)/i);
});

test('Phase 34 reconciliation runs owned-appearance grandfathering on both startup and imported saves', () => {
  assert.match(startup, /const ownedFishVariantsChanged = normalizeOwnedFishAppearanceUnlocks\(\);/);
  assert.match(startup, /needsReconcileSave \|\| masteryBaseVariantsChanged \|\| ownedFishVariantsChanged/);
  assert.match(persistence, /const ownedFishVariantsChanged = typeof normalizeOwnedFishAppearanceUnlocks === "function"/);
  assert.match(persistence, /masteryBaseVariantsChanged \|\| ownedFishVariantsChanged \|\| customImagesChanged/);
});

test('Phase 34 completed milestones and existing unlock arrays remain sticky through sanitization', () => {
  assert.match(persistence, /Object\.fromEntries\(Object\.entries\(source\.milestones\)\.map\(\(\[key, value\]\) => \[String\(key\), Boolean\(value\)\]\)\)/);
  assert.match(persistence, /unlockedFishSpecies: sanitizeUnlockedFishSpecies\(incoming\.unlockedFishSpecies\)/);
  assert.match(persistence, /unlockedDecorKeys: sanitizeUnlockedDecorKeys\(incoming\.unlockedDecorKeys\)/);
});
