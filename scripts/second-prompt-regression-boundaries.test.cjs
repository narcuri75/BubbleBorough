const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', 'game');
const SRC = path.join(ROOT, 'public', 'app-src');
const read = relative => fs.readFileSync(path.join(SRC, relative), 'utf8');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

function extractFunction(relative, name) {
  const source = read(relative);
  const match = new RegExp(`\\b(?:async\\s+)?function\\s+${name.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\s*\\(`).exec(source);
  assert.ok(match, `missing protected function ${name} in ${relative}`);
  const braceStart = source.indexOf('{', match.index + match[0].length);
  assert.ok(braceStart >= 0, `missing function body for ${name}`);

  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = braceStart; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1] || '';
    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(match.index, index + 1);
    }
  }
  assert.fail(`unterminated protected function ${name}`);
}

function assertFunctionHash(relative, name, expected) {
  assert.equal(
    sha256(extractFunction(relative, name)),
    expected,
    `${name} changed even though the second prompt only permits schooling-eligibility changes, not movement behavior`
  );
}

function assertFileHash(relative, expected, label) {
  const data = fs.readFileSync(path.join(SRC, relative));
  assert.equal(sha256(data), expected, `${label} changed outside the second-prompt scope`);
}

test('Second prompt hard boundary preserves fish travel-speed and target-motion code', () => {
  const relative = 'fish/predators-and-motion.js';
  assertFunctionHash(relative, 'updateFishMotion', '2a16f08bc7802c3188dd87cd1eee38bc3657350a6c0a1c8af44069091118685a');
  assertFunctionHash(relative, 'getFishProfileRoamSpeed', '8878af0d359a27ba387a9acd906f263359ebd68296184a528ef928927c756cab');
  assertFunctionHash(relative, 'assignSwimTarget', 'ec94ea7a7fd63864e5ad35ae5caa840bf681f3cd6ea4ee05109300e8f4e7ef86');
});

test('Second prompt hard boundary preserves swim animation, deformation, head-tail warp, and turn smoothing', () => {
  assertFileHash(
    'rendering/fish-and-effects.js',
    'be7e78e6d43ebeb41cd32be949b0661c384964a611e8538ae3dbfc34978b56f9',
    'fish swim/deformation renderer'
  );
});

test('Second prompt hard boundary preserves schooling leader and formation geometry', () => {
  const relative = 'fish/gravel-and-schooling.js';
  const protectedFunctions = {
    isFishEligibleSchoolLeader: '1d8ad35497178c9cc3c3c6ea48f7733b75ff7d284c7e40eead3b1eebb83f7d5c',
    getFishSchoolFormationSubLayerPattern: 'b4674c996f49b596073484b04ac3173978d12bbfcf659e050e81d14f7f9b333b',
    assignFishSchoolFormationDepthSlot: '3a45e669159afbe376cf5845cca3e4e33b4cdf2862ff9ca659930f64d9edae81',
    getFishSchoolActiveFollowers: '275ff72c393ead2ad2a75213b6855299ed73bb14198001eef2ff17185dc3515f',
    getFishSchoolStableRank: '06734b582512ef5ae5a9c2f1294789cc9c7fa2b65934238dc79336ffb29c0711',
    assignFishSchoolFormationSlot: '2bdd878ae468627e5b98bebd92c94e51e8fac78b6ef0cd6a322b46c1a97b9b1c',
    getFishSchoolFormationOffset: 'b5623fcd28fa9d115f43191ca7ae17b74b4505219ff8d092133f6972084831e4',
    getFishSchoolFollowAnchor: 'c54f1e1eb3d9af860852b1a8b1ff7224e7e2561bda2d1374289efa037098d75e',
    getFishSchoolFollowFacingDirection: '1456e1274b3776bf79c4dc511b64ccb9b5c54f382d09e5fd05e2c651e33e2d64',
    updateFishSchoolFollowTarget: '66317a8617bbca410989a7ebaf8ab15b3956a12b67323b08cabdf1a0190f62b5'
  };
  for (const [name, expected] of Object.entries(protectedFunctions)) {
    assertFunctionHash(relative, name, expected);
  }
});

test('Second prompt hard boundary preserves fish sizing code', () => {
  assertFileHash('fish/appearance.js', '9e5e5dc67f308bec11a0bd77e6321c33e76bf4db4afc72fd634f430ba6e80443', 'fish appearance/size code');
  assertFileHash('fish/health.js', '6e4a93235f2cff2e26ca55d1172627c9c5657d1071c071511b439c1c77d7c430', 'fish visual-size/health code');
});

test('Second prompt hard boundary preserves feeding behavior', () => {
  assertFileHash(
    'fish/feeding-and-medicine.js',
    'd649ad811da761eaeccd1a9faefd296f8752d806c57ca63be9e0f508b22e5939',
    'feeding and medicine behavior'
  );
});

test('Second prompt hard boundary preserves rock pickup and drop behavior', () => {
  const relative = 'fish/gravel-and-schooling.js';
  const protectedFunctions = {
    clearFishGravelPebbleAction: '8b0f2bc366bd66e4de1ef0fdd09b243b03b9e07cfea34b7809b393d31e8eb00f',
    createFishGravelPebbleAction: '9c1560d383e9ef6c0bab0fdcfe79f04018709fd1dd7d7409b5f9fcf436f4ebb0',
    startFishGravelPebbleAction: '346e336c27632cff7c4b121a7272129133d60004af18ed4c11c10a67fa9d16ca',
    spawnFishGravelPebbleToss: '5a1c6d4b7a154ed7d2cb5d104df7b2ab5e8030e3536b53accceb9175efa47979',
    updateFishGravelPebbleAction: '508672a367fe88664d132f4b9ec1ea190e09db59950791fe43f2eed492c1f5a7'
  };
  for (const [name, expected] of Object.entries(protectedFunctions)) {
    assertFunctionHash(relative, name, expected);
  }
});
