// Frozen pre-batch-3 parity oracle; not included in the game bundle.
// Preserved app.js SHA-256 967d909516afb4910006a7db5833cf37f8eac15ac3d2a07d6b7fefaa3fdb4cb6.
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

  let customSocialAffinity = "";
  if (!category && species?.customAsset) {
    customSocialAffinity = typeof normalizeCustomFishSocialAffinity === "function"
      ? normalizeCustomFishSocialAffinity(species.socialAffinity)
      : ["independent", "schooling"].includes(String(species.socialAffinity || "").toLowerCase())
        ? String(species.socialAffinity || "").toLowerCase()
        : "adaptive";
    if (customSocialAffinity === "independent") {
      category = "solitary";
      source = "custom-social-affinity";
    } else if (customSocialAffinity === "schooling") {
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

  let socialMode = normalizeFishSocialMode(
    fish?.socialMode
    ?? species?.socialMode
    ?? species?.socialProfile?.socialMode
    ?? configuredSpeciesProfile?.socialMode
  );
  if (!socialMode) {
    if (customSocialAffinity === "schooling") socialMode = "school";
    else if (category === "pair_bond") socialMode = "pair";
    else if (category === "host_bond") socialMode = "host";
    else if (category === "solitary") socialMode = "solitary";
    else if (category === "own_kind_required") socialMode = "school";
    else if (category === "own_kind_preferred") socialMode = "shoal";
    else socialMode = "flexible";
  }

  const socialGroupId = normalizeFishSocialGroupId(
    fish?.socialGroupId
    ?? species?.socialGroupId
    ?? species?.socialProfile?.socialGroupId
    ?? configuredSpeciesProfile?.socialGroupId
    ?? ""
  ) || null;

  const configuredSocialMinimum = Number(
    fish?.socialMinimum
    ?? species?.socialMinimum
    ?? species?.socialProfile?.socialMinimum
    ?? configuredSpeciesProfile?.socialMinimum
  );
  const configuredSocialIdeal = Number(
    fish?.socialIdeal
    ?? species?.socialIdeal
    ?? species?.socialProfile?.socialIdeal
    ?? configuredSpeciesProfile?.socialIdeal
  );
  const defaultSocialMinimum = ["school", "shoal", "pair", "pod"].includes(socialMode) ? 2 : 0;
  const defaultSocialIdeal = socialMode === "pair"
    ? 2
    : ["school", "shoal", "pod"].includes(socialMode)
      ? 4
      : 0;
  const socialMinimum = Math.max(0, Number.isFinite(configuredSocialMinimum)
    ? Math.round(configuredSocialMinimum)
    : defaultSocialMinimum);
  const socialIdeal = Math.max(
    socialMinimum,
    Number.isFinite(configuredSocialIdeal) ? Math.round(configuredSocialIdeal) : defaultSocialIdeal
  );

  const configuredMinimum = Number(
    fish?.socialOwnKindMinimum
    ?? species?.socialOwnKindMinimum
    ?? species?.socialProfile?.ownKindMinimum
    ?? configuredSpeciesProfile?.ownKindMinimum
    ?? (category === "own_kind_required" ? socialMinimum : undefined)
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
  const affinityGroups = normalizeFishAffinityGroups([
    ...normalizeFishAffinityGroups(
      fish?.affinityGroups
      ?? fish?.socialAffinityGroups
      ?? species?.affinityGroups
      ?? species?.socialAffinityGroups
      ?? species?.socialProfile?.affinityGroups
      ?? configuredSpeciesProfile?.affinityGroups
      ?? []
    ),
    fish?.socialAffinityGroup
      ?? species?.socialAffinityGroup
      ?? species?.socialProfile?.affinityGroup
      ?? configuredSpeciesProfile?.affinityGroup
      ?? ""
  ]);
  const affinityGroup = affinityGroups[0] || "";
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
    socialGroupId,
    socialMode,
    socialMinimum,
    socialIdeal,
    affinityGroups,
    // Keep the singular field as a compatibility alias for the established
    // friendship/relationship scoring code. New social satisfaction uses the array.
    affinityGroup,
    sizeClass,
    sizeLabel,
    sizeRank,
    requiresOwnKind: category === "own_kind_required",
    prefersOwnKind: ["own_kind_required", "own_kind_preferred", "pair_bond"].includes(category),
    pairBondCapable: category === "pair_bond" || socialMode === "pair",
    hostBondCapable: category === "host_bond" || socialMode === "host",
    solitary: category === "solitary" || socialMode === "solitary",
    coordinatedSchooling: ["school", "pod"].includes(socialMode),
    crossSpeciesFriendshipCapable: category !== "solitary" && socialMode !== "solitary"
  };
}

function getFishDisposition(fish, now = Date.now()) {
  if (isProteusZombieFish(fish) && !isFishDead(fish)) {
    const targetId = String(fish?.zombieAggressionTargetId || "");
    const target = targetId && typeof getManagedFishById === "function" ? getManagedFishById(targetId)?.fish : null;
    if (Number(fish?.zombieAggressionUntil) > now && target && !isFishDead(target)) {
      return { mood: "Hostile", activity: `Pursuing ${target.name || "tankmate"}` };
    }
    return { mood: "Unresponsive", activity: "No affect detected" };
  }
  const active = typeof getActiveFishActionQueueItem === "function" ? getActiveFishActionQueueItem(fish, now) : null;
  const intent = typeof sanitizeBehaviorIntent === "function" ? sanitizeBehaviorIntent(fish?.behaviorIntent, now) : fish?.behaviorIntent || null;
  const action = String(active?.action || intent?.type || "").toLowerCase();
  const steeringTargetId = typeof runtime !== "undefined" && runtime?.fishActionSteeringByFishId
    ? runtime.fishActionSteeringByFishId.get(fish?.id)?.targetFishId
    : null;
  const partnerId = active?.targetId || intent?.targetId || steeringTargetId;
  const partner = partnerId && typeof getManagedFishById === "function" ? getManagedFishById(partnerId)?.fish : null;
  const currentTank = typeof getFishSimulationTank === "function"
    ? getFishSimulationTank(fish)
    : (typeof getCurrentTank === "function" ? getCurrentTank() : null);
  // Share only within this synchronous evaluation. Edits and time changes
  // remain visible on the very next call without an invalidation protocol.
  const facts = typeof getTankComfortFacts === "function" ? getTankComfortFacts(currentTank, now) : null;
  const needsStatus = typeof getFishNeedsStatus === "function" ? getFishNeedsStatus(fish, currentTank, now, facts) : [];
  const conflicts = typeof getFishConflictStatus === "function" ? getFishConflictStatus(fish, currentTank, now, facts) : [];
  const dirtiness = typeof getTankDirtiness === "function" ? clamp(Number(getTankDirtiness(now, currentTank)) || 0, 0, 1) : 0;
  const comfort = typeof getFishComfort === "function"
    ? getFishComfort(fish, now, currentTank, facts ? { facts, needsStatus, conflicts, dirtiness } : null).value : 1;
  const healthRatio = typeof getFishHealthRatio === "function" ? clamp(Number(getFishHealthRatio(fish)) || 0, 0, 1) : 1;
  const personality = typeof getFishPersonality === "function" ? getFishPersonality(fish) : "";
  const mealFree = typeof isMealFreeFish === "function" ? isMealFreeFish(fish) : false;
  const hunger = mealFree || typeof getFishNeedValue !== "function" ? 100 : getFishNeedValue(fish, "hunger", now);
  const activeConflicts = conflicts.filter((conflict) => conflict?.active);
  const missingNeeds = needsStatus.filter((need) => need && !need.met);
  const biologicalSocialStatus = typeof getFishBiologicalSocialStatus === "function"
    ? getFishBiologicalSocialStatus(fish, currentTank, now)
    : null;
  const socialSatisfaction = typeof getFishSocialSatisfaction === "function"
    ? getFishSocialSatisfaction(fish, currentTank, now)
    : null;
  const lonelinessScore = clamp(Number(fish?.lonelinessScore) || 0, 0, 100);
  const lonelinessThreshold = typeof FISH_LONELY_MOOD_THRESHOLD !== "undefined" ? FISH_LONELY_MOOD_THRESHOLD : 45;
  const visibleLoneliness = Boolean(socialSatisfaction?.lonelinessEligible && lonelinessScore >= lonelinessThreshold);
  const missingHabitatNeeds = missingNeeds.filter((need) => need.tag !== "school_2_plus" && need.tag !== "social_own_kind");
  const immediateThreat = typeof getFishImmediateFoodThreat === "function" ? getFishImmediateFoodThreat(fish, now) : null;
  const hungerLowThreshold = typeof FISH_HUNGER_LOW_THRESHOLD !== "undefined" ? FISH_HUNGER_LOW_THRESHOLD : 55;
  const hungerCriticalThreshold = typeof FISH_HUNGER_CRITICAL_THRESHOLD !== "undefined" ? FISH_HUNGER_CRITICAL_THRESHOLD : 14;
  const gravelPebbleActivity = typeof FISH_GRAVEL_PEBBLE_ACTIVITY !== "undefined" ? FISH_GRAVEL_PEBBLE_ACTIVITY : "gravel_pebble";
  const behaviorSignals = fish?.behaviorSignals && typeof fish.behaviorSignals === "object" ? fish.behaviorSignals : {};
  const avoidSignal = behaviorSignals.avoid_specific_fish;
  const recentAvoidance = Boolean(avoidSignal && (!Number(avoidSignal.expiresAt) || Number(avoidSignal.expiresAt) > now));
  const nightSleepSignal = behaviorSignals.night_sleep;
  const naturalSleepWindow = Boolean(nightSleepSignal && (!Number(nightSleepSignal.expiresAt) || Number(nightSleepSignal.expiresAt) > now));
  const friendSignal = behaviorSignals.follow_friend;
  const recentFriendInteraction = Boolean(friendSignal && (!Number(friendSignal.expiresAt) || Number(friendSignal.expiresAt) > now));
  const sensitiveTemperament = ["sensitive", "shy", "nervous"].includes(personality);
  const threatConflictTags = new Set(["betta_present", "aggressive_predator", "fin_nipper", "large_fish"]);
  const stressConflictTags = new Set(["overcrowded", "surface_crowding", "sharp_decor", "same_species", "tang_present", "puffer_present", "community_fish"]);
  const mildConflictTags = new Set(["fast_eater", "tiny_fish"]);
  const threateningConflict = activeConflicts.find((conflict) => threatConflictTags.has(conflict.tag));
  const stressfulConflict = activeConflicts.find((conflict) => stressConflictTags.has(conflict.tag));
  const mildConflict = activeConflicts.find((conflict) => mildConflictTags.has(conflict.tag));
  const isAcclimating = typeof isFishInNewTankAcclimation === "function"
    ? isFishInNewTankAcclimation(fish, now)
    : false;

  let nearbyFriend = null;
  const nearbyTankFish = Array.isArray(currentTank?.fish)
    ? currentTank.fish
    : (typeof state !== "undefined" && Array.isArray(state?.fish) ? state.fish : []);
  if (nearbyTankFish.length && fish?.id) {
    const relationships = typeof sanitizeFishRelationships === "function"
      ? sanitizeFishRelationships(fish.relationships)
      : (fish.relationships && typeof fish.relationships === "object" ? fish.relationships : {});
    nearbyFriend = nearbyTankFish
      .filter((otherFish) => otherFish && otherFish.id !== fish.id)
      .map((otherFish) => ({
        fish: otherFish,
        relation: relationships[otherFish.id],
        distance: Math.hypot(
          (Number(fish.xNorm) || 0.5) - (Number(otherFish.xNorm) || 0.5),
          (Number(fish.yNorm) || 0.5) - (Number(otherFish.yNorm) || 0.5)
        )
      }))
      .filter((entry) => (
        (typeof areFishEstablishedFriends === "function"
          ? areFishEstablishedFriends(fish, entry.fish)
          : entry.relation?.kind === "friend")
        && entry.distance <= 0.24
        && (typeof canFishBuildFriendship !== "function" || canFishBuildFriendship(fish, entry.fish, now, { passive: false }))
      ))
      .sort((left, right) => left.distance - right.distance)[0] || null;
  }

  const calmed = typeof isFishCalmed === "function" && isFishCalmed(fish, now);
  const hostileAction = !calmed && (/attack|chase|nip|aggress|confront|territorial warning|breeding aggression|betta confrontation/.test(action)
    || (fish?.bettaRivalRole === "aggressor" && ((Number(fish?.bettaRivalChaseUntil) || 0) > now || (Number(fish?.bettaRivalDisplayUntil) || 0) > now)));
  const scaredAction = !calmed && /avoid|flee|yield|scurry|retreat/.test(action);

  // Phase 5 makes the mood an explanation of the most important CURRENT
  // condition. Actionable welfare states outrank harmless flavor states.
  if (!calmed && ((Number(fish?.panicUntil) || 0) > now || comfort <= 0.15)) {
    return { mood: "Panicked", activity: "Trying to get somewhere safe" };
  }

  const primaryCondition = typeof getFishPrimaryCondition === "function"
    ? getFishPrimaryCondition(fish, now)
    : (typeof isFishDiseaseVisible === "function" && isFishDiseaseVisible(fish) ? "infection" : "healthy");
  if (["parasites", "infection", "osmotic-stress"].includes(primaryCondition) || healthRatio <= 0.45) {
    return { mood: "Sick", activity: healthRatio <= 0.45 ? "Hurt and not feeling well" : "Not feeling well" };
  }
  if (primaryCondition === "recovering") {
    return { mood: "Cozy", activity: "Recovering and taking it easy" };
  }

  // Hostile describes the aggressor. Merely sharing a tank with a conflict
  // does not make a fish hostile.
  if (hostileAction) {
    return {
      mood: "Hostile",
      activity: partner
        ? "Confronting " + (partner.name || "another fish")
        : "Driving another fish away"
    };
  }

  // Scared requires an identifiable threat, active escape behavior, or recent
  // learned avoidance. Compatibility threats are also surfaced here so a fish
  // cannot look Cozy while living beside something its care profile fears.
  if (!calmed && (scaredAction || immediateThreat || recentAvoidance || threateningConflict)) {
    const threatName = immediateThreat?.fish?.name || intent?.targetName || partner?.name || "";
    return {
      mood: "Scared",
      activity: threatName
        ? "Keeping away from " + threatName
        : threateningConflict
          ? "Keeping away from a threatening tankmate"
          : "Looking for somewhere safe"
    };
  }

  // Critical hunger is specific and actionable enough to beat generic
  // environmental stress. Less urgent hunger is considered after habitat care.
  if (!mealFree && hunger <= hungerCriticalThreshold) {
    return { mood: "Hungry", activity: "Really needs a meal" };
  }

  // During acclimation, ordinary social/environmental moods are suppressed.
  // A genuinely injured fish still surfaces an actionable state instead of
  // having that problem hidden behind Neutral.
  if (isAcclimating && healthRatio <= 0.7) {
    return { mood: "Stressed", activity: "Recovering from poor health" };
  }
  if (isAcclimating) {
    return { mood: "Neutral", activity: "Settling into its new home" };
  }

  if ((Number(fish?.pairBondMourningUntil) || 0) > now) {
    const partnerName = String(fish?.pairBondPartnerName || "").trim();
    return {
      mood: "Sad",
      activity: partnerName ? `Missing ${partnerName}` : "Missing its bonded partner"
    };
  }

  if (visibleLoneliness) {
    return {
      mood: "Lonely",
      activity: typeof getFishLonelyActivityText === "function"
        ? getFishLonelyActivityText(fish, socialSatisfaction)
        : "Looking for company"
    };
  }

  const severeEnvironmentProblem = Boolean(stressfulConflict)
    || dirtiness >= (sensitiveTemperament ? 0.65 : 0.7)
    || missingHabitatNeeds.length >= 2
    || healthRatio <= 0.7
    || comfort <= 0.4;
  if (severeEnvironmentProblem && !calmed) {
    let activity = "Having a hard time settling down";
    if (stressfulConflict?.tag === "overcrowded" || stressfulConflict?.tag === "surface_crowding") {
      activity = "Looking for more swimming room";
    } else if (stressfulConflict?.tag === "sharp_decor") {
      activity = "Keeping clear of sharp decor";
    } else if (healthRatio <= 0.7) {
      activity = "Recovering from poor health";
    } else if (dirtiness >= (sensitiveTemperament ? 0.65 : 0.7)) {
      activity = "Bothered by the dirty tank";
    } else if (missingHabitatNeeds.length >= 2) {
      activity = "Missing several things it needs in the tank";
    }
    return { mood: "Stressed", activity };
  }

  // Sad is reserved for broadly low wellbeing when there is not a clearer
  // immediate care problem to show instead.
  if (comfort <= 0.55 && !mildConflict && dirtiness < 0.45 && missingHabitatNeeds.length === 0) {
    return { mood: "Sad", activity: "Keeping to itself" };
  }

  const mildEnvironmentProblem = Boolean(mildConflict)
    || dirtiness >= (sensitiveTemperament ? 0.4 : 0.45)
    || missingHabitatNeeds.length > 0
    || comfort <= 0.64;
  if (mildEnvironmentProblem) {
    let activity = "Keeping an eye on its surroundings";
    if (dirtiness >= (sensitiveTemperament ? 0.4 : 0.45)) {
      activity = "Noticing the tank could use a clean";
    } else if (missingHabitatNeeds.length > 0) {
      const needLabel = String(missingHabitatNeeds[0]?.label || "something in its habitat").toLowerCase();
      activity = "Looking for " + needLabel;
    } else if (mildConflict) {
      activity = "Keeping a little extra distance from tankmates";
    }
    return { mood: "Uneasy", activity };
  }

  if (!mealFree && hunger <= hungerLowThreshold) {
    return { mood: "Hungry", activity: action === "waitfood" ? "Watching the food dispenser" : "Looking for food" };
  }

  if (fish?.activity === "feeding" || action === "eat") {
    return { mood: "Happy", activity: "Enjoying a meal" };
  }
  if (/sleep|rest/.test(action) || naturalSleepWindow) {
    return { mood: "Sleepy", activity: "Settling into a quiet spot" };
  }
  if (/zoomies/.test(action)) {
    return { mood: "Hyper", activity: "Burning off some energy" };
  }
  if (/play|pebble/.test(action) || fish?.activity === gravelPebbleActivity) {
    return { mood: "Playful", activity: /pebble/.test(action) ? "Tossing a little pebble" : "Having a little fun" };
  }
  const socialNeedSatisfied = !socialSatisfaction?.lonelinessEligible || lonelinessScore < lonelinessThreshold;
  if (socialNeedSatisfied && (/hangout|greet|follow|school|breed|mate/.test(action) || nearbyFriend || recentFriendInteraction)) {
    return {
      mood: "Social",
      activity: partner
        ? "Hanging out with " + (partner.name || "a friend")
        : nearbyFriend?.fish
          ? "Hanging out with " + (nearbyFriend.fish.name || "a friend")
          : "Swimming with the neighbors"
    };
  }
  if (/hide|home/.test(action) || fish?.caveState) {
    return { mood: "Cozy", activity: "Tucked into a favorite corner" };
  }
  if (/inspect|explor|dig|forage|graze/.test(action)) {
    return { mood: "Curious", activity: "Investigating the neighborhood" };
  }

  // Personality and species traits remain inputs to behavior selection. They do
  // not impersonate a current emotion when no matching behavior/cause exists.
  return { mood: "Happy", activity: "Watching the world drift by" };
}
