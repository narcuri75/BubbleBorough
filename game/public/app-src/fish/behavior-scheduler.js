// Source fragment: fish/behavior-scheduler.js
// A deliberately small, shared decision layer. Movement, collision, cave and
// feeding executors remain in their established modules; this owns only the
// fish's long-lived intention and its cheap, local perception snapshot.

function getFishBehaviorScheduler() {
  if (!runtime.fishBehaviorScheduler) {
    runtime.fishBehaviorScheduler = {
      cursor: 0,
      spatial: new Map(),
      spatialAt: 0,
      spatialCellSize: 0.22,
      environment: { signature: "", checkedAt: 0, zones: { cover: [], rest: [], open: [], substrate: [] } },
      events: [],
      urgentFishIds: new Set(),
      pathQueue: [],
      metrics: { startedAt: 0, evaluations: 0, queries: 0, deferred: 0, totalEvalMs: 0, maxEvalMs: 0, last: null },
      counters: { evaluations: 0, queries: 0, deferred: 0, maxMs: 0, frameAt: 0 }
    };
  }
  return runtime.fishBehaviorScheduler;
}

function getFishBehaviorSimulationTier(fish, now = Date.now()) {
  if (fish?.caveState || (Number(fish?.restUntil) || 0) > now) return "background";
  if ((Number(fish?.panicUntil) || 0) > now || fish?.activity === "feeding" || fish?.schoolLeaderId) return "active";
  return "normal";
}

function getFishBehaviorCapabilities(fishOrSpecies) {
  const species = fishOrSpecies?.speciesId ? getSpeciesForFish(fishOrSpecies) : fishOrSpecies;
  const locomotion = getFishLocomotionProfile(fishOrSpecies || species);
  const profile = getFishBehaviorProfile(fishOrSpecies || species);
  const defaults = {
    school: locomotion.schoolStrength > 0.25,
    feed: !["sucker"].includes(species?.behavior),
    hide: locomotion.caveAffinity > 0.35,
    rest: locomotion.hoverChance > 0.08 || profile.slowGraceful,
    explore: !profile.detritusDiet,
    territorial: (getFishPersonality(fishOrSpecies) || "") === "territorial" || profile.group === "special-predator",
    modules: [locomotion.schoolStrength > 0.25 ? "schooling" : "", profile.detritusDiet ? "grazing" : "", profile.nightActive ? "night-activity" : "", profile.predatorDiet ? "predator" : ""].filter(Boolean)
  };
  const override = FISH_BEHAVIOR_CAPABILITY_OVERRIDES[species?.id] || {};
  return { ...defaults, ...override, modules: override.modules || defaults.modules };
}

function processFishBehaviorPathQueue(now = Date.now()) {
  const scheduler = getFishBehaviorScheduler();
  const request = scheduler.pathQueue.shift();
  if (!request) return;
  const fish = getFishByIdFast(request.fishId);
  const brain = fish?.behaviorBrain;
  if (!fish || !brain?.path || brain.path.state !== "queued") return;
  // The established navigation executor owns actual obstacle routing. This
  // capped handoff asks it for one fresh target without allowing a stampede.
  fish.targetAt = now;
  brain.path.state = "recovering";
  brain.path.lastRequestAt = now;
}

function updateFishBehaviorSchoolStates(now = Date.now()) {
  const scheduler = getFishBehaviorScheduler();
  const schools = new Map();
  for (const fish of state?.fish || []) {
    const leader = getFishSchoolFollowLeader(fish);
    if (!leader || !Number.isFinite(Number(fish.followUntil)) || fish.followUntil <= now) continue;
    const group = schools.get(leader.id) || { leaderId: leader.id, leaderTarget: { xNorm: leader.targetXNorm, yNorm: leader.targetYNorm }, members: [], alert: false, updatedAt: now };
    group.members.push(fish.id);
    group.alert ||= (Number(fish.panicUntil) || 0) > now;
    schools.set(leader.id, group);
  }
  scheduler.schools = schools;
  return schools;
}

