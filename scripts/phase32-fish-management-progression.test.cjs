const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const UI_PATH = path.join(ROOT, 'public/app-src/ui/customization-actions-and-inventory.js');
const ui = fs.readFileSync(UI_PATH, 'utf8');
const styles = fs.readFileSync(path.join(ROOT, 'public/styles.css'), 'utf8');

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

const presentationSource = extractFunction(ui, 'getFishManagementProgressionPresentation');

function makePresentation(overrides = {}) {
  const variantPaths = Array.from({ length: 10 }, (_, index) => `/fish/goldfish_${index + 1}.png`);
  const unlockedVariantKeys = variantPaths.slice(0, 6).map((entry) => path.basename(entry));
  const context = {
    FISH_CARE_LEVEL_MIN: 1,
    FISH_CARE_LEVEL_MAX: 5,
    clamp(value, min, max) { return Math.max(min, Math.min(max, value)); },
    isFishCareProgressionEligible: () => overrides.eligible !== false,
    getFishCareLevelThresholds: () => ({ 1: 0, 2: 5, 3: 12, 4: 27, 5: 45 }),
    getFishSpeciesMasteryRecord: () => ({
      highestLevel: overrides.masteryLevel ?? 4,
      unlockedVariantKeys: overrides.unlockedVariantKeys ?? unlockedVariantKeys
    }),
    getFishProgressionAppearanceVariants: () => overrides.variantPaths ?? variantPaths,
    getFishAppearanceVariantKey: (entry) => path.basename(String(entry)),
    getFishBaseAppearanceVariantKey: () => path.basename((overrides.variantPaths ?? variantPaths)[0]),
  };
  const fn = vm.runInNewContext(`(${presentationSource})`, context);
  return fn(
    { careXp: overrides.careXp ?? 18, careLevel: overrides.careLevel ?? 3 },
    { id: 'goldfish', asset: variantPaths[0] }
  );
}

test('Phase 32 shows individual Care Level and cumulative XP toward the next level', () => {
  const progress = makePresentation();
  assert.equal(progress.levelLabel, 'Lv. 3');
  assert.equal(progress.xpLabel, '18 / 27 Care XP');
  assert.equal(progress.nextLevelThreshold, 27);
  assert.equal(progress.careLevel, 3);
});

test('Phase 32 shows Level 5 as MAX instead of a fake next threshold', () => {
  const progress = makePresentation({ careXp: 52, careLevel: 5, masteryLevel: 5 });
  assert.equal(progress.levelLabel, 'Lv. 5 MAX');
  assert.equal(progress.xpLabel, '');
  assert.equal(progress.nextLevelThreshold, null);
  assert.equal(progress.masteryLabel, 'Species Mastery: Lv. 5');
});

test('Phase 32 keeps individual level separate from species mastery and variant collection', () => {
  const progress = makePresentation({ careLevel: 3, masteryLevel: 4 });
  assert.equal(progress.levelLabel, 'Lv. 3');
  assert.equal(progress.masteryLabel, 'Species Mastery: Lv. 4');
  assert.equal(progress.variantsLabel, 'Variants: 6/10');
  assert.equal(progress.unlockedVariantCount, 6);
  assert.equal(progress.totalVariantCount, 10);
});

test('Phase 32 does not show fake Care Levels for progression-excluded special fish', () => {
  assert.equal(makePresentation({ eligible: false }), null);
});

test('Phase 32 Fish Management cards render compact progression UI and cache progression state', () => {
  assert.match(ui, /const progression = getFishManagementProgressionPresentation\(fish, species\);/);
  assert.match(ui, /fish-care-level-badge/);
  assert.match(ui, /fish-care-xp-track/);
  assert.match(ui, /progression\.masteryLabel/);
  assert.match(ui, /progression\.variantsLabel/);
  assert.match(ui, /Math\.max\(0, Math\.floor\(Number\(fish\.careXp\) \|\| 0\)\)/);
  assert.match(ui, /Object\.entries\(state\.fishSpeciesMastery \|\| \{\}\)/);
  assert.match(styles, /\.fish-progression-summary/);
  assert.match(styles, /\.fish-care-xp-track/);
});

test('Phase 32 does not add permanent Care Level labels to tank rendering code', () => {
  const renderingDir = path.join(ROOT, 'public/app-src/rendering');
  const renderingText = fs.readdirSync(renderingDir)
    .filter((name) => name.endsWith('.js'))
    .map((name) => fs.readFileSync(path.join(renderingDir, name), 'utf8'))
    .join('\n');
  assert.doesNotMatch(renderingText, /fish-care-level-badge|fish-care-xp-track|Species Mastery: Lv\./);
});
