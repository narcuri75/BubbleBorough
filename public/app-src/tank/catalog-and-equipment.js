// Source fragment: tank/catalog-and-equipment.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function normalizeStringList(value) {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  return source
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
}

function isHalloweenDecor(decor) {
  return /halloween/i.test([decor?.name, decor?.key, decor?.file, decor?.theme].filter(Boolean).join(" "))
    || normalizeStringList(decor?.categories).some((tag) => tag.toLowerCase() === "halloween");
}

function isChristmasDecor(decor) {
  return /christmas|xmas/i.test([decor?.name, decor?.key, decor?.file, decor?.theme].filter(Boolean).join(" "))
    || normalizeStringList(decor?.categories).some((tag) => ["christmas", "xmas"].includes(tag.toLowerCase()));
}

function isNewYearDecor(decor) {
  return /new[ _-]?year|newyear|new year's|nye/i.test([decor?.name, decor?.key, decor?.file, decor?.theme].filter(Boolean).join(" "))
    || normalizeStringList(decor?.categories).some((tag) => ["new-year", "newyear", "new-years", "nye"].includes(tag.toLowerCase()));
}

function isSeasonalDecor(decor) {
  return isHalloweenDecor(decor) || isChristmasDecor(decor) || isNewYearDecor(decor);
}

function isSeasonalDecorAvailable(decor, now = Date.now()) {
  // Calendar availability is independent of the visual-mode override: players
  // can preview a theme in settings, but seasonal goods only sell in season.
  if (isHalloweenDecor(decor)) {
    return isHalloweenCalendarDate(now);
  }
  const date = new Date(getBoroughReferenceNow(now));
  if (isNewYearDecor(decor)) {
    return date.getMonth() === 11 && date.getDate() >= 26;
  }
  if (isChristmasDecor(decor)) {
    return date.getMonth() === 11 && date.getDate() <= 25;
  }
  return true;
}

function deriveDecorCategories(entry, key) {
  const configured = normalizeStringList(entry?.categories || entry?.category)
    .map((value) => value.toLowerCase())
    .filter((value) => value && value !== "halloween" && value !== "frozen" && value !== "reef" && value !== "natural");
  if (configured.length) {
    return [...new Set(configured.flatMap((value) => value.split("-")).filter(Boolean))];
  }

  const fileKey = String(key || entry?.file || "").toLowerCase();
  const conventionMatch = fileKey.match(/^[^/]+__([^_]+?)(?:__theme-[^_]+)?(?:__|\.)/);
  if (conventionMatch) {
    return [...new Set(conventionMatch[1].split("-").filter(Boolean))];
  }

  const bucket = new Set();
  const haystack = `${String(entry?.name || "")} ${fileKey}`.toLowerCase();
  if (/cave|hide|wreck|castle|house|arch/.test(haystack)) bucket.add("cave");
  if (/weed|plant|moss|anub|algae/.test(haystack)) bucket.add("plant");
  if (/coral|anemone|reef/.test(haystack)) bucket.add("coral");
  if (/rock|stone|slate|meteor/.test(haystack)) bucket.add("rock");
  if (/wood|root|branch|twig/.test(haystack)) bucket.add("wood");
  if (/lure/.test(haystack)) bucket.add("lure");
  if (/bubbler/.test(haystack)) bucket.add("bubbler");
  if (!bucket.size) bucket.add("ornament");
  return [...bucket];
}

function normalizeDecorBehaviorType(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return ["static", "anchored_sway", "floating_bob", "floating_sway", "ceiling_sway", "cave_layered", "bubbler", "transit"].includes(normalized)
    ? normalized
    : "";
}

function getDecorCatalogRecord(itemOrKey) {
  const decorKey = typeof itemOrKey === "string" ? itemOrKey : itemOrKey?.decorKey || itemOrKey?.key;
  if (!decorKey) return null;
  return runtime.decorMap?.get?.(decorKey) || runtime.decorMeta?.[decorKey] || null;
}

function getDecorCategoryList(itemOrKey) {
  const decorKey = typeof itemOrKey === "string" ? itemOrKey : itemOrKey?.decorKey || itemOrKey?.key;
  const decor = getDecorCatalogRecord(itemOrKey) || (itemOrKey && typeof itemOrKey === "object" ? itemOrKey : {});
  return deriveDecorCategories(decor, decorKey).map((value) => String(value || "").toLowerCase()).filter(Boolean);
}

function decorHasCategory(itemOrKey, category) {
  const target = String(category || "").trim().toLowerCase();
  return target ? getDecorCategoryList(itemOrKey).includes(target) : false;
}

function getDecorTagList(itemOrKey) {
  const decor = getDecorCatalogRecord(itemOrKey) || (itemOrKey && typeof itemOrKey === "object" ? itemOrKey : {});
  return normalizeStringList(decor?.tags).map((value) => value.toLowerCase());
}

function decorHasTag(itemOrKey, tag) {
  const target = String(tag || "").trim().toLowerCase();
  return target ? getDecorTagList(itemOrKey).includes(target) : false;
}

function getDecorTheme(itemOrKey) {
  const decor = getDecorCatalogRecord(itemOrKey) || (itemOrKey && typeof itemOrKey === "object" ? itemOrKey : {});
  return String(decor?.theme || "").trim().toLowerCase();
}

function decorHasTheme(itemOrKey, theme) {
  return getDecorTheme(itemOrKey) === String(theme || "").trim().toLowerCase();
}

function getDecorBehaviorType(itemOrKey) {
  const decor = getDecorCatalogRecord(itemOrKey) || (itemOrKey && typeof itemOrKey === "object" ? itemOrKey : {});
  return normalizeDecorBehaviorType(decor?.behavior);
}

function getDecorMotionBehaviorType(itemOrKey) {
  const decor = getDecorCatalogRecord(itemOrKey) || (itemOrKey && typeof itemOrKey === "object" ? itemOrKey : {});
  return normalizeDecorBehaviorType(decor?.motionBehavior) || getDecorBehaviorType(itemOrKey);
}

function getDecorMotionLayer(itemOrKey) {
  const decor = getDecorCatalogRecord(itemOrKey) || (itemOrKey && typeof itemOrKey === "object" ? itemOrKey : {});
  const layer = String(decor?.motionLayer || "").trim().toLowerCase();
  return ["front", "bg", "all"].includes(layer) ? layer : "all";
}

function getDecorAssetPathForKey(decorKey = "") {
  const normalizedKey = normalizeDecorKey(decorKey);
  const decor = runtime.decorMap?.get?.(normalizedKey) || runtime.decorMap?.get?.(decorKey) || runtime.decorMeta?.[normalizedKey] || runtime.decorMeta?.[decorKey] || null;
  if (decor?.path) return decor.path;
  const behavior = normalizeDecorBehaviorType(decor?.behavior);
  const encodedKey = String(normalizedKey || decorKey).split("/").map((part) => encodeURIComponent(part)).join("/");
  return resolveAppUrl(behavior ? `assets/decor/${behavior}/${encodedKey}` : `assets/decor/${encodedKey}`);
}

function normalizeDecorHangoutTypes(value) {
  if (value === false || value === null) {
    return { explicit: value === false || value === null, types: [] };
  }

  const rawTypes = normalizeStringList(value)
    .map((entry) => entry.toLowerCase().replace(/[-_\s]+/g, "-"))
    .filter(Boolean);
  const explicit = rawTypes.length > 0;
  const aliases = {
    caves: "hide",
    cave: "hide",
    hideout: "hide",
    hides: "hide",
    arch: "hide",
    shelter: "hide",
    plant: "plant",
    plants: "plant",
    seaweed: "plant",
    moss: "plant",
    hardscape: "hardscape",
    ornament: "hardscape",
    ornaments: "hardscape",
    rock: "hardscape",
    rocks: "hardscape",
    chest: "hardscape",
    lure: "lure",
    lures: "lure",
    bubbler: "bubbler",
    bubble: "bubbler",
    spooky: "spooky",
    none: "none",
    off: "none"
  };
  const allowed = new Set(["hide", "plant", "hardscape", "lure", "bubbler", "spooky"]);
  const types = [];

  for (const rawType of rawTypes) {
    const type = aliases[rawType] || rawType;
    if (type === "none") {
      return { explicit: true, types: [] };
    }

    if (allowed.has(type) && !types.includes(type)) {
      types.push(type);
    }
  }

  return { explicit, types };
}