function updateFishBehaviorPathStatus(fish, brain, now = Date.now()) {
  if (!brain.target || !Number.isFinite(Number(brain.target.xNorm))) return;
  const distanceSq = (fish.xNorm - brain.target.xNorm) ** 2 + (fish.yNorm - brain.target.yNorm) ** 2;
  const path = brain.path || (brain.path = { lastDistanceSq: distanceSq, lastProgressAt: now, state: "direct" });
  const targetChanged = !Number.isFinite(path.targetXNorm)
    || !Number.isFinite(path.targetYNorm)
    || Math.hypot(brain.target.xNorm - path.targetXNorm, brain.target.yNorm - path.targetYNorm) > 0.03;
  // Compare cumulative progress against a checkpoint. Comparing only adjacent
  // thought ticks falsely declares slow, steadily moving fish stuck.
  if (targetChanged || distanceSq + 0.0001 < path.lastDistanceSq) {
    path.lastProgressAt = now;
    path.lastDistanceSq = distanceSq;
    path.targetXNorm = brain.target.xNorm;
    path.targetYNorm = brain.target.yNorm;
  }
  if (now - path.lastProgressAt > 5000 && distanceSq > 0.004) {
    path.state = "queued";
    path.lastProgressAt = now;
    const scheduler = getFishBehaviorScheduler();
    if (!scheduler.pathQueue.some((request) => request.fishId === fish.id)) scheduler.pathQueue.push({ fishId: fish.id, queuedAt: now });
  } else if (path.state === "recovering" && distanceSq < 0.004) {
    path.state = "arrived";
  }
}

function getFishBehaviorEnvironmentCache(now = Date.now()) {
  const scheduler = getFishBehaviorScheduler();
  const tank = getCurrentTank();
  const decor = Array.isArray(tank?.placedDecor) ? tank.placedDecor : [];
  if (now - scheduler.environment.checkedAt < 2000) return scheduler.environment.zones;
  const signature = decor.map((item) => `${item.id}:${item.xNorm}:${item.yNorm}:${item.decorKey}`).join("|");
  scheduler.environment.checkedAt = now;
  if (signature === scheduler.environment.signature) return scheduler.environment.zones;
  const zones = { cover: [], rest: [], open: [], substrate: [{ xNorm: 0.5, yNorm: 0.86, zoneType: "substrate" }] };
  for (const item of decor) {
    const meta = getDecorFishBehaviorMeta(item) || {};
    const zoneType = String(meta.zoneType || meta.behaviorType || "").toLowerCase();
    const point = { xNorm: clamp(Number(item.xNorm) || 0.5, 0.08, 0.92), yNorm: clamp(Number(item.yNorm) || 0.6, 0.14, 0.9), decorId: item.id, zoneType };
    if (/hide|cave|plant|hardscape|shelter/.test(zoneType)) zones.cover.push(point);
    if (/rest|plant|cave|hardscape/.test(zoneType)) zones.rest.push(point);
  }
  zones.open.push({ xNorm: 0.5, yNorm: 0.48, zoneType: "open" });
  scheduler.environment.signature = signature;
  scheduler.environment.zones = zones;
  return zones;
}

function dispatchFishBehaviorEvent(type, payload = {}, now = Date.now()) {
  const scheduler = getFishBehaviorScheduler();
  scheduler.events.push({ type: String(type || ""), payload, at: now });
  if (scheduler.events.length > 32) scheduler.events.splice(0, scheduler.events.length - 32);
}

