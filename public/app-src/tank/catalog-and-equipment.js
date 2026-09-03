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

function deriveDecorCategories(entry, key) {
  const configured = normalizeStringList(entry?.categories || entry?.category);
  if (configured.length) {
    return configured.map((value) => value.toLowerCase());
  }

  const bucket = new Set();
  const haystack = `${String(entry?.name || "")} ${String(key || "")}`.toLowerCase();
  if (/cave|hide|wreck|castle|house|arch/.test(haystack)) {
    bucket.add("caves");
  }
  if (/weed|plant|moss|anub|coral/.test(haystack)) {
    bucket.add("plants");
  }
  if (/shell|rock|driftwood|bridge|lantern|chest/.test(haystack)) {
    bucket.add("ornaments");
  }
  return bucket.size ? [...bucket] : ["ornaments"];
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
    case "spooky-keeper":
    case "corpse-zombie":
      return "Spooky Keeper";
    case "corpse-skeleton":
      return "Spooky Keeper";
    default:
      return requirement ? titleFromFile(requirement) : "";
  }
}

function isNormalMealFood(foodKey) {
  return NORMAL_MEAL_FOOD_KEYS.includes(String(foodKey || ""));
}

function isPredatorMealFood(foodKey) {
  return PREDATOR_MEAL_FOOD_KEYS.includes(String(foodKey || ""));
}

function isFoodAllowedInAutoDispenser(foodOrKey) {
  const food = typeof foodOrKey === "string" ? getFoodMeta(foodOrKey) : foodOrKey;
  return Boolean(food && food.dispenserAllowed !== false);
}

function canFoodSatisfyFishMeal(fish, foodKey = "basic") {
  if (!fish || isFishDead(fish)) {
    return false;
  }
  if (isPiranhaSpecies(fish) || isZombieFish(fish) || (isZombieSkeletonModeAvailable() && fish.speciesId === "zombie-fish")) {
    return isPredatorMealFood(foodKey);
  }
  if (isSkeletonFish(fish) || isMealFreeFish(fish)) {
    return false;
  }
  return isNormalMealFood(foodKey);
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
    const decorKey = String(item?.decorKey || "").toLowerCase();
    const decor = runtime.decorMap.get(item?.decorKey) || runtime.decorMeta[item?.decorKey] || {};
    const categories = Array.isArray(decor.categories) && decor.categories.length
      ? decor.categories
      : deriveDecorCategories(decor, decorKey);
    for (const category of categories) {
      const normalized = String(category || "").toLowerCase();
      if (normalized === "plants" || normalized === "plant") {
        tags.add("plants");
        tags.add("seaweed_algae");
      }
      if (normalized === "caves" || normalized === "hide") {
        tags.add("cave");
        tags.add("hardscape");
      }
      if (normalized === "ornaments" || normalized === "hardscape") {
        tags.add("hardscape");
      }
      if (normalized === "bubbler") {
        tags.add("bubbler");
      }
      if (normalized === "custom") {
        tags.add("hardscape");
      }
    }
    if (decor.caveSettings || decor.caveBehavior || /cave|hide|wreck|castle|ship|plane|arch/.test(decorKey)) {
      tags.add("cave");
      tags.add("hardscape");
    }
    if (decor.bubbler || isBubblerDecorKey(decorKey) || isCustomBubblerDecorKey(decorKey)) {
      tags.add("bubbler");
    }
    if (/seaweed|moss|anub|plant|kelp|algae/.test(decorKey)) {
      tags.add("plants");
      tags.add("seaweed_algae");
      tags.add("surface_cover");
    }
    if (/floating|surface/.test(decorKey)) {
      tags.add("surface_cover");
    }
    if (/driftwood|root/.test(decorKey)) {
      tags.add("driftwood");
      tags.add("hardscape");
      tags.add("seaweed_algae");
    }
    if (/coral|reef|mushroomcoral/.test(decorKey)) {
      tags.add("coral");
      tags.add("hardscape");
    }
    if (/spooky|effigy|gorebag|fishhead/.test(decorKey) || String(decor.theme || "").toLowerCase() === "spooky") {
      tags.add("spooky");
    }
    if (/rock|volcanic|arch|bridge|chest|slate|meteor|castle|ship|plane/.test(decorKey)) {
      tags.add("hardscape");
    }
    if (/volcanic|rock_[0-9]|_bricks/.test(decorKey)) {
      tags.add("sharp_decor");
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
    hasAggressivePredator: livingFish.some((fish) => isPiranhaSpecies(fish) || isZombieFish(fish) || fish.speciesId === "pufferfish"),
    hasTang: livingFish.some((fish) => fish.speciesId === "yellow-tang" || fish.speciesId === "blue-tang"),
    hasFastEater: livingFish.some((fish) => ["zebra-danio", "rainbowfish", "swordtail"].includes(fish.speciesId)),
    hasFinNipper: livingFish.some((fish) => ["zebra-danio", "betta", "piranha"].includes(fish.speciesId)),
    surfaceFishCount: livingFish.filter((fish) => ["wonder-killifish", "gourami", "betta"].includes(fish.speciesId)).length,
    hasTheCure: (Array.isArray(tank?.medicineEffects) ? tank.medicineEffects : []).some((effect) => effect?.type === "antidote" && (effect.endsAt || 0) > now)
  };
}