function normalizeDecorFishBehaviorMeta(entry, key = "") {
  const source = entry?.fishBehavior && typeof entry.fishBehavior === "object"
    ? entry.fishBehavior
    : null;
  const hangoutSource = source
    ? (source.hangoutTypes ?? source.hangouts ?? source.hangout ?? source.type)
    : undefined;
  const normalizedHangout = normalizeDecorHangoutTypes(hangoutSource);
  const hangoutTypes = [...normalizedHangout.types];

  if (source?.lure === true && !hangoutTypes.includes("lure")) {
    hangoutTypes.push("lure");
  }

  if (source?.bubblerAttraction === true && !hangoutTypes.includes("bubbler")) {
    hangoutTypes.push("bubbler");
  }

  const allowedServices = new Set(["food", "home", "clinic", "social", "rest", "nursery"]);
  const serviceTypes = normalizeStringList(source?.services ?? source?.service)
    .map((value) => value.toLowerCase().replace(/[-_\s]+/g, "-"))
    .filter((value, index, values) => allowedServices.has(value) && values.indexOf(value) === index);
  const serviceSeats = Array.isArray(source?.serviceSeats)
    ? source.serviceSeats.map((seat, index) => ({
      id: typeof seat?.id === "string" && seat.id.trim() ? seat.id.trim() : `seat-${index + 1}`,
      x: clamp(Number(seat?.x) || 0.5, 0.05, 0.95),
      y: clamp(Number(seat?.y) || 0.55, 0.05, 0.95),
      layer: Number.isFinite(Number(seat?.layer)) ? clampTankLayer(Number(seat.layer)) : null,
      direction: Number(seat?.direction) < 0 ? -1 : 1
    })).slice(0, 12)
    : [];

  return {
    explicitHangout: normalizedHangout.explicit || Boolean(source),
    hangoutTypes,
    serviceTypes,
    serviceSeats,
    occupancyLimit: Number.isFinite(Number(source?.occupancyLimit))
      ? Math.max(1, Math.floor(Number(source.occupancyLimit)))
      : null,
    note: typeof source?.note === "string" ? source.note.trim() : ""
  };
}

function normalizeFishNeeds(entry) {
  const source = entry?.needs && typeof entry.needs === "object" ? entry.needs : {};
  const friends = source.friends && typeof source.friends === "object" ? source.friends : {};
  const minFriends = Number.isFinite(Number(friends.min ?? source.friendMin))
    ? Math.max(0, Math.floor(Number(friends.min ?? source.friendMin)))
    : 0;
  const alikeOnly = friends.alike === true || source.alike === true;
  return {
    decor: normalizeStringList(source.decor).map((value) => value.toLowerCase()),
    friends: {
      min: minFriends,
      alikeOnly
    }
  };
}

function normalizeComfortTagList(values) {
  return normalizeStringList(values)
    .map((value) => value.toLowerCase().replace(/[\s-]+/g, "_"))
    .filter((value, index, list) => Boolean(value) && list.indexOf(value) === index);
}

function normalizeFishSocialCategory(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  const allowed = typeof FISH_SOCIAL_CATEGORIES !== "undefined"
    ? Object.values(FISH_SOCIAL_CATEGORIES)
    : ["own_kind_required", "own_kind_preferred", "pair_bond", "flexible", "solitary", "host_bond"];
  return allowed.includes(normalized) ? normalized : "";
}

function normalizeFishSocialSizeClass(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "-");
  const allowed = typeof FISH_SOCIAL_SIZE_CLASSES !== "undefined"
    ? Object.values(FISH_SOCIAL_SIZE_CLASSES)
    : ["tiny", "small", "medium", "large", "giant"];
  return allowed.includes(normalized) ? normalized : "";
}

function getFishSocialSizeLabel(sizeClass) {
  const normalized = normalizeFishSocialSizeClass(sizeClass) || "medium";
  if (typeof FISH_SOCIAL_SIZE_LABELS !== "undefined" && FISH_SOCIAL_SIZE_LABELS[normalized]) {
    return FISH_SOCIAL_SIZE_LABELS[normalized];
  }
  return normalized ? normalized[0].toUpperCase() + normalized.slice(1) : "Medium";
}

function getFishSocialSizeRank(sizeClass) {
  const normalized = normalizeFishSocialSizeClass(sizeClass) || "medium";
  if (typeof FISH_SOCIAL_SIZE_RANKS !== "undefined" && Number.isFinite(Number(FISH_SOCIAL_SIZE_RANKS[normalized]))) {
    return Number(FISH_SOCIAL_SIZE_RANKS[normalized]);
  }
  return ({ tiny: 0, small: 1, medium: 2, large: 3, giant: 4 })[normalized] ?? 2;
}

function getFishSocialCategoryLabel(category) {
  const normalized = normalizeFishSocialCategory(category) || "flexible";
  if (typeof FISH_SOCIAL_CATEGORY_LABELS !== "undefined" && FISH_SOCIAL_CATEGORY_LABELS[normalized]) {
    return FISH_SOCIAL_CATEGORY_LABELS[normalized];
  }
  return normalized.split("_").map((part) => part ? part[0].toUpperCase() + part.slice(1) : "").join(" ");
}

function getFishSocialProfile(speciesOrFish) {
  const fish = speciesOrFish && typeof speciesOrFish === "object" && speciesOrFish.speciesId
    ? speciesOrFish
    : null;
  const species = fish
    ? (typeof getSpeciesForFish === "function" ? getSpeciesForFish(fish) : null)
    : typeof speciesOrFish === "string"
      ? (typeof runtime !== "undefined" && runtime?.fishMap?.get ? runtime.fishMap.get(speciesOrFish) : null)
      : speciesOrFish;
  const speciesId = String(species?.id || fish?.speciesId || (typeof speciesOrFish === "string" ? speciesOrFish : "") || "");
  const explicitCategory = normalizeFishSocialCategory(
    fish?.socialCategory
    || species?.socialCategory
    || species?.socialProfile?.category
  );
  const configuredSpeciesProfile = speciesId && typeof FISH_SOCIAL_PROFILES !== "undefined"
    ? FISH_SOCIAL_PROFILES[speciesId]
    : null;

  let category = explicitCategory;
  let source = explicitCategory ? "explicit" : "default";

  if (!category && configuredSpeciesProfile) {
    category = normalizeFishSocialCategory(configuredSpeciesProfile.category);
    if (category) {
      source = "species-social-profile";
    }
  }

  if (!category && species?.customAsset) {
    const affinity = typeof normalizeCustomFishSocialAffinity === "function"
      ? normalizeCustomFishSocialAffinity(species.socialAffinity)
      : ["independent", "schooling"].includes(String(species.socialAffinity || "").toLowerCase())
        ? String(species.socialAffinity || "").toLowerCase()
        : "adaptive";
    if (affinity === "independent") {
      category = "solitary";
      source = "custom-social-affinity";
    } else if (affinity === "schooling") {
      category = "own_kind_required";
      source = "custom-social-affinity";
    }
  }

  if (!category) {
    const legacyNeeds = typeof FISH_COMFORT_PROFILES !== "undefined"
      ? FISH_COMFORT_PROFILES[speciesId]?.needs
      : null;
    if (Array.isArray(legacyNeeds) && legacyNeeds.includes("school_2_plus")) {
      category = "own_kind_required";
      source = "legacy-schooling-need";
    }
  }

  if (!category) {
    category = "flexible";
  }

  const configuredMinimum = Number(
    fish?.socialOwnKindMinimum
    ?? species?.socialOwnKindMinimum
    ?? species?.socialProfile?.ownKindMinimum
    ?? configuredSpeciesProfile?.ownKindMinimum
  );
  const defaultMinimum = typeof FISH_SOCIAL_DEFAULT_OWN_KIND_MINIMUM !== "undefined"
    ? FISH_SOCIAL_DEFAULT_OWN_KIND_MINIMUM
    : 2;
  const ownKindMinimum = category === "own_kind_required"
    ? Math.max(2, Number.isFinite(configuredMinimum) ? Math.round(configuredMinimum) : defaultMinimum)
    : 0;
  const configuredHostSpeciesIds = (
    fish?.socialHostSpeciesIds
    ?? species?.socialHostSpeciesIds
    ?? species?.socialProfile?.hostSpeciesIds
    ?? configuredSpeciesProfile?.hostSpeciesIds
  );
  const hostSpeciesIds = (Array.isArray(configuredHostSpeciesIds) ? configuredHostSpeciesIds : [])
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  const compatibleFriendRequired = Boolean(
    fish?.compatibleFriendRequired
    ?? species?.compatibleFriendRequired
    ?? species?.socialProfile?.compatibleFriendRequired
    ?? configuredSpeciesProfile?.compatibleFriendRequired
  );
  const affinityGroup = String(
    fish?.socialAffinityGroup
    ?? species?.socialAffinityGroup
    ?? species?.socialProfile?.affinityGroup
    ?? configuredSpeciesProfile?.affinityGroup
    ?? ""
  ).trim();
  const rawSocialSizeClass = (
    fish?.socialSizeClass
    ?? species?.socialSizeClass
    ?? species?.socialProfile?.sizeClass
    ?? configuredSpeciesProfile?.sizeClass
    ?? (speciesId && typeof FISH_SOCIAL_SIZE_BY_SPECIES !== "undefined" ? FISH_SOCIAL_SIZE_BY_SPECIES[speciesId] : "")
  );
  const configuredSocialSizeClass = typeof normalizeFishSocialSizeClass === "function"
    ? normalizeFishSocialSizeClass(rawSocialSizeClass)
    : (["tiny", "small", "medium", "large", "giant"].includes(String(rawSocialSizeClass || "").toLowerCase())
      ? String(rawSocialSizeClass || "").toLowerCase()
      : "");
  // Unknown/custom fish default to Medium rather than deriving social compatibility
  // from artwork dimensions. A custom species can explicitly supply socialSizeClass.
  const sizeClass = configuredSocialSizeClass || "medium";
  const sizeRank = typeof getFishSocialSizeRank === "function"
    ? getFishSocialSizeRank(sizeClass)
    : ({ tiny: 0, small: 1, medium: 2, large: 3, giant: 4 })[sizeClass] ?? 2;
  const sizeLabel = typeof getFishSocialSizeLabel === "function"
    ? getFishSocialSizeLabel(sizeClass)
    : sizeClass[0].toUpperCase() + sizeClass.slice(1);

  return {
    category,
    label: getFishSocialCategoryLabel(category),
    source,
    ownKindMinimum,
    hostSpeciesIds,
    compatibleFriendRequired,
    affinityGroup,
    sizeClass,
    sizeLabel,
    sizeRank,
    requiresOwnKind: category === "own_kind_required",
    prefersOwnKind: ["own_kind_required", "own_kind_preferred", "pair_bond"].includes(category),
    pairBondCapable: category === "pair_bond",
    hostBondCapable: category === "host_bond",
    solitary: category === "solitary",
    crossSpeciesFriendshipCapable: category !== "solitary"
  };
}

