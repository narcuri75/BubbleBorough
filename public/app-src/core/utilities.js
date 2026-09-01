// Source fragment: core/utilities.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function createSceneSeeds() {
  const rand = mulberry32(34127);
  const contour = Array.from({ length: SUBSTRATE_CONTOUR_POINTS }, (_, index) => {
    const t = index / (SUBSTRATE_CONTOUR_POINTS - 1);
    const longWave = Math.sin(t * Math.PI * 1.12 + 0.3) * 0.18;
    const shortWave = Math.sin(t * Math.PI * 3.4 + 1.1) * 0.06;
    return longWave + shortWave + (rand() - 0.5) * 0.04;
  });
  return {
    bubbles: Array.from({ length: getAmbientBubbleSeedCount() }, () => {
      const styleRoll = rand();
      return {
        x: 0.08 + rand() * 0.84,
        size: 3.2 + rand() * 9.2,
        speed: 0.03 + rand() * 0.08,
        offset: rand(),
        wobble: 6 + rand() * 18,
        wave: 4 + rand() * 6,
        stretch: 0.84 + rand() * 0.42,
        alpha: 0.18 + rand() * 0.32,
        spriteScale: 2.8 + rand() * 2.6,
        spriteIndex: Math.floor(rand() * Math.max(1, runtime.bubbleCatalog.length || 3)),
        count: 2 + Math.floor(rand() * 3),
        style: styleRoll < 0.22 ? "sprite" : styleRoll < 0.52 ? "cluster" : styleRoll < 0.78 ? "fizz" : "ring",
        layer: 1 + Math.min(AMBIENT_BUBBLE_DEPTH_LAYERS - 1, Math.floor(Math.pow(rand(), 0.86) * AMBIENT_BUBBLE_DEPTH_LAYERS))
      };
    }),
    substrateContour: contour,
    grimeMarks: Array.from({ length: 70 }, () => ({
      x: rand(),
      y: rand(),
      rx: 36 + rand() * 120,
      ry: 10 + rand() * 46,
      rotation: rand() * Math.PI,
      color: rand() > 0.5 ? "rgba(124, 173, 74, 0.36)" : "rgba(96, 148, 69, 0.28)"
    }))
  };
}

function buildFishName(speciesId, takenNames) {
  const pool = runtime.fishMap.get(speciesId)?.defaultNames || [];
  const unused = pool.find((name) => !takenNames.includes(name));
  if (unused) {
    return unused;
  }

  const species = runtime.fishMap.get(speciesId);
  const count = takenNames.filter((name) => name.startsWith(species?.name || "Fish")).length + 1;
  return `${species?.name || "Fish"} ${count}`;
}

function renderHearts(units, maxUnits = Math.max(2, Math.round(Number(units) || 0))) {
  const clampedUnits = Math.max(0, Math.round(Number(units) || 0));
  const heartCount = Math.max(1, Math.ceil(Math.max(0, Number(maxUnits) || clampedUnits) / 2));
  return Array.from({ length: heartCount }, (_, index) => {
    const remaining = clampedUnits - index * 2;
    const klass = remaining >= 2 ? "full" : remaining === 1 ? "half" : "";
    return `<span class="heart ${klass}">&#9829;</span>`;
  }).join("");
}

function createId(prefix) {
  if (window.crypto?.randomUUID) {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(value);
}

function formatLcdNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "0";
  }

  return String(Math.max(0, Math.floor(number)));
}

function formatDuration(ms) {
  if (ms <= 0) {
    return "0m";
  }

  const totalMinutes = Math.ceil(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function timeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) {
    return "Just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function titleFromFile(fileName) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/_bubbler$/i, "")
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function pluralize(word, amount) {
  return amount === 1 ? word : `${word}s`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomBetweenWith(rand, min, max) {
  const sample = typeof rand === "function" ? rand() : Math.random();
  return min + sample * (max - min);
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x1 - x2, y1 - y2);
}

function mulberry32(seed) {
  let current = seed;
  return () => {
    current |= 0;
    current = (current + 0x6d2b79f5) | 0;
    let t = Math.imul(current ^ (current >>> 15), 1 | current);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