function isFishNeedMet(fish, needTag, tank = getCurrentTank(), facts = getTankComfortFacts(tank)) {
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
      return (facts.countsBySpecies.get(fish?.speciesId) || 0) >= 2;
    default:
      return false;
  }
}

function getFishNeedsStatus(fish, tank = getCurrentTank(), now = Date.now()) {
  const species = getSpeciesForFish(fish);
  const facts = getTankComfortFacts(tank, now);
  return getSpeciesNeedTags(species).map((tag) => ({
    tag,
    label: getComfortTagLabel(tag),
    met: isFishNeedMet(fish, tag, tank, facts)
  }));
}

function isFishConflictActive(fish, conflictTag, tank = getCurrentTank(), facts = getTankComfortFacts(tank)) {
  if (!fish || isFishDead(fish)) {
    return false;
  }
  const tag = String(conflictTag || "").toLowerCase();
  const species = getSpeciesForFish(fish);
  const otherFish = facts.livingFish.filter((other) => other.id !== fish.id);
  switch (tag) {
    case "betta_present":
      return otherFish.some((other) => other.speciesId === "betta");
    case "aggressive_predator":
      return otherFish.some((other) => isPiranhaSpecies(other) || isZombieFish(other) || other.speciesId === "pufferfish");
    case "fin_nipper":
      return otherFish.some((other) => ["zebra-danio", "betta", "piranha"].includes(other.speciesId));
    case "large_fish":
      return otherFish.some((other) => (Number(getSpeciesForFish(other)?.width) || 0) >= 220);
    case "tiny_fish":
      return otherFish.some((other) => (Number(getSpeciesForFish(other)?.width) || 0) <= 90);
    case "same_species":
      return otherFish.some((other) => other.speciesId === fish.speciesId);
    case "tang_present":
      return ["yellow-tang", "blue-tang"].includes(species?.id) && otherFish.some((other) => ["yellow-tang", "blue-tang"].includes(other.speciesId));
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
        return otherFish.some((other) => !isPiranhaSpecies(other) && !isUndeadFish(other));
      }
      if (isZombieFish(fish)) {
        return otherFish.some((other) => !isUndeadFish(other));
      }
      return otherFish.length > 0;
    case "the_cure":
      return facts.hasTheCure;
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
  return `<img class="${escapeHtml(classes)}" src="${escapeHtml(COIN_ICON_PATH)}" alt="${altText}"${ariaHidden} draggable="false" />`;
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
  return fishCount === 0 && decorCount === 0;
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
  return food.id !== "upgraded";
}

function shouldShowMedicineInStore(medicine) {
  if (!medicine) {
    return false;
  }
  return (isZombieSkeletonModeAvailable() && isViolenceAndGoreEnabled()) || medicine.id !== "antidote";
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
    mealPortion,
    storedPellets,
    lastDispensedSlotKey: typeof source.lastDispensedSlotKey === "string" ? source.lastDispensedSlotKey : "",
    lastSmartDispensedAt: Number.isFinite(Number(source.lastSmartDispensedAt)) ? Math.max(0, Number(source.lastSmartDispensedAt)) : 0,
    smartDispensedAtByFishId: sanitizeFishNeedEventMap(source.smartDispensedAtByFishId),
    refillAlert: Boolean(source.refillAlert) && mealPortion > 0 && storedPellets.length === 0
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

function hasAutoDispenserInstalled(targetTank = getCurrentTank()) {
  return false;
}