function getFishSocialSizeClass(fishOrSpecies) {
  return getFishSocialProfile(fishOrSpecies).sizeClass;
}

function getFishSocialSizeDistance(fishOrSpecies, otherFishOrSpecies) {
  const left = getFishSocialProfile(fishOrSpecies);
  const right = getFishSocialProfile(otherFishOrSpecies);
  return Math.abs((Number(left.sizeRank) || 0) - (Number(right.sizeRank) || 0));
}

function areFishSocialSizesCompatible(fishOrSpecies, otherFishOrSpecies) {
  if (!fishOrSpecies || !otherFishOrSpecies) return false;
  const leftSpeciesId = String(
    fishOrSpecies?.speciesId
    || fishOrSpecies?.id
    || ""
  );
  const rightSpeciesId = String(
    otherFishOrSpecies?.speciesId
    || otherFishOrSpecies?.id
    || ""
  );
  if (leftSpeciesId && rightSpeciesId && leftSpeciesId === rightSpeciesId) return true;
  return getFishSocialSizeDistance(fishOrSpecies, otherFishOrSpecies) <= 1;
}

function areFishEstablishedFriends(fish, otherFish) {
  if (!fish || !otherFish || fish.id === otherFish.id) return false;
  if (fish.pairBondPartnerId === otherFish.id || otherFish.pairBondPartnerId === fish.id) return true;
  const direct = fish.relationships && typeof fish.relationships === "object"
    ? fish.relationships[otherFish.id]
    : null;
  const reverse = otherFish.relationships && typeof otherFish.relationships === "object"
    ? otherFish.relationships[fish.id]
    : null;
  if (direct?.kind === "friend" || reverse?.kind === "friend") return true;
  // Special host bonds are intentionally treated as established social bonds
  // even though they can cross the normal size/predator friendship gates.
  if (typeof isFishHostBondMatch === "function" && isFishHostBondMatch(fish, otherFish)) return true;
  return false;
}

function getFishBiologicalSocialStatus(fish, tank = getCurrentTank(), now = Date.now()) {
  const profile = getFishSocialProfile(fish);
  if (typeof isProteusZombieFish === "function" && isProteusZombieFish(fish)) {
    return {
      ...profile,
      requiresOwnKind: false,
      compatibleFriendRequired: false,
      requirement: null,
      satisfied: true,
      lonelinessEligible: false,
      matchingCompanionCount: 0,
      missingReason: ""
    };
  }
  const livingFish = (Array.isArray(tank?.fish) ? tank.fish : [])
    .filter((entry) => entry && (typeof isFishDead !== "function" || !isFishDead(entry)));
  const sameSpeciesCount = livingFish.filter((entry) => entry.speciesId === fish?.speciesId).length;
  const peacefulOverride = Boolean(
    fish
    && (typeof isFishDead !== "function" || !isFishDead(fish))
    && typeof isPeacefulModeEnabled === "function"
    && isPeacefulModeEnabled()
  );

  let satisfied = true;
  let requirement = null;
  let missingReason = "";
  let matchingCompanionCount = Math.max(0, sameSpeciesCount - (livingFish.includes(fish) ? 1 : 0));

  if (profile.requiresOwnKind) {
    requirement = "own_kind";
    satisfied = peacefulOverride || sameSpeciesCount >= profile.ownKindMinimum;
    if (!satisfied) {
      missingReason = `Needs ${Math.max(0, profile.ownKindMinimum - sameSpeciesCount)} more of its own kind.`;
    }
  } else if (profile.compatibleFriendRequired) {
    requirement = "compatible_friend";
    const compatibleFriends = livingFish.filter((entry) => {
      if (!entry || entry.id === fish?.id) return false;
      const directRelationship = fish?.relationships?.[entry.id];
      const reverseRelationship = entry?.relationships?.[fish?.id];
      const establishedFriend = typeof areFishEstablishedFriends === "function"
        ? areFishEstablishedFriends(fish, entry)
        : fish?.pairBondPartnerId === entry.id
          || entry?.pairBondPartnerId === fish?.id
          || directRelationship?.kind === "friend"
          || reverseRelationship?.kind === "friend";
      if (!establishedFriend) return false;
      if (typeof canFishBuildFriendship === "function") {
        return canFishBuildFriendship(fish, entry, now, { passive: false });
      }
      if (typeof areFishSocialSizesCompatible === "function" && !areFishSocialSizesCompatible(fish, entry)) {
        return false;
      }
      if (typeof getRelationshipKindForFish !== "function") return true;
      return ["friend", "neutral"].includes(getRelationshipKindForFish(fish, entry));
    });
    matchingCompanionCount = compatibleFriends.length;
    satisfied = peacefulOverride || compatibleFriends.length > 0;
    if (!satisfied) {
      missingReason = "Needs a compatible peaceful friend.";
    }
  }

  return {
    ...profile,
    requirement,
    satisfied,
    lonelinessEligible: profile.requiresOwnKind || profile.compatibleFriendRequired,
    sameSpeciesCount,
    matchingCompanionCount,
    missingReason,
    checkedAt: now
  };
}

function isFishBiologicalSocialNeedMet(fish, tank = getCurrentTank(), now = Date.now()) {
  return getFishBiologicalSocialStatus(fish, tank, now).satisfied;
}

function doesFishRequireOwnKind(fishOrSpecies) {
  return getFishSocialProfile(fishOrSpecies).requiresOwnKind;
}

function doesFishPreferOwnKind(fishOrSpecies) {
  return getFishSocialProfile(fishOrSpecies).prefersOwnKind;
}

function isFishPairBondCapable(fishOrSpecies) {
  return getFishSocialProfile(fishOrSpecies).pairBondCapable;
}

function isFishHostBondCapable(fishOrSpecies) {
  return getFishSocialProfile(fishOrSpecies).hostBondCapable;
}

function getSpeciesComfortProfile(speciesOrId) {
  const speciesId = typeof speciesOrId === "string"
    ? speciesOrId
    : speciesOrId?.id;
  const species = typeof speciesOrId === "string"
    ? (runtime.fishMap.get(speciesId) || { id: speciesId })
    : speciesOrId;
  const profile = speciesId ? FISH_COMFORT_PROFILES[speciesId] : null;
  if (profile) {
    return {
      mealCoins: Number.isFinite(Number(profile.mealCoins)) ? Math.max(0, Math.round(Number(profile.mealCoins))) : 1,
      unlock: profile.unlock || null,
      needs: normalizeComfortTagList(profile.needs).slice(0, 2),
      conflicts: normalizeComfortTagList(profile.conflicts)
    };
  }

  return {
    mealCoins: species?.customAsset ? 0 : 1,
    unlock: null,
    needs: ["open_water", "plants"],
    conflicts: ["betta_present", "aggressive_predator"]
  };
}

function getSpeciesNeedTags(speciesOrId) {
  const tags = getSpeciesComfortProfile(speciesOrId).needs;
  return tags.length >= 2 ? tags.slice(0, 2) : [...tags, "open_water"].slice(0, 2);
}

function getSpeciesConflictTags(speciesOrId) {
  return getSpeciesComfortProfile(speciesOrId).conflicts;
}

