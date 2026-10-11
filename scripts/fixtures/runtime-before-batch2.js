// Frozen pre-batch-2 reference algorithms for state/output parity tests.
// Test oracle only; not included in the game bundle. Extracted from preserved
// app.js SHA-256 74e96b10bfd4aec60fa96f126967a0978db44d2d687e307ab56580917fa84d6a.
function updateFishNeeds(now = Date.now()) {
  if ((typeof isPeacefulModeEnabled === "function" && isPeacefulModeEnabled())) {
    return typeof enforcePeacefulModeState === "function" ? enforcePeacefulModeState(now) : false;
  }
  let changed = false;
  const socialTank = typeof getCurrentTank === "function" ? getCurrentTank() : null;
  // Social relationships are evaluated once per simulation update and cached.
  // Mood/render reads reuse this snapshot instead of rescanning the tank every frame.
  if (typeof refreshFishSocialSatisfactionCache === "function") {
    refreshFishSocialSatisfactionCache(socialTank, now);
  }
  for (const fish of getLivingTankFish()) {
    fish.needs = sanitizeFishNeeds(fish.needs, fish, now);
    changed = updateFishLoneliness(fish, socialTank, now) || changed;
    const previousUpdatedAt = Number.isFinite(Number(fish.needsUpdatedAt)) ? Number(fish.needsUpdatedAt) : now;
    const elapsedMs = clamp(now - previousUpdatedAt, 0, FISH_NEEDS_MAX_OFFLINE_MS);
    if (elapsedMs <= 0) {
      continue;
    }
    const deltas = calculateFishNeedDeltas(fish, now, elapsedMs);
    if (!deltas) {
      continue;
    }
    for (const key of FISH_NEED_KEYS) {
      changed = setFishNeedValue(fish, key, fish.needs[key] + (Number(deltas[key]) || 0), now) || changed;
    }
    fish.needsUpdatedAt = now;
    if (!isMealFreeFish(fish) && fish.needs.hunger <= FISH_HUNGER_CRITICAL_THRESHOLD) {
      maybeRecordFishNeedEvent(fish, "starving", `${fish.name} is starving.`, now, 2 * HOUR_MS);
      fish.lastNeedEventAtByType = sanitizeFishNeedEventMap(fish.lastNeedEventAtByType);
      if (now - (Number(fish.lastNeedEventAtByType["starve-damage"]) || 0) >= 2 * HOUR_MS) {
        fish.lastNeedEventAtByType["starve-damage"] = now;
        fish.healthUnits = Math.max(0, Number(fish.healthUnits) - 1);
        if (fish.healthUnits <= 0) {
          markFishAsDead(fish, now, `${fish.name} died from starvation.`);
        } else {
          pushEvent(`${fish.name} lost a half-heart from starvation.`, now, getCurrentTank(), { score: -2, type: "need", fishId: fish.id });
        }
        changed = true;
      }
    }
  }
  return changed;
}

function getFishAssetPath(fish, species = getSpeciesForFish(fish)) {
  const variants = getFishAssetVariants(species);
  if (!variants.length) {
    return species?.asset || species?.fallbackAsset || null;
  }

  const purchasedAssetKey = getFishAppearanceVariantKey(fish?.appearanceAssetPath);
  const purchasedAsset = variants.find((path) => getFishAppearanceVariantKey(path) === purchasedAssetKey);
  if (purchasedAsset) return purchasedAsset;

  const chosen = variants.find((path) => getFishAppearanceVariantKey(path) === fish?.appearanceVariantKey);
  if (chosen) return chosen;

  return variants[normalizeFishAppearanceVariantIndex(fish?.appearanceVariant, species, fish)] || variants[0] || species?.fallbackAsset || species?.asset || null;
}
