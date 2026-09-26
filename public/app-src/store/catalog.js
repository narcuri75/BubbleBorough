// Source fragment: store/catalog.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function getProteusZombieFishVariantAssetNames() {
  const fallback = ["zombie_fish.png"];
  if (typeof getAllSpriteSheetDefinitions !== "function") return fallback;
  const sheet = getAllSpriteSheetDefinitions().find((entry) => /(?:^|\/)zombie_fish\.webp(?:\?|$)/i.test(String(entry?.path || "")));
  const entries = Object.entries(sheet?.frames || {})
    .filter(([name]) => /zombie[_ -]?fish/i.test(String(name)) && /\.(?:png|webp)$/i.test(String(name)));
  if (!entries.length) return fallback;
  const canonical = entries.find(([name]) => String(name).toLowerCase() === "zombie_fish.png") || entries[0];
  const ordered = [canonical, ...entries.filter((entry) => entry !== canonical)];
  const seenRects = new Set();
  const names = [];
  for (const [name, rect] of ordered) {
    const signature = Array.isArray(rect) ? rect.slice(0, 4).join(",") : JSON.stringify(rect || null);
    if (seenRects.has(signature)) continue;
    seenRects.add(signature);
    names.push(String(name).toLowerCase() === String(canonical[0]).toLowerCase() ? "zombie_fish.png" : String(name).trim());
  }
  return names.length ? names : fallback;
}

function getProteusZombieFishCatalogDefinition() {
  const assetVariants = getProteusZombieFishVariantAssetNames();
  return {
    id: PROTEUS_ZOMBIE_FISH_SPECIES_ID,
    seller: "PROTEUS BIODYNE",
    genetics: "enhanced",
    name: "Z-01 Post-Mortem Aquatic Specimen",
    description: "An experimental organism released through the Proteus Biodyne Restricted Specimen Program. Proteus Biodyne does not recognize the informal term \"zombie\" as scientifically meaningful. Nutritional dependence is absent. Affective response is not measurable. Regenerative viability is classified as extreme. Unprovoked predatory episodes remain within accepted research tolerances.",
    aboutAttribution: "PROTEUS BIODYNE",
    aboutTagline: "POST-MORTEM VIABILITY PROGRAM // Z-01",
    cost: 0,
    assetFolder: "web/proteus/dna_fish",
    asset: assetVariants[0] || "zombie_fish.png",
    assetVariants,
    fallbackAsset: "",
    width: 165,
    displayWidth: 165,
    swimStyle: "steady",
    speedMode: "dynamic",
    speedMin: 0.014,
    speedMax: 0.072,
    targetMinMs: 2600,
    targetMaxMs: 6200,
    behavior: "free",
    diet: "pellet",
    heartCount: 10,
    caveEnabled: true,
    defaultNames: ["Z-01"],
    proteusZombie: true,
    proteusExclusive: true,
    requiresFood: false,
    feelsComfort: false,
    diseaseImmune: true,
    immortal: true,
    canBreed: false,
    socialDisabled: true,
    randomAggression: true,
    spriteSheetAsset: "assets/web/proteus/dna_fish/zombie_fish.webp",
    spriteSheetMetadata: "assets/web/proteus/dna_fish/zombie_fish.json"
  };
}