function getComfortTagLabel(tag) {
  const key = String(tag || "").toLowerCase();
  return COMFORT_NEED_LABELS[key] || COMFORT_CONFLICT_LABELS[key] || titleFromFile(key);
}

function getSpeciesUnlockRequirement(speciesOrId) {
  const species = typeof speciesOrId === "string" ? runtime.fishMap.get(speciesOrId) : speciesOrId;
  const profileUnlock = getSpeciesComfortProfile(species || speciesOrId).unlock;
  return profileUnlock === "starter" ? null : profileUnlock;
}

function getUnlockRequirementLabel(requirement) {
  switch (String(requirement || "").toLowerCase()) {
    case "first-care":
      return "First Care";
    case "stable-tank":
      return "Stable Tank";
    case "happy-habitat":
      return "Happy Habitat";
    case "master-keeper":
      return "Master Keeper";
    case "marine-curator":
      return "Marine Curator";
    case "borough-legends":
      return "Borough Legends";
    case "spooky-keeper":
      return "Spooky Keeper";
    default:
      return requirement ? titleFromFile(requirement) : "";
  }
}

function isNormalMealFood(foodKey) {
  return NORMAL_MEAL_FOOD_KEYS.includes(String(foodKey || ""));
}

function isCarnivoreMealFood(foodKey) {
  return CARNIVORE_MEAL_FOOD_KEYS.includes(String(foodKey || ""));
}

function isPredatorMealFood(foodKey) {
  return PREDATOR_MEAL_FOOD_KEYS.includes(String(foodKey || ""));
}

function isDetritusSnackFood(foodKey) {
  return DETRITUS_SNACK_FOOD_KEYS.includes(String(foodKey || ""));
}

function getFishSpeciesType(target) {
  const species = target?.speciesId ? getSpeciesForFish(target) : target;
  return typeof species?.type === "string" ? species.type.trim().toLowerCase() : "";
}

function isWhaleFish(target) {
  return getFishSpeciesType(target) === "whale";
}

function getWhaleBreathSurfaceYNorm(fish, species = getSpeciesForFish(fish)) {
  const halfHeight = getFishVisualHalfHeightPx(fish, species);
  const fullHeight = halfHeight * 2;
  const breachHeight = fullHeight * WHALE_BREATH_BREACH_HEIGHT_RATIO;
  return Math.max(
    0.04,
    (WATER_SURFACE_Y + halfHeight - breachHeight) / TANK_HEIGHT
  );
}

function getWhaleBreathBlowholeXNorm(fish, species = getSpeciesForFish(fish), now = Date.now()) {
  if (!fish || !species) {
    return clamp(Number(fish?.xNorm) || 0.5, 0.03, 0.97);
  }
  const bodyWidthPx = getFishDisplayWidth(fish, species, now);
  const facingDirection = getFishFacingDirection(fish);
  const blowholeX = fish.xNorm * TANK_WIDTH
    + facingDirection * bodyWidthPx * WHALE_BREATH_BLOWHOLE_FORWARD_OFFSET_RATIO;
  return clamp(blowholeX / TANK_WIDTH, 0.03, 0.97);
}

function scheduleNextWhaleBreath(fish, now = Date.now(), options = {}) {
  if (!fish) {
    return 0;
  }
  const first = options.first === true;
  const minMs = first ? WHALE_BREATH_FIRST_MIN_MS : WHALE_BREATH_INTERVAL_MIN_MS;
  const maxMs = first ? WHALE_BREATH_FIRST_MAX_MS : WHALE_BREATH_INTERVAL_MAX_MS;
  const nextAt = now + randomBetween(minMs, maxMs);
  fish.whaleNextBreathAt = nextAt;
  return nextAt;
}

function isWhaleBreathActive(fish, species = getSpeciesForFish(fish)) {
  return Boolean(
    fish
    && species
    && isWhaleFish(species)
    && (fish.whaleBreathState === "ascending" || fish.whaleBreathState === "surface")
  );
}

function clearWhaleBreathState(fish, now = Date.now(), options = {}) {
  if (!fish) {
    return false;
  }
  const hadState = Boolean(fish.whaleBreathState || fish.whaleBreathSurfaceUntil || fish.whaleBreathTargetXNorm);
  delete fish.whaleBreathState;
  delete fish.whaleBreathSurfaceUntil;
  delete fish.whaleBreathTargetXNorm;
  if (options.reschedule !== false) {
    scheduleNextWhaleBreath(fish, now);
  }
  if (fish.activity === WHALE_BREATH_ACTIVITY) {
    fish.activity = "roam";
    fish.targetAt = now;
  }
  return hadState;
}

function startWhaleBreathCycle(fish, species, now = Date.now()) {
  if (!fish || !species || !isWhaleFish(species) || isFishDead(fish)) {
    return false;
  }

  clearFishGravelPebbleAction(fish, species, now, { resetTarget: false });
  clearForcedGravelDigPrompt(fish);
  if (fish.caveState) {
    abortFishCaveBehavior(fish, now, false);
  }
  if (fish.feedingPelletId) {
    releasePelletsTargetingFishIds(fish.id);
  }
  fish.feedingPelletId = null;
  fish.activity = WHALE_BREATH_ACTIVITY;
  fish.hangoutDecorId = null;
  fish.hangoutZoneType = null;
  fish.blockedDecorId = null;
  fish.blockedDecorUntil = null;
  fish.panicUntil = null;
  fish.panicSpeedBoost = null;
  clearFishSchoolFollowState(fish);

  const travelX = clampFishXNormToMobileViewport(
    clamp(fish.xNorm + randomBetween(-0.12, 0.12), 0.12, 0.88),
    fish,
    species,
    now
  );
  fish.whaleBreathState = "ascending";
  fish.whaleBreathTargetXNorm = travelX;
  fish.targetXNorm = travelX;
  fish.targetYNorm = getWhaleBreathSurfaceYNorm(fish, species);
  fish.targetAt = now + 60 * 1000;
  fish.swimSpeed = normalizeFishSpeed(
    species,
    randomBetween(Math.max(species.speedMin, species.speedMax * 0.78), species.speedMax)
  );
  return true;
}

function updateWhaleBreathBehavior(fish, species, now = Date.now(), options = {}) {
  if (!fish || !species || !isWhaleFish(species) || isFishDead(fish)) {
    return false;
  }

  if (!Number.isFinite(Number(fish.whaleNextBreathAt))) {
    scheduleNextWhaleBreath(fish, now, { first: true });
  }

  if (options.paused === true) {
    return false;
  }

  if (!isWhaleBreathActive(fish, species) && now >= Number(fish.whaleNextBreathAt)) {
    startWhaleBreathCycle(fish, species, now);
  }

  if (!isWhaleBreathActive(fish, species)) {
    return false;
  }

  const surfaceYNorm = getWhaleBreathSurfaceYNorm(fish, species);
  fish.activity = WHALE_BREATH_ACTIVITY;
  fish.targetYNorm = surfaceYNorm;
  fish.targetAt = now + 60 * 1000;
  fish.hangoutDecorId = null;
  fish.hangoutZoneType = null;
  clearFishSchoolFollowState(fish);

  if (fish.whaleBreathState === "ascending") {
    fish.targetXNorm = clampFishXNormToMobileViewport(
      Number.isFinite(Number(fish.whaleBreathTargetXNorm)) ? Number(fish.whaleBreathTargetXNorm) : fish.xNorm,
      fish,
      species,
      now
    );
    if (fish.yNorm <= surfaceYNorm + WHALE_BREATH_ARRIVAL_NORM) {
      fish.whaleBreathState = "surface";
      fish.whaleBreathSurfaceUntil = now + randomBetween(WHALE_BREATH_SURFACE_HOLD_MIN_MS, WHALE_BREATH_SURFACE_HOLD_MAX_MS);
      fish.targetXNorm = fish.xNorm;
      fish.targetYNorm = surfaceYNorm;
      fish.whaleBreathTargetXNorm = fish.xNorm;
      spawnFishReturnSplash(getWhaleBreathBlowholeXNorm(fish, species, now));
      playWhaleBreathSoundEffect();
    }
    return true;
  }

  fish.targetXNorm = fish.xNorm;
  fish.targetYNorm = surfaceYNorm;
  if (now >= Number(fish.whaleBreathSurfaceUntil || 0)) {
    clearWhaleBreathState(fish, now);
    return false;
  }
  return true;
}

function isChumOnlyFish(target) {
  const species = target?.speciesId ? getSpeciesForFish(target) : target;
  const type = getFishSpeciesType(species);
  return Boolean(
    species
    && (species.diet === "chum" || species.chumOnly === true || type === "shark" || type === "whale")
  );
}

function isDesperationPredatorFish(target) {
  const species = target?.speciesId ? getSpeciesForFish(target) : target;
  const type = getFishSpeciesType(species);
  return Boolean(
    species
    && (species.desperationPredator === true || type === "shark" || type === "whale")
  );
}