function deliverFishBehaviorEvents(now = Date.now()) {
  const scheduler = getFishBehaviorScheduler();
  if (!scheduler.events.length) return;
  const events = scheduler.events.splice(0);
  for (const event of events) for (const fish of state?.fish || []) {
    if (!fish || isFishDead(fish)) continue;
    const brain = ensureFishBehaviorBrain(fish, now);
    if (event.type === "GLASS_TAPPED") {
      brain.memory.disturbanceAt = event.at;
      brain.nextThinkAt = Math.min(brain.nextThinkAt, now + 20);
      scheduler.urgentFishIds.add(fish.id);
    } else if (event.type === "FOOD_ADDED") {
      brain.memory.foodAt = event.at;
      brain.nextThinkAt = Math.min(brain.nextThinkAt, now + 60);
    } else if (event.type === "DECOR_CHANGED") {
      getFishBehaviorScheduler().environment.checkedAt = 0;
    } else if (event.type === "AGGRESSIVE_DAMAGE" && event.payload.fishId === fish.id) {
      brain.memory.attackedAt = event.at;
      brain.nextThinkAt = Math.min(brain.nextThinkAt, now + 20);
      scheduler.urgentFishIds.add(fish.id);
    } else if (event.type === "FISH_DIED") {
      brain.memory.deathSeenAt = event.at;
    } else if (event.type === "LIGHT_STATE_CHANGED") {
      brain.memory.lightChangedAt = event.at;
      brain.nextThinkAt = Math.min(brain.nextThinkAt, now + 200);
    }
  }
}

function createFishBehaviorBrain(fish, now = Date.now()) {
  const personality = getFishPersonality(fish) || "curious";
  const trait = (name) => clamp(0.5 + (personality === name ? 0.14 : 0) + (Math.random() - 0.5) * 0.16, 0.25, 0.75);
  return {
    traits: { curiosity: trait("curious"), social: trait("social"), confidence: trait("bold"), activity: trait("explorer"), territorial: trait("territorial") },
    intention: "cruise",
    stage: "travel",
    target: null,
    startedAt: now,
    commitUntil: now + 1800 + Math.random() * 1800,
    nextThinkAt: now + Math.random() * 700,
    lastBiologyAt: now,
    memory: {},
    history: {},
    scores: []
  };
}

function ensureFishBehaviorBrain(fish, now = Date.now()) {
  if (!fish.behaviorBrain || typeof fish.behaviorBrain !== "object") fish.behaviorBrain = createFishBehaviorBrain(fish, now);
  return fish.behaviorBrain;
}

function advanceFishBehaviorBrainOffline(fish, now = Date.now()) {
  if (!fish?.behaviorBrain || typeof fish.behaviorBrain !== "object") return false;
  const brain = ensureFishBehaviorBrain(fish, now);
  const elapsedMs = Math.max(0, now - (Number(brain.lastBiologyAt) || now));
  if (!elapsedMs) return false;
  // Slow state is already advanced by the tank simulation. The brain only
  // decays temporary knowledge and resumes with a fresh, non-synchronized
  // thinking offset when the tank is shown again.
  for (const [key, value] of Object.entries(brain.memory || {})) {
    if (/At$/.test(key) && now - Number(value) > 12 * 60 * 1000) delete brain.memory[key];
  }
  if (now >= (Number(brain.commitUntil) || 0)) {
    brain.intention = "cruise";
    brain.stage = "resume";
    brain.target = null;
  }
  brain.lastBiologyAt = now;
  brain.nextThinkAt = now + 250 + Math.random() * 900;
  return true;
}

function rebuildFishBehaviorSpatialHash(now = Date.now()) {
  const scheduler = getFishBehaviorScheduler();
  if (scheduler.spatialAt === now) return scheduler;
  scheduler.spatial.clear();
  const size = scheduler.spatialCellSize;
  for (const fish of state?.fish || []) {
    if (!fish || isFishDead(fish)) continue;
    const key = `${Math.floor((fish.xNorm || 0) / size)}:${Math.floor((fish.yNorm || 0) / size)}`;
    const bucket = scheduler.spatial.get(key);
    if (bucket) bucket.push(fish); else scheduler.spatial.set(key, [fish]);
  }
  scheduler.spatialAt = now;
  return scheduler;
}