function getDavyMutationCatalogDefinitions() {
  const folder = "web/davy/fish";
  return [
    {
      id: "davy-bioluminescent-angler-pike",
      seller: "Private Seller",
      genetics: "enhanced",
      name: "Dwarf Siren Pike",
      description: "An experimental ambush predator built around a dwarf pike genome and reinforced with deep-sea, electric, regenerative, and camouflage adaptations. Its luminous lure, expandable throat structure, exposed bioelectric organs, and highly modified fins make the specimen difficult to mistake for anything naturally occurring. It is remarkably patient. Until it isn’t.",
      davyBehaviorLabel: "Patient ambush predator",
      davyBehaviorSummary: "A patient ambush hunter that spends unusually long periods hovering or resting nearly motionless. Its forehead lure glows and gently twitches while it waits, occasionally drawing curious fish closer. The ragged dorsal sail remains folded during normal swimming but expands dramatically when startled or displaying. Its translucent organ chambers pulse faintly at irregular intervals, and its throat pouch expands when feeding or agitated. Instead of chasing food across the tank, it prefers to wait, creep forward slowly, then suddenly lunge.",
      davySwimStyleSummary: "Minimal routine movement punctuated by deliberate creeping and abrupt lunges. It conserves motion until there is a reason not to.",
      davyDietSummary: "Predatory diet. Best suited to protein-rich foods and treated more like a waiting hunter than a casual community feeder.",
      davyTemperamentSummary: "Patient, observant, and unnerving. It is less openly aggressive than its appearance suggests, but it is always assessing nearby movement.",
      davyTraits: ["Ambush hover", "Lure display", "Slow creep", "Burst strike"],
      cost: 500,
      assetFolder: folder,
      asset: "DNA_Bioluminescent_Angler_Pike_1.png",
      assetVariants: [1, 2, 3, 4, 5].map((number) => `DNA_Bioluminescent_Angler_Pike_${number}.png`),
      width: 180,
      displayWidth: 180,
      swimStyle: "sporadic",
      speedMode: "dynamic",
      speedMin: 0.014,
      speedMax: 0.084,
      targetMinMs: 3200,
      targetMaxMs: 9000,
      behavior: "free",
      diet: "pellet",
      heartCount: 7,
      caveEnabled: true,
      davyMutation: true,
      storeBackgroundImage: "assets/web/davy/icons/thumbnail_bg.png"
    },
    {
      id: "davy-bioluminescent-glass-fangfish",
      seller: "Private Seller",
      genetics: "enhanced",
      name: "Glass Needle Spitter",
      description: "A two-inch laboratory curiosity combining pygmy fish genetics with transparent tissue, bioluminescent organs, precision water projection, defensive inflation, and disproportionately large predatory teeth. Most of its internal anatomy remains visible through the body wall. Small enough to disappear behind a filter tube. Strange enough that you will immediately notice when it does.",
      davyBehaviorLabel: "Nervous cover dart",
      davyBehaviorSummary: "Tiny, nervous, and extremely quick. It stays close to cover and changes direction in abrupt little darts rather than making long sweeping turns. Its enormous eyes constantly track activity both inside and above the tank. When food or movement appears near the surface, it may approach beneath it and fire a small jet of water upward. Its cheek photophores blink softly when exploring and brighten when excited. When frightened, its translucent belly inflates slightly and it may release a temporary mucus cloud before retreating. Despite its ridiculous teeth, it usually avoids larger fish.",
      davySwimStyleSummary: "Abrupt, twitchy, and cover-oriented. It avoids long continuous routes and instead makes quick course changes around perceived shelter.",
      davyDietSummary: "Micro-predatory diet. It responds strongly to small foods and surface activity and does best when it can feed in short, opportunistic bursts.",
      davyTemperamentSummary: "Alert, skittish, and reactive. It prefers caution over confrontation and will usually choose retreat over open conflict.",
      davyTraits: ["Cover-seeking", "Abrupt darts", "Surface tracking", "Defensive retreat"],
      cost: 400,
      assetFolder: folder,
      asset: "DNA_Bioluminescent_Glass_Fangfish_1.png",
      assetVariants: [1, 2, 3, 4, 5].map((number) => `DNA_Bioluminescent_Glass_Fangfish_${number}.png`),
      width: 170,
      displayWidth: 170,
      swimStyle: "sporadic",
      speedMode: "dynamic",
      speedMin: 0.03,
      speedMax: 0.094,
      targetMinMs: 850,
      targetMaxMs: 2600,
      behavior: "free",
      diet: "pellet",
      heartCount: 6,
      caveEnabled: true,
      davyMutation: true,
      storeBackgroundImage: "assets/web/davy/icons/thumbnail_bg.png"
    },
    {
      id: "davy-dwarf-chimera-barracuda",
      seller: "Private Seller",
      genetics: "enhanced",
      name: "Dwarf Chimera Barracuda",
      description: "A compact apex predator assembled from barracuda, cuttlefish, electric eel, lionfish, and mantis shrimp genetics. Adaptive camouflage, electrostunning organs, venomous dorsal defenses, and enhanced motion tracking were compressed into a specimen small enough for domestic aquariums. Extremely fast. Extremely observant. Technically ornamental.",
      davyBehaviorLabel: "Active patrol predator",
      davyBehaviorSummary: "An active patrol predator. It cruises steadily through open water, periodically stopping almost motionless before launching into very fast bursts. Its cuttlefish-derived chromatophores slowly shift pattern while idle, becoming more intense when hunting or stressed. When food appears, it tracks it visually before striking rather than immediately swimming toward it. Its electric organ briefly pulses along the flank during aggressive encounters, and the venomous dorsal spines rise when threatened. It prefers space and tends to intimidate nearby fish without constantly attacking them.",
      davySwimStyleSummary: "Open-water patrol with periodic stillness followed by forceful acceleration. It prefers clear routes and visible space.",
      davyDietSummary: "Predatory, protein-forward feeding. It responds to food as prey and tends to evaluate movement before committing to a strike.",
      davyTemperamentSummary: "Confident and intimidating. It does not constantly attack, but its presence can alter the behavior of nearby fish.",
      davyTraits: ["Open-water patrol", "Burst acceleration", "Adaptive camouflage", "Threat display"],
      cost: 450,
      assetFolder: folder,
      asset: "DNA_Dwarf_Chimera_Barracuda_1.png",
      assetVariants: [1, 2, 3, 4, 5].map((number) => `DNA_Dwarf_Chimera_Barracuda_${number}.png`),
      width: 190,
      displayWidth: 190,
      swimStyle: "sporadic",
      speedMode: "dynamic",
      speedMin: 0.034,
      speedMax: 0.095,
      targetMinMs: 1800,
      targetMaxMs: 5200,
      behavior: "free",
      diet: "pellet",
      heartCount: 8,
      caveEnabled: true,
      davyMutation: true,
      storeBackgroundImage: "assets/web/davy/icons/thumbnail_bg.png"
    },
    {
      id: "davy-dwarf-hyperfin",
      seller: "Private Seller",
      genetics: "enhanced",
      name: "Dwarf Hyperfin",
      description: "A compact high-performance fish engineered from some of the fastest and most efficient swimmers in the animal kingdom. Streamlined musculature, drag-reducing skin, stabilizing finlets, and an oversized cardiovascular system allow the Dwarf Hyperfin to accelerate with startling force while remaining small enough for a home aquarium. At rest, it is elegant. At speed, it becomes difficult to follow with your eyes.",
      davyBehaviorLabel: "High-speed open-water runner",
      davyBehaviorSummary: "Calm and deliberate when idle, but highly reactive to movement, food, and open swimming space. It prefers long unobstructed routes through the tank and may repeat high-speed circuits when excited. It is not especially aggressive, but its sudden acceleration can startle slower fish.",
      davySwimStyleSummary: "Built for extreme burst speed. Most of the time it cruises with tiny, efficient tail movements and its fins held close to the body. During a sprint, the body stiffens, the pectoral fins tuck in, the rear finlets stabilize the flow, and the crescent tail beats in very fast, shallow strokes. It turns by banking sharply rather than slowing gradually.",
      davyDietSummary: "High-protein carnivore. Prefers small fish, shrimp, insects, and protein-rich prepared foods. It burns energy quickly and benefits from frequent smaller feedings rather than one large meal.",
      davyTemperamentSummary: "Alert, energetic, and highly visual. It watches movement outside the tank, investigates food immediately, and becomes restless in cramped or cluttered environments. It is more performance-driven than territorial.",
      davyTraits: ["Long-route cruising", "Burst-speed circuits", "Sharp banked turns", "Immediate food response"],
      cost: 475,
      assetFolder: folder,
      asset: "DNA_Dwarf_Hyperfin_1.png",
      assetVariants: [1, 2, 3, 4, 5].map((number) => `DNA_Dwarf_Hyperfin_${number}.png`),
      width: 188,
      displayWidth: 188,
      swimStyle: "steady",
      speedMode: "dynamic",
      speedMin: 0.026,
      speedMax: 0.112,
      targetMinMs: 1000,
      targetMaxMs: 3200,
      behavior: "free",
      diet: "chum",
      heartCount: 7,
      caveEnabled: true,
      davyMutation: true,
      storeBackgroundImage: "assets/web/davy/icons/thumbnail_bg.png"
    }
  ];
}

function isDavyMutationSpecies(speciesOrId) {
  const species = typeof speciesOrId === "string" ? runtime.fishMap.get(speciesOrId) : speciesOrId;
  return species?.davyMutation === true || String(species?.id || speciesOrId || "").startsWith("davy-");
}