function isFoodAllowedInAutoDispenser(foodOrKey) {
  const food = typeof foodOrKey === "string" ? getFoodMeta(foodOrKey) : foodOrKey;
  return Boolean(food && food.dispenserAllowed !== false);
}

function getFishAcceptedFoodKeys(fish, options = {}) {
  if (!fish) return [];
  const species = fish?.speciesId ? getSpeciesForFish(fish) : fish;
  if (!species) return [];

  const juvenile = options.juvenile === true
    || (fish?.speciesId && typeof isFishJuvenile === "function" && isFishJuvenile(fish));
  const authored = juvenile && Array.isArray(species.juvenileFoods) && species.juvenileFoods.length
    ? species.juvenileFoods
    : species.acceptedFoods;
  if (Array.isArray(authored)) {
    return authored
      .map((foodKey) => String(foodKey || "").trim())
      .filter((foodKey, index, list) => foodKey && foodKey !== "frisky" && list.indexOf(foodKey) === index);
  }

  // Backward-compatible fallback for custom/legacy definitions that have not
  // authored acceptedFoods yet. New first-party species use explicit lists.
  const diet = String(species.diet || "").trim().toLowerCase();
  const dietProfile = String(species.dietProfile || "").trim().toLowerCase();
  if (isChumOnlyFish(species)) return ["chum"];
  if (diet === "detritus" || dietProfile === "detritus") return ["algaeWafers"];
  if (diet === "none" || dietProfile === "none") return [];
  if (diet === "carnivore" || dietProfile === "carnivore") return ["brineShrimp", "carnivore"];
  if (dietProfile === "herbivore") return ["basic", "algaeWafers"];
  if (isPiranhaSpecies(species) || (typeof isPredatoryFishSpecies === "function" && isPredatoryFishSpecies(species))) {
    return ["brineShrimp", "carnivore", "chum"];
  }
  return ["basic", "brineShrimp"];
}

function canFishUseSpawningFood(fish, now = Date.now()) {
  if (typeof isFishBreedingEligible === "function") {
    return isFishBreedingEligible(fish, now, getCurrentTank(), { requireReady: false, requireCapacity: false });
  }
  if (!fish || isFishDead(fish)) return false;
  const species = getSpeciesForFish(fish);
  if (!species || species.canBreed === false || fish.spawnUsed === true || fish.breedingAvailable === false) return false;
  if (typeof isFishJuvenile === "function" && isFishJuvenile(fish, now)) return false;
  return true;
}

function canFoodSatisfyFishMeal(fish, foodKey = "basic") {
  if (foodKey === "halloweenCandy") return Boolean(fish);
  if (!fish || isFishDead(fish)) {
    return false;
  }
  const normalizedFoodKey = String(foodKey || "basic");
  // Fish Flakes are the surface-floating form of Basic Food: every species
  // that accepts basic pellets also accepts flakes.
  const dietaryFoodKey = normalizedFoodKey === "fishFlakes" ? "basic" : normalizedFoodKey;
  if (dietaryFoodKey === "frisky") {
    return canFishUseSpawningFood(fish);
  }
  if (typeof isProteusZombieFish === "function" && isProteusZombieFish(fish)) {
    return ["basic", "brineShrimp", "carnivore", "chum"].includes(dietaryFoodKey);
  }
  return getFishAcceptedFoodKeys(fish).includes(dietaryFoodKey);
}

function canFishOverfeed(fish) {
  return Boolean(fish);
}

function getFishSpaceLoad(fish, species = getSpeciesForFish(fish)) {
  const width = Math.max(1, Number(species?.width) || 128) * clamp(Number(fish?.scale) || 1, FISH_SCALE_MIN, FISH_SCALE_MAX);
  if (width <= 90) {
    return 0.5;
  }
  if (width <= 150) {
    return 1;
  }
  if (width <= 225) {
    return 1.5;
  }
  if (width <= 300) {
    return 2.5;
  }
  return 3;
}

function getTankSpaceLoad(tank = getCurrentTank()) {
  return (Array.isArray(tank?.fish) ? tank.fish : [])
    .filter((fish) => fish && !isFishDead(fish))
    .reduce((total, fish) => total + getFishSpaceLoad(fish), 0);
}

function getTankSpaceComfortPoints(tank = getCurrentTank()) {
  const load = getTankSpaceLoad(tank);
  if (load <= TANK_SPACE_FULL_LOAD) {
    return COMFORT_COMPONENTS.space;
  }
  if (load >= TANK_SPACE_MAX_LOAD) {
    return 0;
  }
  return COMFORT_COMPONENTS.space * (1 - ((load - TANK_SPACE_FULL_LOAD) / (TANK_SPACE_MAX_LOAD - TANK_SPACE_FULL_LOAD)));
}

function getTankComfortDecorTags(tank = getCurrentTank()) {
  const tags = new Set();
  const placedDecor = Array.isArray(tank?.placedDecor) ? tank.placedDecor : [];
  for (const item of placedDecor) {
    if (typeof isPlacedDecorFunctionallyActive === "function" && !isPlacedDecorFunctionallyActive(item, tank)) continue;
    const categories = new Set(getDecorCategoryList(item));
    const metadataTags = new Set(getDecorTagList(item));
    const behavior = getDecorBehaviorType(item);
    const theme = getDecorTheme(item);

    if (categories.has("plant")) {
      tags.add("plants");
      tags.add("seaweed_algae");
    }
    if (categories.has("cave")) {
      tags.add("cave");
      tags.add("hardscape");
    }
    if (categories.has("coral")) {
      tags.add("coral");
      tags.add("hardscape");
    }
    if (["rock", "wood", "ornament", "transit"].some((category) => categories.has(category))) {
      tags.add("hardscape");
    }
    if (categories.has("wood")) {
      tags.add("driftwood");
    }
    if (categories.has("bubbler") || isBubblerDecorKey(item.decorKey) || isCustomBubblerDecorKey(item.decorKey)) {
      tags.add("bubbler");
      tags.add("hardscape");
    }
    if (["floating_bob", "floating_sway"].includes(behavior)) {
      tags.add("surface_cover");
    }
    if (theme === "halloween" || metadataTags.has("spooky")) {
      tags.add("spooky");
    }
    if (metadataTags.has("volcanic") || metadataTags.has("sharp")) {
      tags.add("sharp_decor");
    }
    for (const tag of metadataTags) {
      if (["plants", "seaweed_algae", "cave", "coral", "hardscape", "driftwood", "bubbler", "surface_cover", "spooky", "sharp_decor"].includes(tag)) {
        tags.add(tag);
      }
    }
  }
  return tags;
}

function getTankComfortFacts(tank = getCurrentTank(), now = Date.now()) {
  const livingFish = (Array.isArray(tank?.fish) ? tank.fish : []).filter((fish) => fish && !isFishDead(fish));
  const decorTags = getTankComfortDecorTags(tank);
  const countsBySpecies = new Map();
  for (const fish of livingFish) {
    countsBySpecies.set(fish.speciesId, (countsBySpecies.get(fish.speciesId) || 0) + 1);
  }
  const spacePoints = getTankSpaceComfortPoints(tank);
  return {
    now,
    livingFish,
    decorTags,
    countsBySpecies,
    spaceLoad: getTankSpaceLoad(tank),
    spacePoints,
    hasBetta: livingFish.some((fish) => fish.speciesId === "betta"),
    hasPuffer: livingFish.some((fish) => fish.speciesId === "pufferfish"),
    hasAggressivePredator: livingFish.some((fish) => isPiranhaSpecies(fish) || fish.speciesId === "pufferfish"),
    hasTang: livingFish.some((fish) => fish.speciesId === "tang"),
    hasFastEater: livingFish.some((fish) => ["zebra-danio", "rainbowfish", "swordtail"].includes(fish.speciesId)),
    hasFinNipper: livingFish.some((fish) => ["zebra-danio", "betta", "piranha"].includes(fish.speciesId)),
    surfaceFishCount: livingFish.filter((fish) => ["wonder-killifish", "gourami", "betta"].includes(fish.speciesId)).length
  };
}

function isFishNeedMet(fish, needTag, tank = getCurrentTank(), facts = getTankComfortFacts(tank)) {
  if (fish && !isFishDead(fish) && typeof isPeacefulModeEnabled === "function" && isPeacefulModeEnabled()) {
    return true;
  }
  const tag = String(needTag || "").toLowerCase();
  const species = getSpeciesForFish(fish);
  switch (tag) {
    case "plants":
    case "cave":
    case "bubbler":
    case "driftwood":
    case "hardscape":
    case "seaweed_algae":
    case "coral":
    case "spooky":
    case "surface_cover":
      return facts.decorTags.has(tag) || (tag === "surface_cover" && facts.decorTags.has("plants"));
    case "open_water":
      return facts.spacePoints >= 12;
    case "school_2_plus":
      return typeof getFishBiologicalSocialStatus === "function"
        ? getFishBiologicalSocialStatus(fish, tank, facts.now).satisfied
        : (facts.countsBySpecies.get(fish?.speciesId) || 0) >= 2;
    default:
      return false;
  }
}