function getFishBehaviorLocalPerception(fish, now = Date.now()) {
  const scheduler = rebuildFishBehaviorSpatialHash(now);
  const size = scheduler.spatialCellSize;
  const cellX = Math.floor((fish.xNorm || 0) / size);
  const cellY = Math.floor((fish.yNorm || 0) / size);
  const nearby = [];
  for (let y = cellY - 1; y <= cellY + 1; y += 1) for (let x = cellX - 1; x <= cellX + 1; x += 1) {
    for (const other of scheduler.spatial.get(`${x}:${y}`) || []) if (other !== fish) nearby.push(other);
  }
  scheduler.counters.queries += 1;
  return nearby;
}

function scoreFishBehaviorIntentions(fish, species, brain, nearby, now = Date.now()) {
  const hunger = 1 - clamp(getFishNeedValue(fish, "hunger", now) / 100, 0, 1);
  const socialNeed = 1 - clamp(getFishNeedValue(fish, "social", now) / 100, 0, 1);
  const energy = clamp(getFishNeedValue(fish, "energy", now) / 100, 0, 1);
  const fear = Math.max((Number(fish.panicUntil) || 0) > now ? 1 : 0, getFishDisposition(fish, now)?.mood === "Panicked" ? 0.85 : 0);
  const profile = getFishLocomotionProfile(fish || species);
  const capabilities = getFishBehaviorCapabilities(fish);
  const food = (getCurrentTank()?.floatingPellets || []).length;
  const schoolmates = nearby.reduce((count, other) => count + (getFishSchoolingCompatibilityId(other) === getFishSchoolingCompatibilityId(fish) ? 1 : 0), 0);
  const cooldown = (key) => Math.max(0, 1 - Math.min(1, (now - (Number(brain.history[key]) || 0)) / 9000));
  const scores = [
    ["flee", fear * 1.2],
    ["feed", capabilities.feed && food ? hunger * (0.65 + brain.traits.activity * 0.2) * (1 - fear) : 0],
    ["school", capabilities.school ? Math.min(1, profile.schoolStrength * (0.4 + socialNeed + schoolmates * 0.12) * (1 - fear * 0.25)) : 0],
    ["rest", capabilities.rest ? (1 - energy) * (0.5 + (profile.hoverChance || 0)) : 0],
    ["explore", capabilities.explore ? brain.traits.curiosity * (0.25 + energy * 0.35) * (1 - cooldown("explore")) : 0],
    ["cruise", 0.3 + brain.traits.activity * 0.25]
  ].map(([type, value]) => ({ type, value: clamp(value, 0, 1) }));
  scores.sort((a, b) => b.value - a.value);
  return scores;
}

function selectFishBehaviorTarget(fish, species, intention, nearby, now = Date.now()) {
  if (intention === "flee") {
    const threat = nearby[0];
    return threat ? getAvoidanceEscapeTarget(fish, species, threat) : null;
  }
  const zones = getFishBehaviorEnvironmentCache(now);
  if (intention === "explore") return pickPersonalityDecorBehaviorTarget(fish, species, now) || zones.open[0] || null;
  if (intention === "rest") {
    const available = zones.rest.filter((zone) => {
      const decor = state.placedDecor.find((item) => item.id === zone.decorId);
      return decor && (getFishDecorClaimId(fish, now) === decor.id || getDecorClaimCount(decor.id, fish, now) < getDecorShelterCapacity(decor));
    });
    return available.find((zone) => zone.decorId === getFishDecorClaimId(fish, now)) || pickDecorHangoutTarget(species, fish, now, {
      allowedZoneTypes: ["hide", "plant", "hardscape"], preferBackLayer: true, chanceMultiplier: 1.25, lingerMultiplier: 1.8
    });
  }
  return null;
}

