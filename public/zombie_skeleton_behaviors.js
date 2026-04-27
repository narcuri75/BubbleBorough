export const ZOMBIE_SKELETON_FEATURE_DEFAULT_ENABLED = false;

export const ZOMBIE_SKELETON_FISH_CATALOG_PATH = "assets/fish/zombie_skeleton_fish/zombie_skeleton_fish.json";
export const ZOMBIE_SKELETON_FISH_ASSET_FOLDER = "fish/zombie_skeleton_fish";

export const ZOMBIE_SKELETON_SPECIES_IDS = Object.freeze([
  "zombie-fish",
  "skeleton-fish"
]);

export const ZOMBIE_SKELETON_UNDEAD_TYPES = Object.freeze([
  "zombie",
  "skeleton"
]);

export const ZOMBIE_SKELETON_BEHAVIOR_CONFIG = Object.freeze({
  fishDecayZombieMs: 12 * 60 * 60 * 1000,
  fishDecaySkeletonMs: 24 * 60 * 60 * 1000,
  biteFatalMs: 30 * 1000,
  biteBloodIntervalMs: 1000,
  biteReviveMinMs: 60 * 1000,
  biteReviveMaxMs: 2 * 60 * 1000,
  attackTargetRefreshMs: 820,
  undeadComfortPenalty: 0.1,
  maxUndeadComfortPenalty: 0.4
});

export const ZOMBIE_SKELETON_COMFORT_PROFILES = Object.freeze({
  "zombie-fish": Object.freeze({
    mealCoins: 0,
    unlock: "spooky-keeper",
    needs: Object.freeze(["spooky", "cave"]),
    conflicts: Object.freeze(["the_cure", "community_fish"])
  }),
  "skeleton-fish": Object.freeze({
    mealCoins: 0,
    unlock: "spooky-keeper",
    needs: Object.freeze(["spooky", "cave"]),
    conflicts: Object.freeze(["the_cure", "overcrowded"])
  })
});

export const ZOMBIE_SKELETON_PROGRESSION_UNLOCKS = Object.freeze([
  "zombie-fish",
  "skeleton-fish"
]);

function normalizeList(...values) {
  return values
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .map((value) => String(value || "").trim())
    .filter((value, index, entries) => Boolean(value) && entries.indexOf(value) === index);
}