function getFishNeedsStatus(fish, tank = getCurrentTank(), now = Date.now()) {
  const species = getSpeciesForFish(fish);
  const facts = getTankComfortFacts(tank, now);
  const statuses = getSpeciesNeedTags(species).map((tag) => ({
    tag,
    label: getComfortTagLabel(tag),
    met: isFishNeedMet(fish, tag, tank, facts)
  }));
  const socialStatus = typeof getFishBiologicalSocialStatus === "function"
    ? getFishBiologicalSocialStatus(fish, tank, now)
    : null;
  if (
    socialStatus?.requiresOwnKind
    && !statuses.some((item) => item.tag === "school_2_plus" || item.tag === "social_own_kind")
  ) {
    statuses.push({
      tag: "social_own_kind",
      label: `Own Kind ${socialStatus.ownKindMinimum}+`,
      met: socialStatus.satisfied,
      social: true
    });
  }
  return statuses;
}

function isFishConflictActive(fish, conflictTag, tank = getCurrentTank(), facts = getTankComfortFacts(tank)) {
  if (!fish || isFishDead(fish)) {
    return false;
  }
  if (typeof isPeacefulModeEnabled === "function" && isPeacefulModeEnabled()) {
    return false;
  }
  const tag = String(conflictTag || "").toLowerCase();
  const species = getSpeciesForFish(fish);
  const otherFish = facts.livingFish.filter((other) => other.id !== fish.id);
  switch (tag) {
    case "betta_present":
      return otherFish.some((other) => other.speciesId === "betta");
    case "aggressive_predator":
      return otherFish.some((other) => isPiranhaSpecies(other) || other.speciesId === "pufferfish" || (typeof isProteusZombieFish === "function" && isProteusZombieFish(other)));
    case "fin_nipper":
      return otherFish.some((other) => ["zebra-danio", "betta", "piranha"].includes(other.speciesId));
    case "large_fish":
      return otherFish.some((other) => (Number(getSpeciesForFish(other)?.width) || 0) >= 220);
    case "tiny_fish":
      return otherFish.some((other) => (Number(getSpeciesForFish(other)?.width) || 0) <= 90);
    case "same_species":
      return otherFish.some((other) => other.speciesId === fish.speciesId);
    case "tang_present":
      return species?.id === "tang" && otherFish.some((other) => other.speciesId === "tang");
    case "puffer_present":
      return species?.id === "pufferfish" && otherFish.some((other) => other.speciesId === "pufferfish");
    case "surface_crowding":
      return facts.surfaceFishCount > 2;
    case "overcrowded":
      return facts.spaceLoad > TANK_SPACE_FULL_LOAD;
    case "sharp_decor":
      return facts.decorTags.has("sharp_decor");
    case "fast_eater":
      return otherFish.some((other) => ["zebra-danio", "rainbowfish", "swordtail"].includes(other.speciesId));
    case "community_fish":
      if (isPiranhaSpecies(fish)) {
        return otherFish.some((other) => !isPiranhaSpecies(other));
      }
      return otherFish.length > 0;
    default:
      return false;
  }
}

function getFishConflictStatus(fish, tank = getCurrentTank(), now = Date.now()) {
  const species = getSpeciesForFish(fish);
  const facts = getTankComfortFacts(tank, now);
  return getSpeciesConflictTags(species).map((tag) => ({
    tag,
    label: getComfortTagLabel(tag),
    active: isFishConflictActive(fish, tag, tank, facts)
  }));
}

function renderComfortTagChips(items, options = {}) {
  const type = options.type === "conflict" ? "conflict" : "need";
  const visibleItems = Array.isArray(items) ? items : [];
  if (!visibleItems.length) {
    return `<span class="comfort-chip is-neutral">None</span>`;
  }
  return visibleItems.map((item) => {
    const active = type === "conflict" ? Boolean(item.active) : Boolean(item.met);
    const className = type === "conflict"
      ? `comfort-chip ${active ? "is-bad" : "is-good"}`
      : `comfort-chip ${active ? "is-good" : "is-bad"}`;
    return `<span class="${className}">${escapeHtml(item.label)}</span>`;
  }).join("");
}

function renderNeutralComfortTagChips(tags) {
  const visibleTags = normalizeComfortTagList(tags);
  if (!visibleTags.length) {
    return `<span class="comfort-chip is-neutral">None</span>`;
  }
  return visibleTags.map((tag) => `<span class="comfort-chip is-neutral">${escapeHtml(getComfortTagLabel(tag))}</span>`).join("");
}

function normalizeDecorKey(decorKey = "") {
  const key = String(decorKey || "").trim();
  if (!key) {
    return "";
  }

  return DECOR_KEY_ALIASES[key] || DECOR_KEY_ALIASES[key.toLowerCase()] || key;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildCoinIconMarkup(className = "", options = {}) {
  const classes = ["coin-symbol", className].filter(Boolean).join(" ");
  const decorative = options.decorative === true;
  const ariaHidden = decorative ? ' aria-hidden="true"' : "";
  const altText = decorative ? "" : "coin";
  return `<img class="${escapeHtml(classes)}" ${assetImageAttributes(COIN_ICON_PATH)} alt="${altText}"${ariaHidden} draggable="false" />`;
}

function buildCoinAmountMarkup(value, options = {}) {
  const formattedValue = options.formatted === true ? String(value ?? "") : formatNumber(value);
  return `<span class="coin-amount">${buildCoinIconMarkup("coin-amount-icon", {
    decorative: options.decorative === true
  })}<span>${escapeHtml(formattedValue)}</span></span>`;
}

function formatStoreCoinCounterValue(value) {
  return String(Math.max(0, Math.floor(Number(value) || 0)));
}

function sanitizeTankName(value, fallback = "") {
  const trimmed = typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, 28)
    : "";
  return trimmed || fallback;
}

function buildDefaultTankName(index = 0) {
  return `Neighborhood ${Math.max(1, index + 1)}`;
}

function assignFallbackTankNames(targetState = state) {
  if (!targetState || !Array.isArray(targetState.tanks)) {
    return;
  }

  targetState.tanks.forEach((tank, index) => {
    tank.name = sanitizeTankName(tank?.name, buildDefaultTankName(index));
  });
}

function getNextAvailableTankName(targetState = state) {
  const existing = new Set(
    getAllTanks(targetState)
      .map((tank, index) => sanitizeTankName(tank?.name, buildDefaultTankName(index)).toLowerCase())
  );
  let index = 0;
  while (existing.has(buildDefaultTankName(index).toLowerCase())) {
    index += 1;
  }
  return buildDefaultTankName(index);
}

function getTankTypeMeta(typeId) {
  return TANK_TYPE_META.rectangular;
}

function isBowlTank(target = getCurrentTank()) {
  return false;
}

function getTankProductImagePath(tankTypeId) {
  return resolveAppUrl(TANK_PRODUCT_IMAGE_PATHS.rectangular);
}

function getTankProductImageFallback(tankTypeId) {
  const fill = "#1a3247";
  const stroke = "#c8ecff";
  const inner = `<rect x="18" y="26" width="156" height="252" rx="18" fill="${fill}" />
       <rect x="30" y="40" width="132" height="220" rx="12" fill="#5bb8ea" opacity="0.88" />
       <rect x="30" y="220" width="132" height="40" rx="8" fill="#dbc084" opacity="0.9" />`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 320">
    <rect width="192" height="320" rx="28" fill="#0b1723"/>
    ${inner}
    <path d="M22 18 H170" stroke="${stroke}" stroke-width="10" stroke-linecap="round" opacity="0.92"/>
    <path d="M42 54 C30 96 28 206 52 250" stroke="${stroke}" stroke-width="6" fill="none" opacity="0.24"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function normalizeWaterType(value, fallback = "freshwater") {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "salt" || normalized === "salt water") {
    return "saltwater";
  }
  if (normalized === "fresh" || normalized === "fresh water") {
    return "freshwater";
  }
  return WATER_TYPE_META[normalized]?.id || fallback;
}

function normalizeSubstrateStyle(value, fallback = "auto") {
  const normalized = typeof value === "string" ? value.trim().toLowerCase().replace(/[\s_]+/g, "-") : "";
  if (["auto", "custom", "river-rock", "sand"].includes(normalized)) return normalized;
  if (normalized === "riverrock" || normalized === "river-stone" || normalized === "river-stones") return "river-rock";
  return fallback;
}

function getResolvedTankSubstrateStyle(tank = getCurrentTank()) {
  const style = normalizeSubstrateStyle(tank?.substrateStyle, "auto");
  if (style !== "auto") return style;
  return normalizeWaterType(tank?.waterType, "freshwater") === "saltwater" ? "sand" : "river-rock";
}