function runFishBehaviorScheduler(now = Date.now()) {
  if (!state?.fish?.length || runtime.boroughOverviewOpen) return;
  const scheduler = getFishBehaviorScheduler();
  const metrics = scheduler.metrics;
  if (!metrics.startedAt) metrics.startedAt = now;
  if (now - metrics.startedAt >= 1000) {
    const elapsedSeconds = Math.max(0.001, (now - metrics.startedAt) / 1000);
    metrics.last = {
      evaluationsPerSecond: metrics.evaluations / elapsedSeconds,
      queriesPerSecond: metrics.queries / elapsedSeconds,
      deferredPerSecond: metrics.deferred / elapsedSeconds,
      averageEvaluationMs: metrics.evaluations ? metrics.totalEvalMs / metrics.evaluations : 0,
      maximumEvaluationMs: metrics.maxEvalMs
    };
    metrics.startedAt = now;
    metrics.evaluations = 0;
    metrics.queries = 0;
    metrics.deferred = 0;
    metrics.totalEvalMs = 0;
    metrics.maxEvalMs = 0;
  }
  const pelletCount = (getCurrentTank()?.floatingPellets || []).length;
  if (Number.isFinite(scheduler.lastPelletCount) && pelletCount > scheduler.lastPelletCount) {
    dispatchFishBehaviorEvent("FOOD_ADDED", { count: pelletCount - scheduler.lastPelletCount }, now);
  }
  scheduler.lastPelletCount = pelletCount;
  if (scheduler.counters.frameAt !== now) scheduler.counters = { evaluations: 0, queries: 0, deferred: 0, maxMs: 0, frameAt: now };
  rebuildFishBehaviorSpatialHash(now);
  getFishBehaviorEnvironmentCache(now);
  deliverFishBehaviorEvents(now);
  processFishBehaviorPathQueue(now);
  updateFishBehaviorSchoolStates(now);
  const fishList = state.fish;
  const loadScale = clamp(fishList.length / 40, 1, 4);
  const budget = Math.max(2, Math.min(10, Math.ceil(fishList.length / 8)));
  for (let scanned = 0; scanned < fishList.length && scheduler.counters.evaluations < budget; scanned += 1) {
    const urgentId = scheduler.urgentFishIds.values().next().value;
    if (urgentId) scheduler.urgentFishIds.delete(urgentId);
    const fish = urgentId ? getFishByIdFast(urgentId) : fishList[scheduler.cursor++ % fishList.length];
    if (!fish || isFishDead(fish) || fish.caveState || fish.activity === "feeding") continue;
    const brain = ensureFishBehaviorBrain(fish, now);
    const leader = getFishSchoolFollowLeader(fish);
    if (leader && Number(fish.followUntil) > now && (Number(fish.panicUntil) || 0) <= now) {
      brain.intention = "school";
      brain.stage = fish.schoolState || "formation";
      brain.nextThinkAt = now + 1800 + Math.random() * 1200;
      continue;
    }
    if (now < brain.nextThinkAt) continue;
    const startedAt = performance.now();
    const species = getSpeciesForFish(fish);
    if (!species) continue;
    const nearby = getFishBehaviorLocalPerception(fish, now);
    const scores = scoreFishBehaviorIntentions(fish, species, brain, nearby, now);
    const winner = scores[0];
    const current = scores.find((score) => score.type === brain.intention);
    const emergency = winner.type === "flee" && winner.value > 0.7;
    if (emergency || now >= brain.commitUntil || winner.value > (current?.value || 0) + 0.18) {
      brain.intention = winner.type;
      brain.stage = winner.type === "rest" ? "approach" : "travel";
      brain.target = selectFishBehaviorTarget(fish, species, winner.type, nearby, now);
      brain.startedAt = now;
      brain.commitUntil = now + (winner.type === "flee" ? 1200 : 2600 + Math.random() * 3600);
      brain.history[winner.type] = now;
      setFishBehaviorIntent(fish, winner.type, `score ${winner.value.toFixed(2)}`, now, { durationMs: brain.commitUntil - now + 600 });
    }
    brain.scores = scores.slice(0, 4);
    brain.memory.nearbyFish = nearby.slice(0, 8).map((other) => other.id);
    const tier = getFishBehaviorSimulationTier(fish, now);
    // Scale only background/ordinary thought under load. Emergency movement,
    // feeding and active schools retain responsive cadence.
    const normalDelayScale = tier === "normal" ? loadScale : 1;
    const backgroundDelayScale = tier === "background" ? loadScale : 1;
    brain.nextThinkAt = now + (emergency ? 280 : tier === "active" ? 420 + Math.random() * 380 : tier === "background" ? (2800 + Math.random() * 1800) * backgroundDelayScale : (650 + Math.random() * 750) * normalDelayScale);
    updateFishBehaviorPathStatus(fish, brain, now);
    scheduler.counters.evaluations += 1;
    const evaluationMs = performance.now() - startedAt;
    scheduler.counters.maxMs = Math.max(scheduler.counters.maxMs, evaluationMs);
    metrics.evaluations += 1;
    metrics.queries += 1;
    metrics.totalEvalMs += evaluationMs;
    metrics.maxEvalMs = Math.max(metrics.maxEvalMs, evaluationMs);
  }
  if (scheduler.counters.evaluations >= budget) {
    const deferred = Math.max(0, fishList.length - scheduler.counters.evaluations);
    scheduler.counters.deferred += deferred;
    metrics.deferred += deferred;
  }
}