function encodePathSegments(path) {
  return String(path || "")
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

export function isZombieSkeletonStage(value) {
  return ZOMBIE_SKELETON_UNDEAD_TYPES.includes(String(value || "").trim().toLowerCase());
}

export function isZombieSkeletonUndeadType(value) {
  return isZombieSkeletonStage(value);
}

export function isZombieSkeletonCatalogSpecies(entry) {
  const speciesId = typeof entry === "string" ? entry : entry?.id || entry?.speciesId;
  return ZOMBIE_SKELETON_SPECIES_IDS.includes(String(speciesId || "").trim())
    || isZombieSkeletonUndeadType(entry?.undeadType);
}

export function isZombieSkeletonAssetFile(value) {
  const fileName = String(value?.key || value?.file || value?.path || value || "")
    .trim()
    .split(/[\\/]/)
    .pop()
    .replace(/\?.*$/, "");
  return /_(zombie|skeleton)\.[^.]+$/i.test(fileName);
}

export function getZombieSkeletonEffectiveBehavior({ enabled, fish = null, species = null, isZombieVariantFish = () => false } = {}) {
  if (!enabled || !species) {
    return null;
  }
  if (isZombieVariantFish(fish) || species.undeadType === "zombie") {
    return "zombie";
  }
  if (species.undeadType === "skeleton") {
    return "skeleton";
  }
  return null;
}

export function usesZombieSkeletonHunterBehavior({ enabled, target = null, isZombieFish = () => false } = {}) {
  return Boolean(enabled && isZombieFish(target));
}

export function canZombieSkeletonUsePassAttack({ enabled, species = null } = {}) {
  return Boolean(enabled && species?.undeadType === "skeleton");
}

export function canZombieSkeletonPassAttackTarget({ enabled, attackerSpecies = null, target = null, isUndeadFish = () => false } = {}) {
  if (!enabled || attackerSpecies?.undeadType !== "skeleton") {
    return null;
  }
  return !isUndeadFish(target);
}

export function resolveZombieSkeletonCatalogAssetPath(assetFile, options = {}) {
  const trimmedAssetFile = String(assetFile || "").trim();
  if (!trimmedAssetFile) {
    return null;
  }

  const resolveAppUrl = typeof options.resolveAppUrl === "function"
    ? options.resolveAppUrl
    : (path) => path;
  if (/[\\/]/.test(trimmedAssetFile) || /^[a-z]+:/i.test(trimmedAssetFile)) {
    return resolveAppUrl(trimmedAssetFile.replaceAll("\\", "/"));
  }

  const assetFolder = String(options.assetFolder || ZOMBIE_SKELETON_FISH_ASSET_FOLDER)
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replaceAll("\\", "/");
  return resolveAppUrl(`assets/${assetFolder}/${encodePathSegments(trimmedAssetFile)}`);
}

export function mergeZombieSkeletonStageAssets(fishCatalog, zombieSkeletonCatalog, options = {}) {
  if (!Array.isArray(fishCatalog) || !zombieSkeletonCatalog || typeof zombieSkeletonCatalog !== "object") {
    return fishCatalog;
  }

  const assetFolder = String(zombieSkeletonCatalog.assetFolder || ZOMBIE_SKELETON_FISH_ASSET_FOLDER);
  const bySpeciesId = new Map();

  for (const variant of Array.isArray(zombieSkeletonCatalog.variants) ? zombieSkeletonCatalog.variants : []) {
    const speciesId = String(variant?.speciesId || variant?.id || "").trim();
    if (!speciesId) {
      continue;
    }

    const entry = bySpeciesId.get(speciesId) || {
      zombieAssetVariants: [],
      skeletonAssetVariants: []
    };

    for (const assetFile of normalizeList(variant.zombieAsset, variant.zombieImage, variant.zombieFile, variant.zombieAssetVariants, variant.zombieAssets)) {
      const assetPath = resolveZombieSkeletonCatalogAssetPath(assetFile, {
        assetFolder: variant.assetFolder || assetFolder,
        resolveAppUrl: options.resolveAppUrl
      });
      if (assetPath && !entry.zombieAssetVariants.includes(assetPath)) {
        entry.zombieAssetVariants.push(assetPath);
      }
    }

    for (const assetFile of normalizeList(variant.skeletonAsset, variant.skeletonImage, variant.skeletonFile, variant.skeletonAssetVariants, variant.skeletonAssets)) {
      const assetPath = resolveZombieSkeletonCatalogAssetPath(assetFile, {
        assetFolder: variant.assetFolder || assetFolder,
        resolveAppUrl: options.resolveAppUrl
      });
      if (assetPath && !entry.skeletonAssetVariants.includes(assetPath)) {
        entry.skeletonAssetVariants.push(assetPath);
      }
    }

    bySpeciesId.set(speciesId, entry);
  }

  if (!bySpeciesId.size) {
    return fishCatalog;
  }

  return fishCatalog.map((species) => {
    const stageAssets = bySpeciesId.get(species?.id);
    if (!stageAssets) {
      return species;
    }

    return {
      ...species,
      zombieAssetVariants: [
        ...stageAssets.zombieAssetVariants,
        ...(Array.isArray(species.zombieAssetVariants) ? species.zombieAssetVariants : [])
      ].filter((path, index, entries) => Boolean(path) && entries.indexOf(path) === index),
      skeletonAssetVariants: [
        ...stageAssets.skeletonAssetVariants,
        ...(Array.isArray(species.skeletonAssetVariants) ? species.skeletonAssetVariants : [])
      ].filter((path, index, entries) => Boolean(path) && entries.indexOf(path) === index)
    };
  });
}