function getTankSubstrateAssetPath(tank = getCurrentTank()) {
  const style = getResolvedTankSubstrateStyle(tank);
  const path = TANK_SUBSTRATE_ASSET_PATHS[style] || "";
  return path ? resolveAppUrl(path) : "";
}

function inferWaterTypeFromTheme(themeValue, fallback = "freshwater") {
  const normalized = typeof themeValue === "string" ? themeValue.trim().toLowerCase() : "";
  if (normalized.includes("salt")) {
    return "saltwater";
  }
  if (normalized.includes("fresh")) {
    return "freshwater";
  }
  return fallback;
}

function isFishWaterTypeMismatch(fish, tank = null) {
  if (!fish || isFishDead(fish)) return false;
  const resolvedTank = tank
    || (typeof getTankContainingFish === "function" ? getTankContainingFish(fish.id) : null)
    || (typeof getCurrentTank === "function" ? getCurrentTank() : null);
  if (!resolvedTank) return false;
  const species = getSpeciesForFish(fish);
  if (!species) return false;
  return getFishStoreWaterType(species) !== normalizeWaterType(resolvedTank.waterType, "freshwater");
}

function getTankById(tankId, targetState = state) {
  if (!targetState || !Array.isArray(targetState.tanks)) {
    return null;
  }

  return targetState.tanks.find((tank) => tank.id === tankId) || targetState.tanks[0] || null;
}

function getCurrentTank(targetState = state) {
  if (!targetState || !Array.isArray(targetState.tanks)) {
    return null;
  }

  return getTankById(targetState.activeTankId, targetState);
}

function getCurrentTankIndex(targetState = state) {
  if (!targetState || !Array.isArray(targetState.tanks)) {
    return -1;
  }

  const currentTank = getCurrentTank(targetState);
  return currentTank ? targetState.tanks.findIndex((tank) => tank.id === currentTank.id) : -1;
}

function getAllTanks(targetState = state) {
  return Array.isArray(targetState?.tanks) ? targetState.tanks : [];
}

function getAllTankFish(targetState = state) {
  return getAllTanks(targetState).flatMap((tank) => Array.isArray(tank?.fish) ? tank.fish : []);
}

function getAllPlacedDecor(targetState = state) {
  return getAllTanks(targetState).flatMap((tank) => Array.isArray(tank?.placedDecor) ? tank.placedDecor : []);
}

function getTankLabel(tank, index = null) {
  if (!tank) {
    return "Aquarium";
  }

  const tankIndex = Number.isFinite(index) ? index : getAllTanks().findIndex((entry) => entry.id === tank.id);
  return sanitizeTankName(tank.name, buildDefaultTankName(Math.max(0, tankIndex)));
}

function isTankEmpty(tank = getCurrentTank()) {
  if (!tank) {
    return true;
  }

  const fishCount = Array.isArray(tank.fish) ? tank.fish.length : 0;
  const decorCount = Array.isArray(tank.placedDecor) ? tank.placedDecor.length : 0;
  const machineryCount = typeof getMachineryForTank === "function" ? getMachineryForTank(tank.id).length : 0;
  return fishCount === 0 && decorCount === 0 && machineryCount === 0;
}

function getFoodCatalogEntries() {
  return runtime.foodAndMedCatalog?.items?.food || {};
}

function getMedicineCatalogEntries() {
  return runtime.foodAndMedCatalog?.items?.medicine || {};
}

function getFoodCatalog() {
  return Object.values(getFoodCatalogEntries());
}

function getMedicineCatalog() {
  return Object.values(getMedicineCatalogEntries());
}

function shouldShowFoodInStore(food) {
  if (!food) {
    return false;
  }
  return food.id !== "upgraded" && (food.id !== "halloweenCandy" || isHalloweenCalendarDate(Date.now()));
}

function shouldShowMedicineInStore(medicine) {
  if (!medicine) {
    return false;
  }
  return medicine.id !== "antidote";
}

function isFilteredGoreDecor(decorOrKey) {
  const key = typeof decorOrKey === "string"
    ? decorOrKey
    : decorOrKey?.decorKey || decorOrKey?.key || "";
  return FILTERED_GORE_DECOR_KEYS.has(String(key || "").trim().toLowerCase());
}

function canUseDecorWithCurrentContentSettings(decorOrKey) {
  return isViolenceAndGoreEnabled() || !isFilteredGoreDecor(decorOrKey);
}

function getDecorUnlockRequirement(decorOrKey) {
  const key = normalizeDecorKey(typeof decorOrKey === "string" ? decorOrKey : decorOrKey?.key || decorOrKey?.decorKey || "");
  return DECOR_UNLOCK_REQUIREMENTS[key] || null;
}

function isDecorUnlocked(decorOrKey) {
  return isDecorProgressUnlocked(decorOrKey);
}

function getDecorUnlockRequirementLabel(decorOrKey) {
  return getUnlockRequirementLabel(getDecorUnlockRequirement(decorOrKey));
}

function unlockDecorKey(decorKey, now = Date.now(), reasonText = "") {
  const key = normalizeDecorKey(decorKey);
  const decor = runtime.decorMap.get(key);
  if (!decor || isDecorUnlocked(key)) {
    return false;
  }
  state.unlockedDecorKeys = sanitizeUnlockedDecorKeys([
    ...(state.unlockedDecorKeys || []),
    key
  ]);
  pushEvent(reasonText || `${decor.name} is now available in the shop.`, now, getCurrentTank(), {
    type: "unlock",
    decorKey: key
  });
  return true;
}

function getFoodMeta(foodKey) {
  if (typeof foodKey !== "string" || !foodKey) {
    return null;
  }
  return getFoodCatalogEntries()[foodKey] || null;
}

function getMedicineMeta(medicineKey) {
  if (typeof medicineKey !== "string" || !medicineKey) {
    return null;
  }
  return getMedicineCatalogEntries()[medicineKey] || null;
}

function getFoodPackageOptions(foodOrKey) {
  const food = typeof foodOrKey === "string" ? getFoodMeta(foodOrKey) : foodOrKey;
  if (!food) {
    return [];
  }
  const authored = Array.isArray(food.packages)
    ? food.packages.filter((entry) => entry && Number(entry.servings) > 0)
    : [];
  if (authored.length) {
    return authored.map((entry) => ({
      id: typeof entry.id === "string" && entry.id ? entry.id : "standard",
      name: typeof entry.name === "string" && entry.name ? entry.name : "Package",
      servings: Math.max(1, Math.floor(Number(entry.servings) || 1)),
      cost: Math.max(0, Math.floor(Number(entry.cost) || 0)),
      image: typeof entry.image === "string" ? entry.image.trim() : ""
    }));
  }
  return [{
    id: "standard",
    name: food.id === "halloweenCandy" ? "Pile" : "Bottle",
    servings: Math.max(1, Math.floor(Number(food.bottlePellets) || 1)),
    cost: Math.max(0, Math.floor(Number(food.cost) || 0)),
    image: ""
  }];
}

function getFoodPackageMeta(foodOrKey, packageId = "") {
  const packages = getFoodPackageOptions(foodOrKey);
  if (!packages.length) {
    return null;
  }
  const requestedId = typeof packageId === "string" ? packageId.trim() : "";
  return (requestedId ? packages.find((entry) => entry.id === requestedId) : null) || packages[0];
}

function getDefaultFoodKey() {
  return getFoodMeta("basic")?.id || getFoodCatalog()[0]?.id || "basic";
}

function getDefaultFoodInventory() {
  return Object.fromEntries(getFoodCatalog().map((food) => [food.id, 0]));
}

function getFoodDropSpritePaths(foodOrKey) {
  const food = typeof foodOrKey === "string" ? getFoodMeta(foodOrKey) : foodOrKey;
  return Array.isArray(food?.dropImages)
    ? food.dropImages.filter((path) => typeof path === "string" && path.trim())
    : [];
}

function pickFoodDropSpritePath(foodOrKey) {
  const paths = getFoodDropSpritePaths(foodOrKey);
  if (!paths.length) {
    return "";
  }
  const loadedPaths = paths.filter((path) => runtime.images.has(path));
  const pool = loadedPaths.length ? loadedPaths : paths;
  return pool[Math.floor(Math.random() * pool.length)] || pool[0] || "";
}

function resolveStoredFoodDropSpritePath(foodOrKey, spritePath = "") {
  const explicitSpritePath = typeof spritePath === "string" ? spritePath.trim() : "";
  if (explicitSpritePath) {
    return explicitSpritePath;
  }
  return pickFoodDropSpritePath(foodOrKey);
}

function getFoodDropStyle(foodOrKey) {
  const food = typeof foodOrKey === "string" ? getFoodMeta(foodOrKey) : foodOrKey;
  if (food?.id === "chum" && !isViolenceAndGoreEnabled()) {
    return "pellet";
  }
  return food?.dropStyle === "sprite" ? "sprite" : "pellet";
}