function applyScheduledFishBehaviorTarget(fish, species, now = Date.now()) {
  const brain = fish?.behaviorBrain;
  if (!brain || now >= brain.commitUntil || !brain.target || ["school", "feed"].includes(brain.intention)) return false;
  return applyBehaviorTarget(fish, species, { ...brain.target, intentType: brain.intention, intentCause: "central behavior scheduler" }, now);
}

function getFishBehaviorDebugSnapshot(fish, now = Date.now()) {
  const brain = ensureFishBehaviorBrain(fish, now);
  const scheduler = getFishBehaviorScheduler();
  const velocityX = Number(fish?.motionVelocityXNorm) || 0;
  const velocityY = Number(fish?.motionVelocityYNorm) || 0;
  return {
    intention: brain.intention,
    stage: brain.stage,
    nextUpdateAt: brain.nextThinkAt,
    traits: brain.traits,
    scores: brain.scores,
    memory: brain.memory,
    path: brain.path || null,
    pathQueueSize: scheduler.pathQueue.length,
    capabilities: getFishBehaviorCapabilities(fish),
    school: scheduler.schools?.get(getFishSchoolFollowLeader(fish)?.id) || null,
    tier: getFishBehaviorSimulationTier(fish, now),
    performance: scheduler.counters,
    metrics: scheduler.metrics.last,
    locomotion: {
      speed: Math.hypot(velocityX, velocityY),
      swimSpeed: Number(fish?.swimSpeed) || 0,
      velocityX,
      velocityY,
      headingX: Number(fish?.traversalHeadingXNorm) || 0,
      headingY: Number(fish?.traversalHeadingYNorm) || 0,
      desiredHeadingX: Number(fish?.traversalDesiredHeadingXNorm) || 0,
      desiredHeadingY: Number(fish?.traversalDesiredHeadingYNorm) || 0,
      steeringX: Number(fish?.steeringHeadingXScreen) || 0,
      steeringY: Number(fish?.steeringHeadingYScreen) || 0,
      verticalRatio: Number(fish?.steeringVerticalRatio) || 0,
      speedBias: Number(fish?.locomotionSpeedBias) || 1,
      propulsionState: String(fish?.locomotionPropulsionState || "cruise"),
      pathWanderRadians: Number(fish?.locomotionPathWanderRadians) || 0,
      turnCooldownUntil: Number(fish?.turnaroundCooldownUntil) || 0,
      obstacleReason: Number(fish?.traversalObstacleUntil) > now
        ? String(fish?.traversalObstacleReason || "detour")
        : "none",
      schoolState: String(fish?.schoolState || "none"),
      schoolPathDelayMs: Number(fish?.schoolPathDelayMs) || 0
    }
  };
}
