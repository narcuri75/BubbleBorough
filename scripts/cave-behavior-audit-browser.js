/* Appended to the normal module by the opt-in local debug server only.
 * All scenarios live in memory. Uses real placement, fish creation, planning,
 * rendering and motion; does not force portal admission or bypass fit checks. */
(() => {
  // Keep the aquarium readable; the panel supplies the behavior diagnostics.
  drawDebugFishBehaviorBroadcast = () => {};
  const panel = document.createElement("section");
  panel.style.cssText = "position:fixed;top:8px;left:8px;z-index:2147483647;width:440px;max-height:42vh;overflow:auto;padding:10px;background:#07151fee;color:#a7f3d0;font:12px monospace";
  panel.innerHTML = '<b>Cave playtest · memory only</b><div><button id="auditFresh">Build freshwater scene</button> <button id="auditReef">Build reef scene</button> <button id="auditRoomy">Build larger shelters</button> <button id="auditCluster">Build ceramic tube scene</button> <button id="auditFlicker">Test front shell sweep</button> <button id="auditVisits">Start eligible visits</button></div><pre id="caveAuditReadout">Waiting for game initialization</pre>';
  document.body.append(panel);
  const readout = panel.querySelector("pre");
  const buttons = [...panel.querySelectorAll("button")];
  buttons.forEach(button => { button.disabled = true; });
  const history = new Map();
  const blocked = new Map();
  const frontSweepIds = new Set();
  const collectPlans = collectCaveBehaviorPlansForFish;
  collectCaveBehaviorPlansForFish = (...args) => frontSweepIds.has(args[0]?.id) ? [] : collectPlans(...args);
  const desiredDepth = getDesiredFishTankDepthZ;
  getDesiredFishTankDepthZ = fish => frontSweepIds.has(fish?.id) ? 0.45 : desiredDepth(fish);
  const resolveMove = resolveFishCaveCollision;
  resolveFishCaveCollision = (...args) => {
    const result = resolveMove(...args);
    if (result.blocked) blocked.set(args[0].id, result.caveInteriorBlocked ? "interior" : result.blockingCave?.item?.decorKey?.split("__")[0] || "decor");
    else blocked.delete(args[0].id);
    return result;
  };
  let stats = {}, startedAt = 0, setupBusy = false, diagnostics = "";
  const reset = () => { history.clear(); blocked.clear(); startedAt = Date.now(); stats = { entries: 0, arrivals: 0, exits: 0, abandoned: 0, largeSteps: 0, stalledFish: 0, maxStep: 0, arrivalsBySpecies: {}, exitsBySpecies: {} }; };
  const completeArrival = completeFishCaveEntryArrival;
  completeFishCaveEntryArrival = (...args) => {
    const result = completeArrival(...args);
    if (startedAt && !setupBusy) {
      stats.arrivals++;
      const id = args[0].speciesId;
      stats.arrivalsBySpecies[id] = (stats.arrivalsBySpecies[id] || 0) + 1;
    }
    return result;
  };
  const release = releaseFishFromCaveWithMomentum;
  releaseFishFromCaveWithMomentum = (...args) => {
    const result = release(...args);
    if (result && startedAt && !setupBusy) {
      stats.exits++;
      const id = args[0].speciesId;
      stats.exitsBySpecies[id] = (stats.exitsBySpecies[id] || 0) + 1;
    }
    return result;
  };
  async function build(reef, roomy = false, cluster = false) {
    if (!state || !runtime.lastAnimationUpdateAt || setupBusy) return;
    setupBusy = true;
    frontSweepIds.clear();
    try {
      const tank = getCurrentTank();
      tank.waterType = reef ? "saltwater" : "freshwater";
      state.fish.splice(0); state.placedDecor.splice(0); runtime.activeFishCavePlans.clear();
      runtime.freshGameSaveLocked = false;
      state.tutorial = getDisabledIntroTutorialState();
      const caveNames = cluster ? ["ceramic-tube-cluster"] : roomy ? ["terracotta-pot", "broken-terracotta-pot", "terracotta-pot", "broken-terracotta-pot"] : ["terracotta-pot", "ceramic-tube-cluster", "slate-stack", "hollow-mossy-driftwood", "broken-terracotta-pot", "seashell-cluster", "clay-multi", "extra-narrow-pleco-tubes"];
      const selected = caveNames.map(name => [...runtime.decorMap.values()].find(decor => decor.key?.startsWith(name + "__") && isCaveDecorKey(decor.key))).filter(Boolean);
      for (const [index, decor] of selected.entries()) {
        state.decorInventory[decor.key] = (state.decorInventory[decor.key] || 0) + 1;
        runtime.placementMode = { scale: cluster ? 2.2 : roomy ? Math.min(2.2, getDecorScaleDefault(decor.key) * 2) : getDecorScaleDefault(decor.key), freePlacementEnabled: true };
        createPlacedDecor(decor.key, cluster ? 0.5 : roomy ? 0.24 + (index % 2) * 0.52 : 0.16 + (index % 4) * 0.22,
          cluster || roomy ? 0.72 : index < 4 ? 0.64 : 0.44, roomy ? index + 1 : index < 4 ? 3 : 2);
      }
      runtime.placementMode = null;
      const speciesIds = cluster ? ["danio", "guppy", "tetra"] : reef
        ? ["firefish", "clownfish", "six-line-wrasse", "coral-beauty-angelfish", "marine-shrimp", "cleaner-shrimp", "assessor", "basslets-grammas", "cardinal", "dottyback"]
        : ["betta", "molly", "swordtail", "guppy", "tetra", "gourami", "freshwater-shrimp", "angelfish", "goldfish", "discus"];
      for (const [index, id] of speciesIds.entries()) {
        const fish = createFishRecord(id, { xNorm: 0.14 + (index % 5) * 0.17, yNorm: 0.32 + Math.floor(index / 5) * 0.25, tankLayer: 3, desiredTankLayer: 3, tankSubLayer: TANK_SUBLAYER_FRONT, personality: "homebody", needs: { hunger: 95, comfort: 95, social: 95, energy: 95 } });
        if (fish) state.fish.push(fish);
      }
      await preloadImages(getTankSwitchPreloadPaths(tank), { maxAttempts: 2 });
      if (dom.loadingOverlay) dom.loadingOverlay.hidden = true;
      for (const element of document.querySelectorAll('[role="dialog"]')) element.hidden = true;
      setDebugFishActionIndicatorsEnabled(false);
      normalizePlacedDecorState(); renderUi(Date.now()); renderTank(Date.now()); diagnostics = ""; reset();
    } catch (error) { readout.textContent = error.stack; }
    finally { setupBusy = false; }
  }
  panel.querySelector("#auditFresh").onclick = () => build(false);
  panel.querySelector("#auditReef").onclick = () => build(true);
  panel.querySelector("#auditRoomy").onclick = () => build(false, true);
  panel.querySelector("#auditCluster").onclick = () => build(false, false, true);
  panel.querySelector("#auditFlicker").onclick = async () => {
    await build(false, false, true);
    const item = state.placedDecor[0];
    const bounds = getPlacedDecorBounds(item);
    const probeRows = [];
    for (const [index, fish] of state.fish.entries()) {
      clearFishCaveBehavior(fish);
      frontSweepIds.add(fish.id);
      fish.z = 0.51; fish.desiredZ = 0.45;
      const species = getSpeciesForFish(fish);
      let solid = false;
      for (const v of [0.3, 0.4, 0.5, 0.6]) {
        if (solid) break;
        for (const u of [0.25 + index * 0.2, 0.3, 0.5, 0.7]) {
          fish.xNorm = (bounds.left + (bounds.right - bounds.left) * u) / TANK_WIDTH;
          fish.yNorm = (bounds.top + (bounds.bottom - bounds.top) * v) / TANK_HEIGHT;
          const pose = getFishContinuousDepthCollisionPose(fish, species, Date.now());
          if (getOverlappingDecorForFish(fish, species, Date.now(), pose,
            { depthZ: 0.45, depthFromZ: 0.51 }).some(hit => hit.item.id === item.id)) { solid = true; break; }
        }
      }
      fish.targetXNorm = index === 1 ? 0.26 : 0.76;
      fish.targetYNorm = fish.yNorm; fish.targetAt = Date.now() + 30000;
      fish.blockedDecorId = item.id; fish.blockedDecorUntil = Date.now() + 60000;
      if (index === 1) { fish.activity = "idle"; fish.targetXNorm = fish.xNorm; }
      probeRows.push(`${fish.speciesId}: solid-shell probe=${solid} xy=${fish.xNorm.toFixed(3)},${fish.yNorm.toFixed(3)}`);
    }
    diagnostics = "Front sweep: start Z=.510, requested Z=.45, cave Z=.500. Solid shell must hold depth; transparent exterior may clear it.\n" + probeRows.join("\n");
    reset();
  };
  panel.querySelector("#auditVisits").onclick = () => {
    const messages = [];
    for (const fish of state?.fish || []) {
      if (fish.caveState || fish.activity !== "roam") continue;
      const plan = collectCaveBehaviorPlansForFish(fish)[0];
      messages.push(`${fish.speciesId}: enabled=${getSpeciesForFish(fish)?.caveEnabled}, plan=${Boolean(plan)}`);
      if (plan) messages.push(`start=${beginFishCaveBehavior(fish, plan)}`);
    }
    for (const item of state.placedDecor) {
      const fish = state.fish.find(f => f.speciesId === "guppy") || state.fish[0];
      const species = getSpeciesForFish(fish);
      const triggers = getCaveTriggerRegions(item), seats = getCaveSeatRegions(item);
      messages.push(`${item.decorKey.split("__")[0]} L${getDecorTankLayer(item)} scale=${item.scale}: triggers=${triggers.length} seats=${seats.length} allowed=${Boolean(getCaveAllowedSpaceDescriptor(item))} fit=${triggers.filter(t=>doesFishFitCaveRegionSize(t,fish,species,0.42)).length}/${seats.filter(s=>doesFishFitCaveRegionSize(s,fish,species,0.45)).length} portal=${triggers.filter(t=>portalOpeningFitsFish(item,fish,species,Date.now(),t,1)).length} seat=${seats.filter(s=>doesFishFitAtCavePoint(item,fish,species,Date.now(),s,1)).length}`);
      if (triggers[0] && seats[0]) {
        const trigger = triggers[0], seat = seats[0], now = Date.now();
        const match = getPortalMatchForTriggerRegion(item, trigger, getCaveBehaviorProfileForItem(item));
        const entryDirection = match?.mouthPoint.xNorm >= fish.xNorm ? 1 : -1;
        const facing = getCaveSeatFacingDirection(seat, entryDirection);
        messages.push(`  mouth=${trigger.xNorm.toFixed(3)},${trigger.yNorm.toFixed(3)} seat=${seat.xNorm.toFixed(3)},${seat.yNorm.toFixed(3)} idle=${Boolean(pickCaveSeatIdleTarget(item,seat,fish,species,now,1))} nodes=${Boolean(buildTriggerSeatEntryNodes(item,trigger,seat,fish,species,now,1))} direct=${pathStaysInsideCave(item,fish,species,now,trigger,seat)} busy=${isFishCaveEntranceBusy(fish,item.id,trigger,species,now)} plan=${Boolean(buildSimpleCaveDockingPlan(item,fish,now))}`);
        messages.push(`  direction=${entryDirection}/${facing} matchedFit=${portalOpeningFitsFish(item,fish,species,now,match.mouthPoint,entryDirection)} affinity=${getCaveSeatPortalIds(seat).join(',')}/${match.portal.id} facingNodes=${Boolean(buildTriggerSeatEntryNodes(item,trigger,seat,fish,species,now,facing))} occupied=${isCaveSeatOccupied(item.id,seat.id,fish.id)} neighbors=${getCaveCollisionFrameCandidates(getDecorTankLayer(item),now).filter(c=>c.item.id!==item.id).length}`);
      }
    }
    diagnostics = messages.join("\n");
  };
  window.setInterval(() => {
    const ready = Boolean(state && runtime.lastAnimationUpdateAt);
    buttons.forEach(button => { button.disabled = !ready || setupBusy; });
    if (!ready) return;
    if (!startedAt) { readout.textContent = "Ready · choose a test aquarium"; return; }
    if (!startedAt || setupBusy) return;
    const now = Date.now(); const rows = []; let stalled = 0;
    for (const fish of state.fish) {
      const old = history.get(fish.id); const caveState = fish.caveState || "swim";
      const plan = getActiveFishCavePlan(fish);
      const step = old ? Math.hypot(fish.xNorm - old.x, fish.yNorm - old.y) : 0;
      const changed = caveState !== old?.state;
      let progressedAt = old?.progressedAt || now;
      if (changed || Math.hypot(fish.xNorm - (old?.checkpointX ?? fish.xNorm), fish.yNorm - (old?.checkpointY ?? fish.yNorm)) > 0.006) progressedAt = now;
      if (changed && caveState === "approach") stats.entries++;
      if (changed && caveState === "swim" && old && !["swim", "leave"].includes(old.state)) stats.abandoned++;
      if (step > 0.03) stats.largeSteps++;
      stats.maxStep = Math.max(stats.maxStep, step);
      if (caveState !== "swim" && plan?.normalInsideMode !== "seat-hold" && now - progressedAt > 8000) stalled++;
      history.set(fish.id, { x: fish.xNorm, y: fish.yNorm, checkpointX: progressedAt === now ? fish.xNorm : old?.checkpointX, checkpointY: progressedAt === now ? fish.yNorm : old?.checkpointY, progressedAt, state: caveState });
      rows.push(`${fish.speciesId.padEnd(20)} ${caveState.padEnd(12)} ${String(plan?.normalInsideMode || "").padEnd(10)} ${Math.round((now - progressedAt) / 1000)}s d=${Math.hypot(fish.xNorm-fish.targetXNorm,fish.yNorm-fish.targetYNorm).toFixed(3)} v=${Math.hypot(fish.motionVelocityXNorm||0,fish.motionVelocityYNorm||0).toFixed(3)} retry=${plan?.collisionFailures||0}`);
      rows.push(`  depth=${getFishTankLayer(fish)}/${getFishTankSubLayer(fish)} z=${Number(fish.z).toFixed(3)} render=${getFishRenderPassLayer(fish)}/${getFishRenderPassSubLayer(fish)} blocked=${blocked.get(fish.id)||"no"}`);
      if (fish.caveState) rows.push(`  ${fish.activity} ${getCaveBehaviorDecorById(plan?.decorId)?.decorKey?.split("__")[0]} xy=${fish.xNorm.toFixed(3)},${fish.yNorm.toFixed(3)} target=${fish.targetXNorm.toFixed(3)},${fish.targetYNorm.toFixed(3)} facing=${getFishFacingDirection(fish)} turn=${getFishHorizontalTurnState(fish,now).active} hold=${Boolean(plan?.portalFacingHold)} blocked=${blocked.get(fish.id)||"no"} portal=${Number(fish.cavePortalProgress||0).toFixed(2)}`);
    }
    stats.stalledFish = stalled;
    readout.textContent = JSON.stringify({ seconds: Math.round((now - startedAt) / 1000), caves: state.placedDecor.length, fish: state.fish.length, ...stats, maxStep: +stats.maxStep.toFixed(4) }, null, 2) + "\n" + rows.join("\n") + "\n" + diagnostics;
  }, 250);
})();