function isPelletSizedFoodSprite(foodOrKey) {
  const food = typeof foodOrKey === "string" ? getFoodMeta(foodOrKey) : foodOrKey;
  return food?.id === "halloweenCandy";
}

function getFoodSpriteVisualSize(foodOrKey, scale, stableScale = getViewportStableAssetScale()) {
  const food = typeof foodOrKey === "string" ? getFoodMeta(foodOrKey) : foodOrKey;
  if (food?.id === "fishFlakes") {
    // Flakes are a light surface sprinkle, deliberately half the size of the
    // other loose food sprites.
    return {
      maxSize: 12 * scale,
      minSize: 5 * stableScale
    };
  }
  if (isPelletSizedFoodSprite(foodOrKey)) {
    // Candy uses detailed sprite art rather than a tiny pellet. Keep it large
    // enough to read clearly in the tank, especially on desktop displays.
    return {
      maxSize: 48 * scale,
      minSize: 22 * stableScale
    };
  }
  return {
    maxSize: 24 * scale,
    minSize: 10 * stableScale
  };
}

function getChumSpriteVisualScale(spritePath = "") {
  const fileName = String(spritePath || "")
    .split(/[\\/]/)
    .pop()
    .toLowerCase();
  // The three chum images share the same 100x89 canvas, but their visible
  // painted areas differ. Normalize their apparent mass while preserving
  // each sprite's natural aspect ratio.
  if (fileName === "chum_2.png") return 1.03;
  if (fileName === "chum_3.png") return 1.17;
  return 1;
}

function getFoodDropAppearance(foodKey, pellet = null) {
  const food = typeof foodKey === "string" ? getFoodMeta(foodKey) : foodKey;
  const dropStyle = getFoodDropStyle(food);
  const safeChumPellet = food?.id === "chum" && dropStyle === "pellet";
  const baseColor = normalizeHexColor(safeChumPellet ? SAFE_CHUM_PELLET_COLORS.base : food?.pelletColor)
    || (safeChumPellet ? SAFE_CHUM_PELLET_COLORS.base : "#825930");
  const accentColor = normalizeHexColor(safeChumPellet ? SAFE_CHUM_PELLET_COLORS.accent : food?.pelletAccentColor)
    || mixColors(baseColor, safeChumPellet ? SAFE_CHUM_PELLET_COLORS.accent : "#D7B27B", safeChumPellet ? 0.55 : 0.4);
  const highlightColor = normalizeHexColor(safeChumPellet ? SAFE_CHUM_PELLET_COLORS.highlight : food?.pelletHighlightColor)
    || mixColors(baseColor, safeChumPellet ? SAFE_CHUM_PELLET_COLORS.highlight : "#FFFFFF", safeChumPellet ? 0.62 : 0.58);
  return {
    dropStyle,
    baseColor,
    accentColor,
    highlightColor,
    spritePath: dropStyle === "sprite" ? resolveStoredFoodDropSpritePath(food, pellet?.spritePath) : ""
  };
}

function getDefaultMedicineInventory() {
  return Object.fromEntries(getMedicineCatalog().map((medicine) => [medicine.id, 0]));
}

function sanitizeDispenserStoredPellet(entry) {
  if (!entry || typeof entry.foodKey !== "string") {
    return null;
  }

  const foodMeta = getFoodMeta(entry.foodKey);
  if (!foodMeta) {
    return null;
  }

  return {
    id: String(entry.id || createId("dispenser-pellet")),
    foodKey: foodMeta.id,
    spritePath: resolveStoredFoodDropSpritePath(foodMeta, entry.spritePath)
  };
}

function isTankCareAutomationPaused() {
  return Boolean(
    runtime?.debugSimulationPaused === true
    || (typeof isWallpaperEnginePauseActive === "function" && isWallpaperEnginePauseActive())
    || (typeof isPeacefulModeEnabled === "function" && isPeacefulModeEnabled())
  );
}

function createDefaultAutoDispenserState(options = {}) {
  const source = options && typeof options === "object" ? options : {};
  const storedPellets = Array.isArray(source.storedPellets ?? source.pellets)
    ? (source.storedPellets ?? source.pellets).map((entry) => sanitizeDispenserStoredPellet(entry)).filter(Boolean).slice(0, AUTO_DISPENSER_MAX_PELLETS)
    : [];
  const mealPortion = clamp(
    Math.round(Number(source.mealPortion ?? source.dispenseQty) || 0),
    AUTO_DISPENSER_PORTION_MIN,
    AUTO_DISPENSER_PORTION_MAX
  );

  return {
    installed: Boolean(source.installed),
    stored: source.stored === true,
    storedCount: Math.max(0, Math.floor(Number(source.storedCount) || (source.stored === true ? 1 : 0))),
    appearanceVariantKey: typeof source.appearanceVariantKey === "string" ? source.appearanceVariantKey : "",
    xNorm: clamp(Number.isFinite(Number(source.xNorm)) ? Number(source.xNorm) : AUTO_DISPENSER_DEFAULT_X_NORM, 0.12, 0.88),
    tankLayer: clampTankLayer(source.tankLayer ?? AUTO_DISPENSER_DEFAULT_TANK_LAYER),
    mealPortion,
    storedPellets,
    lastDispensedSlotKey: typeof source.lastDispensedSlotKey === "string" ? source.lastDispensedSlotKey : "",
    lastSmartDispensedAt: Number.isFinite(Number(source.lastSmartDispensedAt)) ? Math.max(0, Number(source.lastSmartDispensedAt)) : 0,
    smartDispensedAtByFishId: sanitizeFishNeedEventMap(source.smartDispensedAtByFishId),
    lastEmptyAlertSlotKey: typeof source.lastEmptyAlertSlotKey === "string" ? source.lastEmptyAlertSlotKey : "",
    lastFoodMismatchAlertSlotKey: typeof source.lastFoodMismatchAlertSlotKey === "string" ? source.lastFoodMismatchAlertSlotKey : "",
    refillAlert: Boolean(source.refillAlert) && storedPellets.length === 0
  };
}

function getAutoDispenserLoadedCount(dispenser = state?.autoDispenser) {
  return Array.isArray(dispenser?.storedPellets) ? dispenser.storedPellets.length : 0;
}

function isAutoDispenserFoodLow(dispenser = state?.autoDispenser) {
  if (!dispenser?.installed) {
    return false;
  }

  const loadedCount = getAutoDispenserLoadedCount(dispenser);
  const mealPortion = clamp(
    Math.round(Number(dispenser.mealPortion) || 0),
    AUTO_DISPENSER_PORTION_MIN,
    AUTO_DISPENSER_PORTION_MAX
  );
  return mealPortion > 0 && loadedCount <= Math.max(1, mealPortion);
}

function getAutoDispenserDemandCount(targetTank = getCurrentTank(), now = Date.now()) {
  if (!targetTank) return 0;
  return getAllTanks().reduce((total, tank) => total + getHungryFishByNeeds(tank, now, FISH_HUNGER_LOW_THRESHOLD)
    .filter((fish) => tank.id === targetTank.id || findAquariumSectionRoute(tank, targetTank) || getTransitTubeJourney(tank, targetTank)).length, 0);
}

function hasAutoDispenserInstalled(targetTank = getCurrentTank()) {
  return Boolean(targetTank?.autoDispenser?.installed);
}

function deployAutoDispenser(targetTank = getCurrentTank(), now = Date.now()) {
  if (!targetTank?.autoDispenser?.stored || targetTank.autoDispenser.installed || (Number(targetTank.autoDispenser.storedCount) || 0) <= 0) return false;
  targetTank.autoDispenser = createDefaultAutoDispenserState({
    ...targetTank.autoDispenser,
    stored: false,
    installed: true,
    storedCount: Math.max(0, Math.floor(Number(targetTank.autoDispenser.storedCount) || 1) - 1),
    xNorm: AUTO_DISPENSER_DEFAULT_X_NORM,
    tankLayer: AUTO_DISPENSER_DEFAULT_TANK_LAYER
  });
  runtime.equipmentEditTrayTab = "tank";
  pushEvent(`Pellet dispenser deployed in ${getTankLabel(targetTank)}.`, now, targetTank, { type: "equipment" });
  saveState();
  renderUi(now);
  return true;
}

function recallAutoDispenser(now = Date.now()) {
  const dispenser = state?.autoDispenser;
  if (!dispenser?.installed) return false;
  dispenser.installed = false;
  dispenser.stored = true;
  dispenser.storedCount = Math.max(1, Math.floor(Number(dispenser.storedCount) || 0) + 1);
  pushEvent("Pellet dispenser returned to equipment storage with its food inventory intact.", now, getCurrentTank(), { type: "equipment" });
  runtime.equipmentEditTrayTab = "storage";
  saveState();
  renderUi(now);
  return true;
}