function getDavyMutationDayKey(now = Date.now()) {
  const date = new Date(Number(now) || Date.now());
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function hashDavyMutationDailySeed(value = "") {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getDavyMutationDailyOffer(now = Date.now()) {
  const dayKey = getDavyMutationDayKey(now);
  if (runtime.davyMutationDailyOffer?.dayKey === dayKey) {
    return runtime.davyMutationDailyOffer.offer || null;
  }
  const mutations = (runtime.fishCatalog || []).filter((species) => isDavyMutationSpecies(species));
  if (!mutations.length) {
    runtime.davyMutationDailyOffer = { dayKey, offer: null };
    return null;
  }
  let accountName = "local";
  try {
    if (typeof getAccountUsernameForUser === "function") accountName = getAccountUsernameForUser() || accountName;
  } catch {}
  const chanceHash = hashDavyMutationDailySeed(`${dayKey}|${accountName}|bubblebodega-mutation-roll`);
  if ((chanceHash % 10000) >= 500) {
    runtime.davyMutationDailyOffer = { dayKey, offer: null };
    return null;
  }
  const speciesHash = hashDavyMutationDailySeed(`${dayKey}|${accountName}|species`);
  const species = mutations[speciesHash % mutations.length];
  const variants = getFishStoreVariants(species);
  if (!variants.length) {
    runtime.davyMutationDailyOffer = { dayKey, offer: null };
    return null;
  }
  const variantHash = hashDavyMutationDailySeed(`${dayKey}|${accountName}|variant`);
  const variant = variants[variantHash % variants.length];
  const offer = { dayKey, species, variantKey: variant.key, variant };
  runtime.davyMutationDailyOffer = { dayKey, offer };
  return offer;
}

function getBubbleBodegaFishStoreVariants(species) {
  if (isDavyMutationSpecies(species)) {
    const offer = getDavyMutationDailyOffer();
    return offer?.species?.id === species?.id && offer.variant ? [offer.variant] : [];
  }

  const variants = getFishStoreVariants(species);
  // BubbleBodega is a collection view, not a spoiler list. Normal play shows
  // only appearances the player has actually discovered. Debug Mode keeps the
  // complete CURRENT variant set selectable for testing, while obsolete assets
  // have already been filtered out by getFishStoreVariants().
  if (typeof isDebugModeEnabled === "function" && isDebugModeEnabled()) {
    return variants;
  }
  if (typeof isFishSpeciesCareProgressionEligible === "function"
      && isFishSpeciesCareProgressionEligible(species)) {
    return variants.filter((variant) => variant?.unlocked === true);
  }
  return variants;
}

function getOwnedFishCount() {
  return getAllTankFish().length + state.storedFish.length;
}

function getLivingOwnedFishCount() {
  return getAllTankFish().filter((fish) => fish && !isFishDead(fish)).length
    + state.storedFish.filter((fish) => fish && !isFishDead(fish)).length;
}

function getBubbleBodegaRescueOfferStatus() {
  const offer = state?.bubbleBodegaRescueOffer || {};
  const activated = Number(offer.activatedAt) > 0;
  return {
    cycle: Math.max(0, Math.floor(Number(offer.cycle) || 0)),
    issued: Number(offer.issuedAt) > 0,
    activated,
    foodAvailable: activated && !(Number(offer.foodClaimedAt) > 0),
    goldfishAvailable: activated && !(Number(offer.goldfishClaimedAt) > 0),
    redeemed: Number(offer.foodClaimedAt) > 0 && Number(offer.goldfishClaimedAt) > 0
  };
}

function ensureBubbleBodegaRescueOffer(now = Date.now()) {
  if (!state) {
    return getBubbleBodegaRescueOfferStatus();
  }
  if (!state.bubbleBodegaRescueOffer || typeof state.bubbleBodegaRescueOffer !== "object") {
    state.bubbleBodegaRescueOffer = sanitizeBubbleBodegaRescueOffer(null);
  }
  const offer = state.bubbleBodegaRescueOffer;
  const eligible = state.coins <= 0 && getLivingOwnedFishCount() === 0;
  if (!eligible) {
    offer.eligibilityActive = false;
    return getBubbleBodegaRescueOfferStatus();
  }
  if (!offer.eligibilityActive) {
    offer.cycle = Math.max(0, Math.floor(Number(offer.cycle) || 0)) + 1;
    offer.eligibilityActive = true;
    offer.issuedAt = now;
    offer.activatedAt = 0;
    offer.foodClaimedAt = 0;
    offer.goldfishClaimedAt = 0;
  }
  return getBubbleBodegaRescueOfferStatus();
}

function activateBubbleBodegaRescueOffer(now = Date.now()) {
  const status = ensureBubbleBodegaRescueOffer(now);
  if (!status.issued || status.redeemed) {
    return { ...status, accepted: false };
  }
  if (status.activated) {
    return { ...status, accepted: false };
  }
  state.bubbleBodegaRescueOffer.activatedAt = now;
  saveState();
  return { ...getBubbleBodegaRescueOfferStatus(), accepted: true };
}

function markBubbleBodegaRescueItemClaimed(item, now = Date.now()) {
  const field = item === "food" ? "foodClaimedAt" : item === "goldfish" ? "goldfishClaimedAt" : "";
  if (!field || !state?.bubbleBodegaRescueOffer || Number(state.bubbleBodegaRescueOffer[field]) > 0) {
    return false;
  }
  state.bubbleBodegaRescueOffer[field] = now;
  return true;
}

function getFoodPurchaseCost(foodId, packageId = "") {
  const food = getFoodMeta(foodId);
  const packageMeta = getFoodPackageMeta(food, packageId);
  if (!food || !packageMeta) {
    return 0;
  }
  const defaultPackage = getFoodPackageOptions(food)[0] || packageMeta;
  if (food.id === "basic"
    && packageMeta.id === defaultPackage.id
    && getBubbleBodegaRescueOfferStatus().foodAvailable) {
    return 0;
  }
  return packageMeta.cost;
}

function getFoodStoreUse(food) {
  const authoredUse = String(food?.use || food?.foodUse || "").trim().toLowerCase();
  if (["basic", "carnivore", "bottom", "predator", "special"].includes(authoredUse)) return authoredUse;
  if (food?.id === "chum" || /predator|chum/i.test(`${food?.id || ""} ${food?.name || ""}`)) return "predator";
  if (food?.id === "frisky" || food?.id === "halloweenCandy" || /special|spawning|candy/i.test(`${food?.id || ""} ${food?.name || ""}`)) return "special";
  if (/carnivore|meat/i.test(`${food?.id || ""} ${food?.name || ""} ${food?.description || ""}`)) return "carnivore";
  return "basic";
}

function getFoodStoreUseLabel(food) {
  const use = typeof food === "string" ? food : getFoodStoreUse(food);
  return ({ basic: "Food - Basic", carnivore: "Food - Carnivore", bottom: "Food - Bottom Feeders", predator: "Food - Predator", special: "Food - Special" })[use] || "Food - Basic";
}

function isFoodInTankFilterEnabled() {
  return runtime.storeFoodInTank === true;
}

function getActiveTankFeedingCreatures(tank = getCurrentTank()) {
  return (Array.isArray(tank?.fish) ? tank.fish : []).filter((fish) => fish && !isFishDead(fish));
}

function isFoodRelevantToActiveTank(foodOrKey, tank = getCurrentTank()) {
  const foodKey = typeof foodOrKey === "string" ? foodOrKey : String(foodOrKey?.id || "");
  if (!foodKey) return false;
  const creatures = getActiveTankFeedingCreatures(tank);
  // An empty tank should stay browseable. The filter becomes useful as soon as
  // there is a living creature whose authored diet can be checked.
  if (!creatures.length) return true;
  return creatures.some((fish) => canFoodSatisfyFishMeal(fish, foodKey));
}

function getActiveTankFoodFilterSummary(tank = getCurrentTank()) {
  const creatures = getActiveTankFeedingCreatures(tank);
  if (!creatures.length) return "Empty tank: showing all food.";
  const feedingCreatures = creatures.filter((fish) => getFishAcceptedFoodKeys(fish).length > 0 || canFishUseSpawningFood(fish));
  if (!feedingCreatures.length) return "No creatures in this tank currently need stocked food.";
  return `Showing food relevant to ${feedingCreatures.length} ${pluralize("creature", feedingCreatures.length)} in this tank.`;
}

function setFoodInTankFilter(enabled) {
  const nextEnabled = enabled !== false;
  if (runtime.storeFoodInTank === nextEnabled) return;
  runtime.storeFoodInTank = nextEnabled;
  renderFoodShop();
}

function getFishStoreWaterType(fish) {
  const explicitStoreWaterType = String(fish?.storeWaterType || "").trim().toLowerCase();
  if (explicitStoreWaterType === "saltwater" || explicitStoreWaterType === "freshwater") {
    return explicitStoreWaterType;
  }
  const authored = String(fish?.waterType || fish?.water || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (authored === "saltwater" || authored === "marine") return "saltwater";
  if (authored === "freshwater" || authored === "fresh") return "freshwater";
  return [
    "tang", "clownfish", "pufferfish", "royal-gramma", "lionfish",
    "bull-shark", "great-white-shark", "hammerhead-shark", "orca", "sunfish", "seahorse", "pilot-fish"
  ].includes(String(fish?.id || "")) ? "saltwater" : "freshwater";
}

function getFishVariantWaterType(speciesOrFish, appearanceVariantKey = "") {
  const species = speciesOrFish?.speciesId && typeof getSpeciesForFish === "function"
    ? (getSpeciesForFish(speciesOrFish) || speciesOrFish)
    : speciesOrFish;
  const key = getFishAppearanceVariantKey(
    appearanceVariantKey
    || speciesOrFish?.appearanceVariantKey
    || speciesOrFish?.appearanceAssetPath
    || ""
  );
  const variantRequirement = key ? species?.variantRequirements?.[key] : null;
  const variantWaterType = String(variantRequirement?.waterType || "").trim().toLowerCase();
  return variantWaterType === "saltwater" || variantWaterType === "freshwater"
    ? variantWaterType
    : getFishStoreWaterType(species);
}

function getFishStoreWaterTypeLabel(fish) {
  return getFishStoreWaterType(fish) === "saltwater" ? "Salt Water" : "Fresh Water";
}

function getStoreWaterTypeLabel(waterType) {
  return normalizeWaterType(waterType, "freshwater") === "saltwater" ? "Saltwater" : "Freshwater";
}

function getActiveStoreWaterType() {
  return normalizeWaterType(getCurrentTank()?.waterType, "freshwater");
}

function isStoreWaterFilterEnabled(kind) {
  const shopKind = kind === "decor" ? "decor" : "fish";
  if (!runtime.storeWaterFilters || typeof runtime.storeWaterFilters !== "object") {
    runtime.storeWaterFilters = { fish: false, cleanup: false, decor: false };
  }
  return runtime.storeWaterFilters[shopKind] !== false;
}

function isFishCompatibleWithWaterType(fish, waterType = getActiveStoreWaterType()) {
  return getFishVariantWaterType(fish) === normalizeWaterType(waterType, "freshwater");
}

function getDecorStoreWaterTypes(decor) {
  if (!decor || decor.living !== true) return ["freshwater", "saltwater"];
  const authored = Array.isArray(decor.waterTypes) ? decor.waterTypes : [decor.waterType];
  const normalized = authored
    .map((value) => normalizeWaterType(value, ""))
    .filter((value, index, values) => value && values.indexOf(value) === index);
  return normalized.length ? normalized : ["freshwater", "saltwater"];
}

function isDecorCompatibleWithWaterType(decor, waterType = getActiveStoreWaterType()) {
  if (!decor || decor.living !== true) return true;
  return getDecorStoreWaterTypes(decor).includes(normalizeWaterType(waterType, "freshwater"));
}

function getStoreWaterRequirementLabel(kind, entry, waterType = getActiveStoreWaterType()) {
  const compatible = kind === "decor"
    ? isDecorCompatibleWithWaterType(entry, waterType)
    : isFishCompatibleWithWaterType(entry, waterType);
  if (compatible) return "";
  if (kind === "decor") {
    const required = getDecorStoreWaterTypes(entry);
    if (required.length !== 1) return "Requires compatible water";
    return `Requires ${getStoreWaterTypeLabel(required[0])}`;
  }
  return `Requires ${getStoreWaterTypeLabel(getFishStoreWaterType(entry))}`;
}

function isLivingDecorEntry(decorOrKey) {
  const key = typeof decorOrKey === "string" ? normalizeDecorKey(decorOrKey) : normalizeDecorKey(decorOrKey?.decorKey || "");
  const decor = key ? (runtime.decorMap?.get?.(key) || runtime.decorMeta?.[key] || null) : decorOrKey;
  return decor?.living === true;
}

function getPlacedDecorWaterActiveState(item, tank = getCurrentTank()) {
  if (!item) return true;
  const key = normalizeDecorKey(item.decorKey || "");
  const decor = runtime.decorMap?.get?.(key) || runtime.decorMeta?.[key] || null;
  if (!decor?.living) return true;
  return isDecorCompatibleWithWaterType(decor, normalizeWaterType(tank?.waterType, "freshwater"));
}

function isPlacedDecorFunctionallyActive(item, tank = getCurrentTank()) {
  if (!item) return false;
  if (!isLivingDecorEntry(item)) return true;
  return item.active !== false && getPlacedDecorWaterActiveState(item, tank);
}

function syncTankLivingDecorActivity(tank = getCurrentTank()) {
  if (!tank || !Array.isArray(tank.placedDecor)) return { changed: false, activated: [], deactivated: [] };
  const activated = [];
  const deactivated = [];
  let changed = false;
  for (const item of tank.placedDecor) {
    if (!item || !isLivingDecorEntry(item)) continue;
    const nextActive = getPlacedDecorWaterActiveState(item, tank);
    const previousActive = item.active !== false;
    if (previousActive === nextActive) continue;
    item.active = nextActive;
    changed = true;
    (nextActive ? activated : deactivated).push(item);
  }
  return { changed, activated, deactivated };
}

function getDecorStoreSubcategory(decor) {
  if (isCustomDecorUploadShopKey(decor?.key) || isCustomHideShopKey(decor?.key) || isCustomBubblerDecorKey(decor?.key)) return "custom";
  const categories = normalizeStringList(decor?.categories).map((value) => value.toLowerCase());
  const has = (value) => categories.includes(value);
  if (has("bubbler")) return "bubbler";
  if (has("cave")) return "cave";
  if (has("lure")) return "lure";
  if (has("botanical")) return "botanical";
  if (has("coral")) return "coral";
  if (has("wood")) return "wood";
  if (has("plant")) return "plant";
  if (has("rock")) return "rock";
  if (has("ornament") || has("transit")) return "ornament";
  return "other";
}

function getDecorStoreSubcategoryLabel(decor) {
  const subcategory = typeof decor === "string" ? decor : getDecorStoreSubcategory(decor);
  return ({
    rock: "Rocks", plant: "Plants", ornament: "Ornaments", cave: "Caves", coral: "Coral",
    lure: "Lures", wood: "Wood", botanical: "Botanicals", bubbler: "Bubblers",
    background: "Backgrounds", custom: "Custom", other: "Other"
  })[subcategory] || "Other";
}

function getStoreProductFacets(kind, entry) {
  if (kind === "fish") {
    const seller = typeof entry?.seller === "string" && entry.seller.trim()
      ? entry.seller.trim()
      : "BubbleBodega";
    return {
      Availability: [isFishSpeciesShopUnlocked(entry) ? "Available now" : "Locked"],
      Seller: [seller],
      Genetics: [entry.genetics === "enhanced" ? "Enhanced" : "Natural"],
      "Water type": [getStoreWaterTypeLabel(getFishStoreWaterType(entry))],
      Type: [entry.behavior === "free" ? "Free swimming" : entry.behavior || "custom", ...(entry.caveEnabled ? ["Cave fish"] : [])],
      Diet: [entry.diet || "omnivore"]
    };
  }
  if (kind === "decor") {
    const categories = normalizeStringList(entry.categories);
    const behavior = getDecorFishBehaviorMeta(entry.key) || {};
    return {
      Availability: [isDecorShopUnlocked(entry) && isSeasonalDecorAvailable(entry) ? "Available now" : isSeasonalDecor(entry) && !isSeasonalDecorAvailable(entry) ? "Out of season" : "Locked"],
      Type: categories,
      Theme: [getCatalogThemeLabel(entry.theme)],
      Tag: [...new Set([...categories, ...getTankComfortDecorTags({ placedDecor: [{ decorKey: entry.key }] }), ...normalizeStringList(entry.tags)])],
      "Hangout type": normalizeStringList(behavior.hangoutTypes),
      Service: getDecorBoroughServiceTypes(entry.key),
      "Water type": entry.living === true
        ? (typeof getDecorStoreWaterTypes === "function"
          ? getDecorStoreWaterTypes(entry)
          : normalizeStringList(entry.waterTypes || entry.waterType || "freshwater"))
          .map((value) => String(value).toLowerCase().includes("salt") ? "Saltwater" : "Freshwater")
        : ["Universal"]
    };
  }
  if (kind === "background") {
    return {
      Availability: [isBackgroundOwned(entry.key) ? "Owned" : "Available now"],
      Type: ["Backgrounds"],
      // Backgrounds and substrates work with every aquarium. The automatic
      // tank-water filter must not remove their cards from the Decor aisle.
      "Water type": ["Universal"]
    };
  }
  if (kind === "substrate") {
    return {
      Availability: [isSubstrateOwned(entry.id) ? "Owned" : "Available now"],
      Type: ["Substrates"],
      "Water type": ["Universal"]
    };
  }
  return { Type: [kind === "food" ? entry.id === "halloweenCandy" ? "Candy" : "Fish food" : "Medicine"],
    ...(kind === "food" ? { Use: [getFoodStoreUseLabel(entry)] } : {}),
    Availability: ["Available now"] };
}

function renderStoreFacetAttributes(kind, entry) {
  const seller = typeof entry?.seller === "string" && entry.seller.trim()
    ? entry.seller.trim()
    : "BubbleBodega";
  return `data-store-kind="${escapeHtml(kind)}" data-store-facets="${escapeHtml(JSON.stringify(getStoreProductFacets(kind, entry)))}" data-store-seller="${escapeHtml(seller)}"`;
}

function compareFishCatalogBySize(left, right) {
  const leftWidth = Number.isFinite(left?.width) ? left.width : Number.MAX_SAFE_INTEGER;
  const rightWidth = Number.isFinite(right?.width) ? right.width : Number.MAX_SAFE_INTEGER;
  return leftWidth - rightWidth
    || (left?.cost ?? Number.MAX_SAFE_INTEGER) - (right?.cost ?? Number.MAX_SAFE_INTEGER)
    || String(left?.name || "").localeCompare(String(right?.name || ""));
}

function normalizeStoreSortKey(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return ["cost", "name", "theme"].includes(normalized) ? normalized : "cost";
}

function normalizeFishStoreFilterKey(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return ["all", "cave"].includes(normalized) ? normalized : "all";
}

function matchesFishStoreFilter(fish, filterKey = "all") {
  const normalizedFilter = normalizeFishStoreFilterKey(filterKey);
  if (normalizedFilter !== "cave") {
    return true;
  }

  return fish?.caveEnabled === true;
}

function getCatalogThemeLabel(theme) {
  return normalizeCatalogTheme(theme) || "No Theme";
}

function compareCatalogThemes(leftTheme, rightTheme) {
  const left = normalizeCatalogTheme(leftTheme);
  const right = normalizeCatalogTheme(rightTheme);
  if (left && right) {
    return left.localeCompare(right);
  }
  if (left) {
    return -1;
  }
  if (right) {
    return 1;
  }
  return 0;
}

function getFeaturedShopSortRank(entry) {
  const fishId = typeof entry?.id === "string" ? entry.id : "";
  const decorKey = typeof entry?.key === "string" ? entry.key : "";
  if (isCustomFishShopKey(fishId)) {
    return 0;
  }
  if (isCustomDecorUploadShopKey(decorKey)) {
    return 0;
  }
  if (isCustomBubblerDecorKey(decorKey)) {
    return 1;
  }
  return 10;
}

function sortCatalogEntries(entries, sortKey) {
  const normalizedSort = normalizeStoreSortKey(sortKey);
  return [...entries].sort((left, right) => {
    const lockRank = getCatalogLockSortRank(left) - getCatalogLockSortRank(right);
    if (lockRank !== 0) {
      return lockRank;
    }

    if (normalizedSort === "name") {
      return String(left?.name || "").localeCompare(String(right?.name || ""))
        || (left?.cost ?? Number.MAX_SAFE_INTEGER) - (right?.cost ?? Number.MAX_SAFE_INTEGER);
    }

    if (normalizedSort === "theme") {
      return compareCatalogThemes(left?.theme, right?.theme)
        || String(left?.name || "").localeCompare(String(right?.name || ""))
        || (left?.cost ?? Number.MAX_SAFE_INTEGER) - (right?.cost ?? Number.MAX_SAFE_INTEGER);
    }

    return (left?.cost ?? Number.MAX_SAFE_INTEGER) - (right?.cost ?? Number.MAX_SAFE_INTEGER)
      || getFeaturedShopSortRank(left) - getFeaturedShopSortRank(right)
      || String(left?.name || "").localeCompare(String(right?.name || ""));
  });
}

// Species availability is intentionally separate from appearance progression.
// This helper answers only whether the fish TYPE has been unlocked by the
// existing milestone/species system. Variant mastery must never unlock a species.
function isFishSpeciesProgressUnlocked(speciesOrId) {
  const species = typeof speciesOrId === "string"
    ? runtime.fishMap.get(speciesOrId)
    : speciesOrId;
  if (!species) {
    return false;
  }

  if (!species.unlockRequirement) {
    return true;
  }

  return (state?.unlockedFishSpecies || []).includes(species.id);
}

function isFishSpeciesShopUnlocked(speciesOrId) {
  const species = typeof speciesOrId === "string"
    ? runtime.fishMap.get(speciesOrId)
    : speciesOrId;
  if (!species) {
    return false;
  }
  return isDebugModeEnabled() || isFishSpeciesProgressUnlocked(species);
}

function isDecorProgressUnlocked(decorOrKey) {
  const key = normalizeDecorKey(typeof decorOrKey === "string" ? decorOrKey : decorOrKey?.key || decorOrKey?.decorKey || "");
  if (!key || !runtime.decorMap.has(key)) {
    return false;
  }
  const requirement = getDecorUnlockRequirement(key);
  return !requirement || (state?.unlockedDecorKeys || []).includes(key);
}

function isDecorShopUnlocked(decorOrKey) {
  const key = normalizeDecorKey(typeof decorOrKey === "string" ? decorOrKey : decorOrKey?.key || decorOrKey?.decorKey || "");
  if (!key || !runtime.decorMap.has(key)) {
    return false;
  }
  return isDebugModeEnabled() || isDecorProgressUnlocked(key);
}

function getCatalogLockSortRank(entry) {
  const fishId = typeof entry?.id === "string" ? entry.id : "";
  if (fishId && runtime.fishMap.has(fishId) && !isCustomFishShopKey(fishId)) {
    return isFishSpeciesProgressUnlocked(entry) ? 0 : 1;
  }

  const decorKey = normalizeDecorKey(typeof entry?.key === "string" ? entry.key : "");
  if (decorKey && runtime.decorMap.has(decorKey)) {
    return isDecorProgressUnlocked(decorKey) ? 0 : 1;
  }

  return 0;
}

function renderShopThemePill(theme) {
  const label = getCatalogThemeLabel(theme);
  return normalizeCatalogTheme(theme)
    ? `<div class="shop-theme-pill">${escapeHtml(label)}</div>`
    : "";
}

function renderFishShopGeneticsPill(genetics) {
  const normalized = String(genetics || "").trim().toLowerCase();
  if (normalized !== "natural" && normalized !== "enhanced") return "";
  const label = normalized === "enhanced" ? "Enhanced" : "Natural";
  return `<div class="shop-theme-pill">${escapeHtml(label)}</div>`;
}

function normalizeShopSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getStoreSearchQuery(kind) {
  const shopKind = kind === "decor" ? "decor" : "fish";
  return String(runtime.storeSearches?.[shopKind] || "");
}

function getShopSearchTokens(query) {
  const normalized = normalizeShopSearchText(query);
  return normalized ? normalized.split(" ") : [];
}

function matchesShopSearchQuery(haystack, query) {
  const tokens = getShopSearchTokens(query);
  if (!tokens.length) {
    return true;
  }

  const normalizedHaystack = normalizeShopSearchText(haystack);
  return tokens.every((token) => normalizedHaystack.includes(token));
}

function getFishShopSearchHaystack(fish) {
  return [
    fish?.name,
    fish?.id,
    fish?.behavior,
    fish?.diet,
    getUnlockRequirementLabel(fish?.unlockRequirement),
    ...getSpeciesNeedTags(fish).map((tag) => getComfortTagLabel(tag)),
    ...getSpeciesConflictTags(fish).map((tag) => getComfortTagLabel(tag)),
    fish?.caveEnabled === true ? "cave cave fish" : "",
    formatFishShopBehavior(fish)
  ].filter(Boolean).join(" ");
}

function getDecorAppearanceVariantKey(pathOrKey) {
  return typeof pathOrKey === "string" ? pathOrKey.split(/[?#]/)[0].split("/").pop() : "";
}

function getDecorVariantGroupId(decorOrKey) {
  const decor = typeof decorOrKey === "string" ? runtime.decorMap.get(normalizeDecorKey(decorOrKey)) : decorOrKey;
  const explicit = typeof decor?.variantGroup === "string" ? decor.variantGroup.trim() : "";
  return explicit || "";
}

function compareDecorVariantEntries(left, right) {
  const leftKey = getDecorAppearanceVariantKey(left?.key || left?.path || "");
  const rightKey = getDecorAppearanceVariantKey(right?.key || right?.path || "");
  const leftMatch = leftKey.match(/^(.*?)(?:_(\d+))?(\.[^./?#]+)?$/i);
  const rightMatch = rightKey.match(/^(.*?)(?:_(\d+))?(\.[^./?#]+)?$/i);
  const leftBaseRank = leftMatch?.[2] ? Number(leftMatch[2]) : 0;
  const rightBaseRank = rightMatch?.[2] ? Number(rightMatch[2]) : 0;
  return leftBaseRank - rightBaseRank
    || String(left?.name || "").localeCompare(String(right?.name || ""))
    || leftKey.localeCompare(rightKey);
}

function getDecorStoreVariantEntries(decorOrKey, catalogEntries = null) {
  const decor = typeof decorOrKey === "string" ? runtime.decorMap.get(normalizeDecorKey(decorOrKey)) : decorOrKey;
  if (!decor) {
    return [];
  }

  const groupId = getDecorVariantGroupId(decor);
  if (!groupId) {
    return [decor];
  }

  const source = Array.isArray(catalogEntries) ? catalogEntries : runtime.decorCatalog;
  const variants = source.filter((entry) => getDecorVariantGroupId(entry) === groupId);
  return (variants.length ? variants : [decor]).slice().sort(compareDecorVariantEntries);
}

function getDecorStoreVariants(decorOrKey, catalogEntries = null) {
  const variants = getDecorStoreVariantEntries(decorOrKey, catalogEntries);
  return variants.map((entry, index) => ({
    key: entry.key,
    image: getDecorThumbnailPath(entry),
    label: String(entry?.variantLabel || entry?.name || "").trim() || (index === 0 ? "Main" : `Variant ${index}`),
    cost: Math.max(0, Number(entry?.cost) || 0)
  }));
}

function isDecorStoreRepresentative(decorOrKey, catalogEntries = null) {
  const decor = typeof decorOrKey === "string" ? runtime.decorMap.get(normalizeDecorKey(decorOrKey)) : decorOrKey;
  if (!decor) {
    return false;
  }
  const variants = getDecorStoreVariantEntries(decor, catalogEntries);
  return (variants[0]?.key || "") === decor.key;
}

function getDecorStoreCatalogEntries(entries) {
  return (Array.isArray(entries) ? entries : []).filter((decor) => {
    const groupId = getDecorVariantGroupId(decor);
    return !groupId || isDecorStoreRepresentative(decor, entries);
  });
}

function getDecorShopSearchHaystack(decor) {
  return [
    decor?.name,
    decor?.key,
    decor?.theme,
    getDecorUnlockRequirementLabel(decor),
    ...(Array.isArray(decor?.categories) ? decor.categories : [])
  ].filter(Boolean).join(" ");
}

function renderShopToolbar(kind, visibleCount, totalCount = visibleCount) {
  const shopKind = kind === "decor" ? "decor" : "fish";
  const tutorialRestriction = getTutorialStoreRestriction(shopKind);
  const selectedSort = normalizeStoreSortKey(runtime.storeSorts?.[shopKind]);
  const selectedFilter = tutorialRestriction
    ? "all"
    : shopKind === "fish"
      ? normalizeFishStoreFilterKey(runtime.storeFilters?.fish)
      : "all";
  const query = tutorialRestriction ? "" : getStoreSearchQuery(shopKind);
  const itemLabel = shopKind === "decor"
    ? pluralize("decor piece", visibleCount)
    : (selectedFilter === "cave" ? "cave fish" : "creatures");
  const toolbarTitle = shopKind === "decor" ? "Decor" : "Aquarium Fish";
  const titleMarkup = `<h3 class="shop-toolbar-title">${toolbarTitle}</h3>`;
  const summaryMarkup = totalCount !== visibleCount
    ? `<div class="fish-meta shop-toolbar-summary"><span class="shop-toolbar-count"><strong>${visibleCount}</strong> of <strong>${totalCount}</strong></span> ${itemLabel} available</div>`
    : `<div class="fish-meta shop-toolbar-summary"><span class="shop-toolbar-count"><strong>${visibleCount}</strong></span> ${itemLabel} available</div>`;

  if (tutorialRestriction?.hideControls) {
    return `
      <div class="shop-toolbar">
        ${titleMarkup}
        ${summaryMarkup}
      </div>
    `;
  }

  return `
    <div class="shop-toolbar">
      ${titleMarkup}
      ${summaryMarkup}
      <div class="shop-toolbar-controls">
        <label class="shop-search-control">
          <span>Search</span>
          <input
            class="shop-search-input"
            type="search"
            value="${escapeHtml(query)}"
            placeholder="Type to filter..."
            data-shop-search="${shopKind}"
            aria-label="Search ${shopKind} shop" />
        </label>
        <label class="shop-sort-control">
          <span>Sort by</span>
          <select class="shop-sort-select" data-shop-sort="${shopKind}" aria-label="Sort ${shopKind} shop">
            <option value="cost" ${selectedSort === "cost" ? "selected" : ""}>Cost</option>
            <option value="name" ${selectedSort === "name" ? "selected" : ""}>Name</option>
            ${shopKind === "decor" ? `<option value="theme" ${selectedSort === "theme" ? "selected" : ""}>Theme</option>` : ""}
          </select>
        </label>
        <label class="shop-water-filter-control">
          <span>Tank match</span>
          <span class="shop-water-filter-toggle">
            <input type="checkbox" data-shop-water-filter="${shopKind}" ${typeof isStoreWaterFilterEnabled !== "function" || isStoreWaterFilterEnabled(shopKind) ? "checked" : ""} />
            <strong>${typeof getActiveStoreWaterType === "function" && typeof getStoreWaterTypeLabel === "function" ? getStoreWaterTypeLabel(getActiveStoreWaterType()) : "Current tank"}</strong>
          </span>
        </label>
      </div>
    </div>
  `;
}

function setStoreSort(kind, value) {
  const shopKind = kind === "decor" ? "decor" : "fish";
  const nextSort = normalizeStoreSortKey(value);
  if (runtime.storeSorts?.[shopKind] === nextSort) {
    return;
  }

  runtime.storeSorts[shopKind] = nextSort;
  if (shopKind === "decor") {
    renderDecorShop();
    return;
  }
  renderFishShop();
}

function setStoreFilter(kind, value) {
  const shopKind = kind === "fish" ? "fish" : null;
  if (!shopKind) {
    return;
  }

  const nextFilter = normalizeFishStoreFilterKey(value);
  if (runtime.storeFilters?.[shopKind] === nextFilter) {
    return;
  }

  runtime.storeFilters[shopKind] = nextFilter;
  renderFishShop();
}

function setStoreWaterFilter(kind, enabled) {
  const shopKind = kind === "decor" ? "decor" : kind === "fish" ? "fish" : null;
  if (!shopKind) return;
  runtime.storeWaterFilters ||= { fish: true, decor: true };
  const nextEnabled = enabled !== false;
  if (runtime.storeWaterFilters[shopKind] === nextEnabled) return;
  runtime.storeWaterFilters[shopKind] = nextEnabled;
  if (shopKind === "decor") renderDecorShop();
  else renderFishShop();
}

function setStoreSearchQuery(kind, value, options = {}) {
  const shopKind = kind === "decor" ? "decor" : "fish";
  const nextValue = String(value || "");
  if (runtime.storeSearches?.[shopKind] === nextValue) {
    return;
  }

  runtime.storeSearches[shopKind] = nextValue;
  if (shopKind === "decor") {
    renderDecorShop();
  } else {
    renderFishShop();
  }

  if (options.preserveFocus) {
    const container = shopKind === "decor" ? dom.decorShop : dom.fishShop;
    const nextInput = container?.querySelector(`[data-shop-search="${shopKind}"]`);
    if (nextInput instanceof HTMLInputElement) {
      try {
        nextInput.focus({ preventScroll: true });
      } catch (error) {
        nextInput.focus();
      }
      if (Number.isInteger(options.selectionStart) && Number.isInteger(options.selectionEnd)) {
        try {
          nextInput.setSelectionRange(options.selectionStart, options.selectionEnd);
        } catch (error) {
          console.debug("Search selection restore skipped.", error);
        }
      }
    }
  }
}

function isFishSpeciesUnlocked(speciesOrId) {
  return isFishSpeciesProgressUnlocked(speciesOrId);
}

function isOtherAquariumCreature(species) {
  const behavior = String(species?.behavior || "").trim().toLowerCase();
  return behavior === "shrimp" || behavior === "snail";
}

function isFishSpeciesCatalogEnabled(speciesOrId) {
  const species = typeof speciesOrId === "string"
    ? runtime.fishMap.get(speciesOrId)
    : speciesOrId;
  if (!species) {
    return false;
  }
  return species.Fish_enabled !== false || isDebugModeEnabled();
}

function getFishShopCatalog() {
  const davyOffer = getDavyMutationDailyOffer();
  return runtime.fishCatalog.filter((species) => (
    species
    && isFishSpeciesCatalogEnabled(species)
    && !HIDDEN_FISH_OPTION_IDS.has(species.id)
    && !isCustomFishShopKey(species.id)
    && !isOtherAquariumCreature(species)
    && species.proteusExclusive !== true
    && species.artPending !== true
    && species.storeHiddenUntilArt !== true
    && (!isDavyMutationSpecies(species) || davyOffer?.species?.id === species.id)
  ));
}

function getOtherAquariumCreatureShopCatalog() {
  return runtime.fishCatalog.filter((species) => (
    species
    && isFishSpeciesCatalogEnabled(species)
    && isOtherAquariumCreature(species)
    && species.proteusExclusive !== true
    && !isDavyMutationSpecies(species)
    && !isCustomFishShopKey(species.id)
    && species.artPending !== true
    && species.storeHiddenUntilArt !== true
  ));
}

function getStarterFishSpecies() {
  const activeWaterType = getActiveStoreWaterType();
  const preferredStarterId = activeWaterType === "saltwater" ? "firefish" : "goldfish";
  const starterCatalog = getFishShopCatalog().filter((species) => (
    species?.starterFish === true
    && isFishCompatibleWithWaterType(species, activeWaterType)
  ));
  const unlockedStarters = starterCatalog.filter((species) => isFishSpeciesUnlocked(species));
  const candidates = unlockedStarters.length ? unlockedStarters : starterCatalog;
  const preferredStarter = candidates.find((species) => species.id === preferredStarterId);
  if (preferredStarter) {
    return preferredStarter;
  }
  return [...candidates].sort(compareFishCatalogBySize)[0] || null;
}

function getFishPurchaseCost(speciesId) {
  if (isCustomFishShopKey(speciesId)) {
    return CUSTOM_FISH_COST;
  }

  if (speciesId === "goldfish" && getBubbleBodegaRescueOfferStatus().goldfishAvailable) {
    return 0;
  }

  return runtime.fishMap.get(speciesId)?.cost ?? 0;
}

function unlockFishSpecies(speciesId, now = Date.now(), reasonText = "") {
  const species = runtime.fishMap.get(speciesId);
  if (!species || isFishSpeciesUnlocked(species)) {
    return false;
  }

  state.unlockedFishSpecies = sanitizeUnlockedFishSpecies([
    ...(state.unlockedFishSpecies || []),
    speciesId
  ]);
  // Unlocking a species only makes the fish type available. Creating its mastery
  // record seeds the authored base appearance, but never grants alternates.
  if (typeof getFishSpeciesMasteryRecord === "function") {
    getFishSpeciesMasteryRecord(speciesId, { species });
  }

  pushEvent(reasonText || `${species.name} is now available in the shop.`, now);
  return true;
}
