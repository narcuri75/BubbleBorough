// Fish care courses, the player-led Pharmacy puzzle, and Stillwater telehealth.
// All artwork comes from the existing asset library.

function getFishTreatmentDefinitions() {
  return {
    antiParasite: { slot: "disease", family: "parasites", doses: 5 },
    infectionTreatment: { slot: "disease", family: "infection", doses: 5 },
    firstAid: { slot: "injury", family: "injured", doses: 3 }
  };
}

function getMedicineTreatmentInstructions(id) {
  const definition = getFishTreatmentDefinitions()[id];
  if (definition) return `Give one drop to the affected fish every 24 hours for ${definition.doses} doses. Allow a final 24-hour healing interval. One missed day preserves progress: give the next drop when you return. Two consecutive missed days worsen symptoms and restart the full course. Never give extra drops to catch up. Keep the water compatible, the tank clean, and the fish comfortable.`;
  if (id === "waterStress") return "Correct the fish's water type first. One drop boosts its recovery for six hours. Wait until that boost ends before using another drop. Correct water allows recovery without medication.";
  if (id === "betaBlocker") return "One drop into the tank calms its living fish for ten minutes. Address the cause of panic or aggression. Wait until the effect ends before using another drop.";
  return "";
}

function sanitizeFishTreatmentCourses(value) {
  const result = {};
  for (const slot of ["disease", "injury"]) {
    const raw = value?.[slot];
    const definition = getFishTreatmentDefinitions()[raw?.medicineId];
    if (!definition || definition.slot !== slot || !["active", "delayed", "observing", "restartRequired", "complete"].includes(raw.status)) continue;
    const course = { medicineId: raw.medicineId, status: raw.status, courseId: String(raw.courseId || "").slice(0, 100), startingStage: sanitizeDiseaseState(raw.startingStage) };
    for (const key of ["startedAt", "lastDoseAt", "lastEvaluatedAt", "relapseAppliedAt", "completedAt"]) course[key] = Number.isFinite(Number(raw[key])) ? Math.max(0, Number(raw[key])) : 0;
    course.dosesGiven = clamp(Math.floor(Number(raw.dosesGiven) || 0), 0, definition.doses);
    course.healingProgressMs = clamp(Number(raw.healingProgressMs) || 0, 0, definition.doses * DAY_MS);
    course.healingBudgetUnits = clamp(Math.floor(Number(raw.healingBudgetUnits) || 0), 0, FISH_HEALTH_MAX_HEARTS * 2);
    course.unitsRestored = clamp(Math.floor(Number(raw.unitsRestored) || 0), 0, course.healingBudgetUnits);
    if (!course.startedAt || !course.lastDoseAt || (course.status !== "restartRequired" && !course.dosesGiven)) continue;
    if (!course.lastEvaluatedAt) course.lastEvaluatedAt = course.lastDoseAt;
    result[slot] = course;
  }
  return result;
}

function sanitizeFishCareKnowledge(value) {
  const result = {};
  for (const slot of ["disease", "injury", "water"]) {
    const raw = value?.[slot];
    if (raw && typeof raw.episode === "string" && ["parasites", "infection", "injured", "osmotic-stress"].includes(raw.condition)) {
      result[slot] = { episode: raw.episode.slice(0, 180), condition: raw.condition };
    }
  }
  return result;
}

function getFishCareEpisode(fish, slot) {
  if (slot === "disease") return `${fish.diseaseInfectedAt || 0}:${normalizeFishDiseaseType(fish.diseaseType)}`;
  if (slot === "water") return String(fish.osmoticStressStartedAt || 0);
  return String(fish.injuryEpisodeAt || fish.acquiredAt || fish.id || "legacy");
}

function discoverFishCareCondition(fish, condition) {
  const slot = condition === "injured" ? "injury" : condition === "osmotic-stress" ? "water" : "disease";
  fish.careKnowledge ||= {};
  fish.careKnowledge[slot] = { condition, episode: getFishCareEpisode(fish, slot) };
}

function getFishCareConcerns(fish, now = Date.now()) {
  if (!fish || isFishDead(fish)) return [];
  const concerns = [];
  if (hasActiveFishDisease(fish)) concerns.push(normalizeFishDiseaseType(fish.diseaseType));
  if (fish.healthUnits < getFishMaxHealthUnits(fish)) concerns.push("injured");
  if (isFishWaterTypeMismatch(fish) || Number(fish.osmoticStressProgressMs) > 0) concerns.push("osmotic-stress");
  return concerns;
}

function getFishCareConditionText(fish, now = Date.now()) {
  const concerns = getFishCareConcerns(fish, now);
  if (!concerns.length) return "No care concern observed";
  return concerns.map((condition) => formatFishConditionLabel(condition)).join(" · ");
}

function shiftFishTreatmentTimes(fish, pauseMs) {
  if (!fish || !(pauseMs > 0)) return;
  for (const course of Object.values(fish.treatmentCourses || {})) {
    for (const key of ["startedAt", "lastDoseAt", "lastEvaluatedAt", "relapseAppliedAt", "completedAt"]) {
      if (course[key] > 0) course[key] += pauseMs;
    }
  }
}

function isFishCourseOngoing(fish, slot) {
  return ["active", "delayed", "observing"].includes(fish?.treatmentCourses?.[slot]?.status);
}

function reconcileFishTreatmentCourses(fish, now = Date.now()) {
  if (!fish || isFishDead(fish) || fish.storageFrozen || isPeacefulModeEnabled()) return false;
  let changed = false;
  for (const [slot, course] of Object.entries(fish.treatmentCourses || {})) {
    if (!["active", "delayed", "observing"].includes(course.status)) continue;
    const definition = getFishTreatmentDefinitions()[course.medicineId];
    if (!definition) continue;
    // Preserve remaining intervals on a backwards clock, without adding credit.
    if (now < course.lastEvaluatedAt) {
      const shift = now - course.lastEvaluatedAt;
      course.startedAt += shift;
      course.lastDoseAt += shift;
      course.lastEvaluatedAt = now;
      changed = true;
    }
    const elapsed = Math.max(0, now - course.lastEvaluatedAt);
    if (!elapsed) continue;
    const coverageEnd = course.lastDoseAt + DAY_MS;
    const goodConditions = !isFishWaterTypeMismatch(fish) && getDiseaseTankCleanliness(now) >= DISEASE_LOW_CLEANLINESS_THRESHOLD && getFishComfort(fish, now).value > DISEASE_LOW_COMFORT_THRESHOLD;
    const covered = course.dosesGiven === definition.doses ? elapsed : Math.max(0, Math.min(now, coverageEnd) - course.lastEvaluatedAt);
    if (goodConditions) course.healingProgressMs = Math.min(definition.doses * DAY_MS, course.healingProgressMs + covered);
    course.lastEvaluatedAt = now;
    changed = true;
    if (slot === "injury") {
      const totalUnits = Math.floor(course.healingBudgetUnits * course.healingProgressMs / (definition.doses * DAY_MS));
      const units = Math.max(0, totalUnits - course.unitsRestored);
      fish.healthUnits = Math.min(getFishMaxHealthUnits(fish), fish.healthUnits + units);
      course.unitsRestored += units;
    } else {
      fish.diseaseRecoveryProgressMs = Math.min(DISEASE_RECOVERY_REQUIRED_MS - 1, course.healingProgressMs / (definition.doses * DAY_MS) * DISEASE_RECOVERY_REQUIRED_MS);
      fish.diseaseLastProgressAt = now;
    }
    if (course.dosesGiven < definition.doses && now >= course.lastDoseAt + 3 * DAY_MS) {
      course.status = "restartRequired";
      course.relapseAppliedAt = course.lastDoseAt + 3 * DAY_MS;
      course.dosesGiven = 0;
      course.healingProgressMs = 0;
      if (slot === "injury") fish.healthUnits = Math.max(1, fish.healthUnits - 1);
      if (slot === "disease") {
        const stages = [DISEASE_STATE_CARRIER, DISEASE_STATE_INCUBATING, DISEASE_STATE_EARLY, DISEASE_STATE_VISIBLE, DISEASE_STATE_SEVERE];
        const index = Math.min(stages.length - 1, Math.max(3, stages.indexOf(course.startingStage) + 1));
        fish.diseaseState = stages[index];
        fish.diseaseType = definition.family;
        fish.diseaseProgressMs = getDebugDiseaseProgressForStage(fish.diseaseState);
        fish.diseaseRecoveryProgressMs = 0;
        fish.diseaseRequiresTreatment = true;
        fish.diseaseTreatedUntil = 0;
        fish.diseaseLastProgressAt = course.relapseAppliedAt;
        fish.diseaseLastDamageAt = course.relapseAppliedAt;
        fish.nextDiseaseCheckAt = now;
      }
      pushEvent(`${fish.name}'s symptoms worsened after two missed treatment days. Restart the full course.`, now, getCurrentTank(), { type: "illness", fishId: fish.id, recapEligible: false });
      continue;
    }
    course.status = course.dosesGiven === definition.doses ? "observing" : now >= course.lastDoseAt + 2 * DAY_MS ? "delayed" : "active";
    if (course.dosesGiven === definition.doses && course.healingProgressMs >= definition.doses * DAY_MS) {
      course.status = "complete";
      course.completedAt = now;
      if (slot === "disease") resetFishDiseaseFields(fish, DISEASE_STATE_IMMUNE, now);
      pushEvent(`${fish.name}'s treatment course is complete.`, now, getCurrentTank(), { type: "illness", fishId: fish.id, recapEligible: false });
    }
  }
  return changed;
}

function getFishMedicationEligibility(medicineId, fish, now = Date.now()) {
  if (!fish || isFishDead(fish) || fish.storageFrozen) return { ok: false, message: "Select a living fish in a tank." };
  if (isPeacefulModeEnabled()) return { ok: false, message: "Treatment is paused in Peaceful Mode. Resume normal care before giving the next drop." };
  if (isFishWaterTypeMismatch(fish)) return { ok: false, message: "Move this fish to compatible water before giving a treatment drop." };
  const definition = getFishTreatmentDefinitions()[medicineId];
  if (!definition) return { ok: false, message: "Select a course medication." };
  const course = fish.treatmentCourses?.[definition.slot];
  if (isFishCourseOngoing(fish, definition.slot)) {
    if (course.medicineId !== medicineId) return { ok: false, message: "Continue the medicine already used for this course." };
    if (course.dosesGiven >= definition.doses) return { ok: false, message: "All doses are given. Allow time to heal in good conditions." };
    if (now < course.lastDoseAt + DAY_MS) return { ok: false, message: "Today's dose is already given. Wait until the next dose is due." };
    return { ok: true, definition, course };
  }
  const matches = definition.slot === "injury" ? fish.healthUnits < getFishMaxHealthUnits(fish) : hasActiveFishDisease(fish) && normalizeFishDiseaseType(fish.diseaseType) === definition.family;
  if (!matches) return { ok: false, message: `${getMedicineMeta(medicineId)?.name || "This medicine"} does not treat ${getFishCareConditionText(fish, now)}. Select the fish to see its care instructions.` };
  // Preserve existing one-dose recoveries from saves made before courses existed.
  if (definition.slot === "disease" && !course && fish.diseaseState === DISEASE_STATE_RECOVERING) return { ok: false, message: "The previous treatment is still working. Allow time to recover." };
  return { ok: true, definition, course: null };
}

function applyFishCourseDose(medicine, fish, now = Date.now()) {
  reconcileFishTreatmentCourses(fish, now);
  const eligibility = getFishMedicationEligibility(medicine.id, fish, now);
  if (!eligibility.ok) return eligibility;
  const { definition } = eligibility;
  let course = eligibility.course;
  if (!course) {
    course = {
      medicineId: medicine.id, courseId: createId("course"), status: "active", startingStage: fish.diseaseState,
      startedAt: now, lastDoseAt: now, lastEvaluatedAt: now, dosesGiven: 0, healingProgressMs: 0,
      healingBudgetUnits: definition.slot === "injury" ? Math.max(0, getFishMaxHealthUnits(fish) - fish.healthUnits) : 0,
      unitsRestored: 0, relapseAppliedAt: 0, completedAt: 0
    };
    fish.treatmentCourses ||= {};
    fish.treatmentCourses[definition.slot] = course;
  }
  course.dosesGiven += 1;
  course.lastDoseAt = now;
  course.lastEvaluatedAt = now;
  course.status = course.dosesGiven === definition.doses ? "observing" : "active";
  discoverFishCareCondition(fish, definition.family);
  if (definition.slot === "disease") {
    fish.diseaseState = DISEASE_STATE_RECOVERING;
    fish.diseaseRequiresTreatment = true;
    fish.diseaseTreatedUntil = now + DAY_MS;
    fish.diseaseLastProgressAt = now;
  } else {
    fish.injuryRecoveryProgressMs = 0;
    fish.injuryRecoveryStartHealthUnits = 0;
  }
  syncFishPrimaryCondition(fish, now);
  return { ok: true, message: `${fish.name}: dose ${course.dosesGiven} of ${definition.doses} given. ${course.dosesGiven === definition.doses ? "Allow the final healing interval." : "Next drop due in 24 hours."}` };
}

function getFishTreatmentGuideMarkup(fish, now = Date.now()) {
  const concerns = getFishCareConcerns(fish, now);
  const careSummary = concerns.length ? `<article class="fish-care-guide"><strong>What needs care</strong>${concerns.map((condition) => {
    const medicineId = condition === "parasites" ? "antiParasite" : condition === "infection" ? "infectionTreatment" : condition === "injured" ? "firstAid" : "waterStress";
    const medicine = getMedicineMeta(medicineId);
    const waterType = typeof getFishStoreWaterType === "function" ? getFishStoreWaterType(getSpeciesForFish(fish)) : "compatible";
    const definition = getFishTreatmentDefinitions()[medicineId];
    const dosing = definition ? `Give one drop every 24 hours for ${definition.doses} doses, then allow a final 24-hour healing interval. Keep the tank clean and the fish comfortable.` : "";
    const advice = condition === "osmotic-stress"
      ? `Water-type stress can fade color and slow swimming. ${isFishWaterTypeMismatch(fish) ? `Move this fish to ${waterType === "compatible" ? "compatible water" : waterType} first.` : "The water type is now compatible; recovery is underway."} First Aid and Anti-Infection do not fix water-type stress. Osmotic Stress Treatment is an optional six-hour recovery boost after the water is corrected.`
      : condition === "injured"
        ? `This fish has missing hearts. ${medicine?.name || "First Aid"} treats that damage; disease or incompatible water may still need separate care. ${dosing}`
        : `${condition === "parasites" ? "White specks indicate parasites. First Aid and Anti-Infection do not clear parasites." : "Red or cloudy patches indicate infection. First Aid treats missing hearts, but does not clear the infection."} Use ${medicine?.name || medicineId}. ${dosing}`;
    return `<p><strong>${escapeHtml(formatFishConditionLabel(condition))}:</strong> ${escapeHtml(advice)}</p>`;
  }).join("")}<p>Buying a bottle stocks your medicine. Select it in Fish Care, then click the affected fish to give one drop. Improvement takes time; check the course below for the next dose.</p></article>` : "";
  const rows = Object.values(fish.treatmentCourses || {}).map((course) => {
    const definition = getFishTreatmentDefinitions()[course.medicineId];
    const medicine = getMedicineMeta(course.medicineId);
    if (!definition || !medicine) return "";
    const due = course.lastDoseAt + DAY_MS;
    const status = course.status === "restartRequired" ? "Restart required: symptoms worsened after two missed days." : course.status === "complete" ? "Course complete." : course.status === "observing" ? "All doses given. Healing continues in good conditions." : now < due ? `Next dose: ${new Date(due).toLocaleString()}` : course.status === "delayed" ? "One day missed. Give the next dose now; progress is preserved." : "Next dose is due.";
    const owned = Math.max(0, Number(state.medicineInventory?.[medicine.id]) || 0);
    const remaining = course.status === "complete" ? 0 : definition.doses - course.dosesGiven;
    return `<article class="fish-care-guide"><strong>${escapeHtml(medicine.name)} · ${course.dosesGiven}/${definition.doses} doses</strong><p>${escapeHtml(status)}</p><p>${escapeHtml(getMedicineTreatmentInstructions(medicine.id))}</p><small>${remaining} drops remaining · ${owned} owned · ${Math.max(0, remaining - owned)} more needed</small></article>`;
  }).join("");
  let support = "";
  if (isFishCourseOngoing(fish, "disease") || isFishCourseOngoing(fish, "injury")) {
    const blockers = [];
    if (isFishWaterTypeMismatch(fish)) blockers.push("move this fish to compatible water");
    if (getDiseaseTankCleanliness(now) < DISEASE_LOW_CLEANLINESS_THRESHOLD) blockers.push("clean the tank");
    if (getFishComfort(fish, now).value <= DISEASE_LOW_COMFORT_THRESHOLD) blockers.push("meet this fish's comfort needs");
    if (blockers.length) support += `<article class="fish-care-guide"><strong>Healing is paused</strong><p>${escapeHtml(`To resume recovery: ${blockers.join("; ")}. Extra drops will not fix these conditions.`)}</p></article>`;
  }
  if (fish.diseaseState === DISEASE_STATE_RECOVERING && !fish.treatmentCourses?.disease) {
    const remaining = Math.max(0, DISEASE_RECOVERY_REQUIRED_MS - (Number(fish.diseaseRecoveryProgressMs) || 0));
    support += `<article class="fish-care-guide"><strong>Previous treatment is still working</strong><p>No extra drops are required for this older treatment. About ${Math.ceil(remaining / 3600000)} hours of recovery remain in good conditions.</p></article>`;
  }
  if (concerns.includes("osmotic-stress") || Number(fish.waterStressBoostUntil) > now) {
    const remaining = Math.max(0, WATER_STRESS_RECOVERY_REQUIRED_MS - (Number(fish.osmoticRecoveryProgressMs) || 0));
    const boost = Number(fish.waterStressBoostUntil) > now ? ` Recovery boost ends ${new Date(fish.waterStressBoostUntil).toLocaleString()}.` : "";
    support += `<article class="fish-care-guide"><strong>Water recovery</strong><p>${isFishWaterTypeMismatch(fish) ? "Move this fish to compatible water to start recovery." : `About ${Math.ceil(remaining / 3600000)} hours of normal recovery remain; an active boost increases recovery speed.`}${escapeHtml(boost)}</p><p>${escapeHtml(getMedicineTreatmentInstructions("waterStress"))}</p></article>`;
  }
  if (Number(fish.calmedUntil) > now) support += `<article class="fish-care-guide"><strong>Calming effect active</strong><p>Ends ${escapeHtml(new Date(fish.calmedUntil).toLocaleString())}.</p><p>${escapeHtml(getMedicineTreatmentInstructions("betaBlocker"))}</p></article>`;
  return careSummary + rows + support;
}

function getPharmacySymptomCatalog() {
  return [
    { id: "specks", name: "White specks", text: "Small white spots on the body or fins.", image: "assets/web/bodega/spots_symptoms.png", medicine: "antiParasite", restricted: !isTrypophobiaEnabled() },
    { id: "lesions", name: "Red / cloudy lesions", text: "Red or cloudy patches; check both sides of the fish.", image: "assets/web/bodega/lesions_symptoms.png", medicine: "infectionTreatment", restricted: !isGoreEnabled() },
    { id: "wounds", name: "Cuts / wounds", text: "Wound marks or fewer hearts than the fish's maximum.", image: "assets/web/bodega/cuts_symptoms.png", medicine: "firstAid", restricted: !isGoreEnabled() },
    { id: "color", name: "Faded color", text: "Color looks duller than usual. This clue has several causes.", image: "assets/web/bodega/faded-color_symptoms.png", medicine: "waterStress" },
    { id: "behavior", name: "Unusual behavior", text: "Green bubbles, hiding, slow swimming, or refusing food.", image: "assets/web/bodega/strange-behavior_symptoms.png", medicine: "waterStress" },
    { id: "panic", name: "Panic / aggression", text: "Fish are fleeing, chasing, or acting panicked.", image: "assets/web/bodega/panic_symptoms.png", medicine: "betaBlocker" }
  ];
}

function getPharmacyQuizRecommendations(symptomIds) {
  const selected = new Set(Array.isArray(symptomIds) ? symptomIds : []);
  const ambiguous = selected.has("specks") && selected.has("lesions");
  const medicineIds = getPharmacySymptomCatalog().filter((entry) => selected.has(entry.id) && entry.medicine).map((entry) => entry.medicine);
  let message = medicineIds.length
    ? "Possible treatments matching your selected symptoms. Compare the symptoms and read each treatment's instructions before giving a drop."
    : "Select a matching symptom to see possible treatments.";
  if (ambiguous) message += " White specks and red/cloudy lesions point to different treatments. Check which mark is on each fish.";
  if (medicineIds.includes("waterStress")) message += " For Osmotic Stress Treatment, correct incompatible water first; faded color and unusual behavior can have several causes.";
  return { medicineIds: [...new Set(medicineIds)], message };
}

function getBubbleBodegaMedicineCareProfile(id) {
  const medicine = getMedicineMeta(id);
  if (!medicine) return null;
  const care = {
    firstAid: {
      about: "First Aid drops support healing after a fish is injured. Use them for cuts, wounds, and lost hearts while keeping the aquarium clean and comfortable.",
      treats: "Injuries: cuts, wounds, and missing hearts. Compare the fish's current hearts with its maximum; wound marks may only be visible on one side.",
      symptoms: ["wounds"]
    },
    antiParasite: {
      about: "Anti-Parasite Treatment targets the parasitic illness that causes small white specks on a fish's body and fins.",
      treats: "Parasitic illness with white specks. Look for distinct small spots on the body or fins; red or cloudy lesions require a different treatment.",
      symptoms: ["specks"]
    },
    infectionTreatment: {
      about: "Infection Treatment helps fish recover from the illness that causes red or cloudy patches on the body.",
      treats: "Infection with red or cloudy lesions. Check both sides of the fish for patches; white specks require Anti-Parasite Treatment instead.",
      symptoms: ["lesions"]
    },
    waterStress: {
      about: "Osmotic Stress Treatment provides a temporary recovery boost after a fish has been moved into compatible water. Fish can recover in the correct water without medication.",
      treats: "Recovery from osmotic stress caused by incompatible water. Faded color and unusual behavior can be clues, but have several possible causes. Check the fish's required water type before treating it; these drops cannot make incompatible water safe.",
      symptoms: ["color", "behavior"]
    },
    betaBlocker: {
      about: "Calming Serum temporarily calms the living fish in an aquarium, giving them a break from panic or aggression.",
      treats: "Temporary relief from panic and aggressive behavior, such as fleeing or chasing other fish. Address the cause of the behavior as well; this serum does not heal injuries or treat disease.",
      symptoms: ["panic"]
    }
  }[id];
  if (!care) return null;
  return {
    about: care.about,
    treats: care.treats,
    symptoms: getPharmacySymptomCatalog().filter((entry) => care.symptoms.includes(entry.id)),
    instructions: getMedicineTreatmentInstructions(id),
    bottleDrops: medicine.bottleDrops,
    ownedDrops: Math.max(0, Number(state.medicineInventory?.[id]) || 0)
  };
}

function renderPharmacySymptomChecker() {
  const quiz = runtime.pharmacyQuiz ||= { symptoms: [], submitted: false };
  const result = getPharmacyQuizRecommendations(quiz.symptoms);
  return `<header><div><h2>Symptom Checker</h2><p>Select the symptoms you can see. Select your fish in the aquarium to see its condition and care instructions before buying. Faded color can have several causes.</p></div></header>
    <div class="pharmacy-symptoms">${getPharmacySymptomCatalog().map((entry) => `<label class="pharmacy-symptom ${entry.image && !entry.restricted ? "" : "is-text-only"} ${quiz.symptoms.includes(entry.id) ? "is-selected" : ""}" title="${escapeHtml(entry.text)}"><input type="checkbox" aria-label="${escapeHtml(`${entry.name}: ${entry.text}`)}" data-care-symptom="${entry.id}" ${quiz.symptoms.includes(entry.id) ? "checked" : ""} />${entry.image && !entry.restricted ? `<img ${assetImageAttributes(entry.image)} alt="${escapeHtml(entry.name)} example from the game" />` : `<span class="pharmacy-symptom-text-art" aria-hidden="true">${entry.id === "specks" ? "Look for spots" : entry.id === "wounds" ? "Compare hearts" : entry.id === "lesions" ? "Check both sides" : entry.id === "color" ? "Duller color than usual" : entry.id === "behavior" ? "Hiding, slow swimming, refusing food" : "Fleeing or chasing fish"}</span>`}<strong>${escapeHtml(entry.name)}</strong></label>`).join("")}</div>
    <div class="pharmacy-quiz-actions"><button type="button" class="small-button alt" data-care-clear>Clear symptoms</button><button type="button" class="small-button" data-care-find ${!quiz.symptoms.length ? "disabled" : ""}>Find treatments</button></div>
    ${quiz.submitted ? `<div class="pharmacy-results" role="status"><p>${escapeHtml(result.message)}</p><div class="pharmacy-result-cards">${result.medicineIds.map((id) => {
      const medicine = getMedicineMeta(id);
      // Match catalog tiles without registering recommendations as shop products.
      return medicine ? `<article class="pharmacy-treatment-card">
        ${renderFoodAndMedImage("medicine", id, escapeHtml(medicine.name), "pharmacy-treatment-thumb")}
        <div class="tankazon-tile-info"><h3 class="tankazon-tile-title">${escapeHtml(medicine.name)}</h3><div class="tankazon-tile-cost" aria-label="${medicine.cost} coins"><img class="tankazon-tile-cost-icon" ${assetImageAttributes("assets/misc/coin_unicode.webp")} alt="" aria-hidden="true" /><span class="tankazon-tile-cost-value">${medicine.cost}</span></div></div>
        <button type="button" class="small-button alt" data-care-view-medicine="${id}">View medicine</button>
      </article>` : "";
    }).join("")}</div></div>` : ""}
    <footer><div><strong>Unsure?</strong></div><button type="button" class="small-button pharmacy-vet-button" data-care-stillwater>Get Vet Consultation</button></footer>`;
}

function sanitizeStillwaterConsultations(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((raw) => raw && typeof raw.id === "string" && Array.isArray(raw.fishReports)).map((raw) => ({
    id: raw.id.slice(0, 100), tankId: String(raw.tankId || "").slice(0, 100), tankName: String(raw.tankName || "Aquarium").slice(0, 100), time: Math.max(0, Number(raw.time) || 0),
    total: Math.max(0, Math.floor(Number(raw.total) || 0)),
    fishReports: raw.fishReports.filter((report) => report && typeof report === "object").slice(0, 200).map((report) => ({
      fishId: String(report.fishId || "").slice(0, 100), name: String(report.name || "Fish").slice(0, 100), species: String(report.species || "Fish").slice(0, 120),
      conditions: (Array.isArray(report.conditions) ? report.conditions : []).filter((id) => ["parasites", "infection", "injured", "osmotic-stress"].includes(id)),
      waterMismatch: report.waterMismatch === true,
      behaviorConcern: report.behaviorConcern === true,
      prescriptions: (Array.isArray(report.prescriptions) ? report.prescriptions : []).filter((entry) => entry && ["antiParasite", "infectionTreatment", "firstAid", "waterStress", "betaBlocker"].includes(entry.id)).map((entry) => ({ id: entry.id, drops: clamp(Math.floor(Number(entry.drops) || 0), 0, 5) })),
      carePlans: (Array.isArray(report.carePlans) ? report.carePlans : (Array.isArray(report.prescriptions) ? report.prescriptions : [])).filter((entry) => entry && ["antiParasite", "infectionTreatment", "firstAid", "waterStress", "betaBlocker"].includes(entry.id)).map((entry) => ({ id: entry.id, dosesGiven: clamp(Math.floor(Number(entry.dosesGiven) || 0), 0, 5), legacyRecovery: entry.legacyRecovery === true }))
    }))
  }));
}

function buildStillwaterFishReport(fish, now = Date.now()) {
  const conditions = getFishCareConcerns(fish, now);
  const prescriptions = [];
  const carePlans = [];
  for (const condition of conditions) {
    const id = condition === "parasites" ? "antiParasite" : condition === "infection" ? "infectionTreatment" : condition === "injured" ? "firstAid" : "waterStress";
    const definition = getFishTreatmentDefinitions()[id];
    const course = definition && fish.treatmentCourses?.[definition.slot];
    const legacyRecovering = definition?.slot === "disease" && !course && fish.diseaseState === DISEASE_STATE_RECOVERING;
    const drops = legacyRecovering ? 0 : definition ? Math.max(0, definition.doses - (isFishCourseOngoing(fish, definition.slot) ? course.dosesGiven : 0)) : 1;
    carePlans.push({ id, dosesGiven: definition && isFishCourseOngoing(fish, definition.slot) ? course.dosesGiven : 0, legacyRecovery: legacyRecovering });
    if (drops) prescriptions.push({ id, drops });
  }
  const behaviorConcern = (Number(fish.panicUntil) || 0) > now || fish.bettaRivalRole === "aggressor";
  if (behaviorConcern) {
    if (!(Number(fish.calmedUntil) > now)) prescriptions.push({ id: "betaBlocker", drops: 1 });
    carePlans.push({ id: "betaBlocker", dosesGiven: 0, legacyRecovery: false });
  }
  return { fishId: fish.id, name: fish.name || "Fish", species: getSpeciesForFish(fish)?.name || "Fish", conditions, prescriptions, carePlans, behaviorConcern, waterMismatch: isFishWaterTypeMismatch(fish) };
}

function purchaseStillwaterConsultation(tankId, fishIds, submissionId, now = Date.now()) {
  if (!submissionId) return { ok: false, message: "Open a new consultation first." };
  const existing = state.vetConsultations?.find((report) => report.id === submissionId);
  if (existing) return { ok: true, consultation: existing, alreadyCompleted: true };
  if (isPeacefulModeEnabled()) return { ok: false, message: "Care is paused in Peaceful Mode. Resume normal care before purchasing an assessment." };
  const tank = getCurrentTank();
  const ids = [...new Set(Array.isArray(fishIds) ? fishIds : [])];
  if (!tank || tank.id !== tankId || !ids.length) return { ok: false, message: "The active tank changed or no fish was selected. Review your selection." };
  const fish = ids.map((id) => tank.fish.find((entry) => entry.id === id));
  if (fish.some((entry) => !entry || isFishDead(entry) || entry.storageFrozen)) return { ok: false, message: "A selected fish is no longer available in this tank. Review your selection." };
  const total = ids.length * 20;
  if (state.coins < total) return { ok: false, message: `You need ${total} coins for this consultation.` };
  const report = { id: submissionId, tankId, tankName: getTankLabel(tank), time: now, total, fishReports: fish.map((entry) => buildStillwaterFishReport(entry, now)) };
  const grants = {};
  for (const entry of report.fishReports) for (const prescription of entry.prescriptions) {
    if (!getMedicineMeta(prescription.id)) return { ok: false, message: "Medication information is unavailable. Please try again." };
    grants[prescription.id] = (grants[prescription.id] || 0) + prescription.drops;
  }
  const email = { id: `stillwater-${submissionId}`, templateId: "stillwater_consultation", sender: "consultation@stillwatervet.swim", subject: `Your Stillwater consultation — ${ids.length} fish`, preview: "Your assessment, prescribed medication and treatment instructions are ready.", destination: "stillwater", icon: "assets/web/proteus/sub/stillwater-vet_logo.webp", time: now, data: { consultationId: submissionId } };
  const previous = { inventory: { ...state.medicineInventory }, consultations: state.vetConsultations, emails: state.webSurfSentEmails, walletTransactions: state.walletTransactions?.slice(), mailStates: { ...state.webSurfMailStates }, knowledge: fish.map((entry) => entry.careKnowledge && { ...entry.careKnowledge }) };
  try {
    const transaction = performCoinTransaction({ amount: total, now, place: "Stillwater Veterinary Telehealth", receiptLabel: `Consultation: ${ids.length} fish at 20 coins each`, render: false,
      apply: () => {
        state.medicineInventory = { ...state.medicineInventory };
        for (const [id, count] of Object.entries(grants)) state.medicineInventory[id] = Math.max(0, Number(state.medicineInventory[id]) || 0) + count;
        state.vetConsultations = [...(state.vetConsultations || []), report];
        state.webSurfSentEmails = [email, ...(state.webSurfSentEmails || [])];
        report.fishReports.forEach((entry, index) => entry.conditions.forEach((condition) => discoverFishCareCondition(fish[index], condition)));
        ensureWebSurfMailState(email);
        return true;
      }, toast: "Stillwater sent one consultation email. Prescribed medication is in Fish Care." });
    if (!transaction.ok) return { ok: false, message: "The consultation could not be purchased. Review your balance and selection." };
  } catch (error) {
    state.medicineInventory = previous.inventory;
    state.vetConsultations = previous.consultations;
    state.webSurfSentEmails = previous.emails;
    state.walletTransactions = previous.walletTransactions;
    state.webSurfMailStates = previous.mailStates;
    fish.forEach((entry, index) => { entry.careKnowledge = previous.knowledge[index]; });
    throw error;
  }
  // Mail status is persisted with the purchase; re-opening uses the saved report.
  syncWebSurfUnreadBadge();
  return { ok: true, consultation: report };
}

function renderStillwaterEmailBody(message) {
  const report = state.vetConsultations?.find((entry) => entry.id === message.data?.consultationId);
  if (!report) return "<p>This consultation report is unavailable.</p>";
  return `<h2>Stillwater Veterinary Telehealth</h2><h3>Services rendered</h3><p>Assessment, diagnosis, prescribed medication and treatment instructions.</p><p>${escapeHtml(new Date(report.time).toLocaleString())} · ${escapeHtml(report.tankName)}</p><p>${report.fishReports.length} fish × 20 coins · <strong>${report.total} coins paid</strong></p><p>Reference: ${escapeHtml(report.id)}</p>${report.fishReports.map((entry) => `<section class="stillwater-fish-report"><h3>${escapeHtml(entry.name)} · ${escapeHtml(entry.species)}</h3><p>Consultation and care plan: 20 coins.</p><h4>Diagnosis</h4><p>${entry.conditions.length ? entry.conditions.map((condition) => escapeHtml(formatFishConditionLabel(condition))).join(" · ") : entry.behaviorConcern ? "Behavioral care is indicated." : "No active medical condition identified."}</p>${entry.behaviorConcern ? "<p>Panic or aggressive behavior observed. Address its cause as well as using temporary calming support.</p>" : ""}${entry.waterMismatch ? "<p><strong>Correct the water type before treatment.</strong> Move this fish to compatible water. Medicine cannot make incompatible water safe.</p>" : ""}<h4>Medication provided</h4>${entry.prescriptions.length ? entry.prescriptions.map((prescription) => `<p>${escapeHtml(getMedicineMeta(prescription.id)?.name || prescription.id)}: ${prescription.drops} drop${prescription.drops === 1 ? "" : "s"} delivered to Fish Care.</p>`).join("") : "<p>No additional medication indicated. An existing completed-dose course may still need healing time.</p>"}<h4>Treatment instructions</h4>${(entry.carePlans || entry.prescriptions).map((plan) => `<p><strong>${escapeHtml(getMedicineMeta(plan.id)?.name || plan.id)}:</strong> ${plan.legacyRecovery ? "The previous treatment is still working. No additional drops are required; allow recovery in good conditions." : escapeHtml(getMedicineTreatmentInstructions(plan.id))}${plan.dosesGiven ? ` ${plan.dosesGiven} doses were already given at the time of this assessment; continue that course.` : ""}${plan.id === "waterStress" ? " This is optional recovery support after correcting water." : ""}</p>`).join("") || "<p>Maintain compatible water, a clean tank, and a comfortable habitat. Continue any existing course instructions.</p>"}<button type="button" class="small-button" data-care-show-fish="${escapeHtml(entry.fishId)}">View fish and treatment guide</button></section>`).join("")}<p>This report records the assessment above. New symptoms may need another assessment. Medication delivery does not start treatment: give the first drop when ready.</p>`;
}

function closeStillwaterPage() {
  runtime.stillwaterOpen = false;
  runtime.stillwaterVisit = null;
  dom.storeOverlay?.classList.remove("is-stillwater-open");
  const page = document.getElementById("stillwaterPage");
  if (page) page.hidden = true;
}

function openStillwaterPage() {
  if (!openStoreOverlay(runtime.storeTab || "pharmacy", { render: false, rememberWebSurfPage: false, allowDuringTutorial: true })) return false;
  window.closeProteusBiodynePage?.(false);
  window.closeWebSurfSubsidiaryPage?.(false);
  runtime.webHomeOpen = false;
  runtime.webSurfThemesOpen = false;
  runtime.settingsOverlayOpen = false;
  runtime.stillwaterOpen = true;
  runtime.webSurfLastPage = "stillwater";
  ensureWebSurfBrowserTab("stillwater");
  updateWebSurfRoute("stillwatervet.swim");
  renderUi(Date.now());
  return true;
}

function renderStillwaterPage() {
  const visit = runtime.stillwaterVisit;
  const coinIcon = `<img class="stillwater-summary-coin" ${assetImageAttributes("assets/misc/coin_unicode.webp")} alt="coins" />`;
  const tank = getCurrentTank();
  const fish = (tank?.fish || []).filter((entry) => !isFishDead(entry) && !entry.storageFrozen);
  const logo = "assets/web/proteus/sub/stillwater-vet_logo.webp";
  const services = [
    ["Assessment", "We assess the health and symptoms of each selected fish.", "assets/icons/page.png"],
    ["Medication", "If needed, prescribed drops and the required quantity are delivered to Fish Care.", "assets/icons/eyedropper.png"],
    ["Email delivery", "A consultation covering each selected fish is sent to your WebSurf inbox with a diagnosis and step-by-step treatment instructions.", "assets/icons/letter.png"]
  ];
  return `<div class="stillwater-page-content">
    <header class="stillwater-brand"><img ${assetImageAttributes(logo)} alt="Stillwater Veterinary Telehealth" /><span>stillwatervet.swim</span></header>
    <div class="stillwater-intro"><h1>Professional care for your aquarium.</h1><p>Stillwater Veterinary Telehealth reviews your fish's symptoms and sends a detailed consultation to your WebSurf inbox, including a diagnosis, recommended medications, the required quantity of each medication, and treatment instructions.</p></div>
    <div class="stillwater-services">${services.map(([name, copy, icon]) => `<section><span class="stillwater-service-icon" aria-hidden="true"><img ${assetImageAttributes(icon)} alt="" /></span><div><h2>${name}</h2><p>${copy}</p></div></section>`).join("")}</div>
    <div class="stillwater-consultation"><div class="stillwater-pricing"><img ${assetImageAttributes("assets/icons/coin.png")} alt="" aria-hidden="true" /><div><strong>20 coins per fish</strong><p>Select one or more fish from your active tank.</p></div></div><button type="button" class="small-button stillwater-consult-button" data-care-consult>Get vet consultation</button></div>
    ${runtime.stillwaterLastEmail ? `<div class="stillwater-confirmation"><p role="status">Your consultation report is in your inbox. Prescribed medication has been delivered.</p><button type="button" class="small-button alt" data-care-open-email="${escapeHtml(runtime.stillwaterLastEmail)}">Open consultation email</button></div>` : ""}
    </div>
    ${visit ? `<div class="stillwater-dialog-backdrop"><section class="stillwater-dialog" role="dialog" aria-modal="true" aria-labelledby="stillwaterDialogTitle" aria-describedby="stillwaterDialogDescription">
      <button type="button" class="stillwater-dialog-close" data-care-cancel-consult aria-label="Close consultation"><img ${assetImageAttributes("assets/icons/close.png")} alt="" aria-hidden="true" /></button>
      <header class="stillwater-dialog-header"><img ${assetImageAttributes(logo)} alt="" /><div><h2 id="stillwaterDialogTitle" tabindex="-1">Vet consultation</h2><p>Active tank: ${escapeHtml(tank ? getTankLabel(tank) : "No active tank")}</p></div></header>
      <p id="stillwaterDialogDescription">Select one or more fish that need care. Assessment, diagnosis, medication when indicated, and instructions are included.</p>
      <div class="stillwater-fish-picker">${fish.map((entry) => {
        const species = getSpeciesForFish(entry);
        const thumbnail = renderFishTrayThumbnail(entry, species, entry.name || "Fish").replaceAll("edit-decor-tile-thumb", "stillwater-fish-art");
        return `<label><input type="checkbox" data-care-vet-fish="${escapeHtml(entry.id)}" ${visit.fishIds.includes(entry.id) ? "checked" : ""} /><span class="stillwater-fish-thumb">${thumbnail}</span><span><strong>${escapeHtml(entry.name || "Fish")}</strong><small>${escapeHtml(species?.name || "Fish")}</small></span></label>`;
      }).join("") || "<p>No living fish are available in this tank.</p>"}</div>
      <div class="stillwater-consult-total" aria-live="polite" aria-atomic="true">
        <p class="stillwater-consult-calculation">${visit.fishIds.length} fish × <span>20 ${coinIcon}</span></p>
        <div class="stillwater-consult-summary-row is-total"><span>Total:</span><strong>${visit.fishIds.length * 20} ${coinIcon}</strong></div>
        <div class="stillwater-consult-summary-row"><span>Wallet:</span><strong>${state.coins} ${coinIcon}</strong></div>
      </div>
      <p class="stillwater-notice" role="status" ${visit.notice ? "" : "hidden"}>${escapeHtml(visit.notice || "")}</p>
      <div class="stillwater-dialog-actions"><button type="button" class="small-button alt" data-care-cancel-consult>Cancel</button><button type="button" class="small-button" data-care-confirm-consult ${!visit.fishIds.length || state.coins < visit.fishIds.length * 20 ? "disabled" : ""}>Confirm consultation — ${visit.fishIds.length * 20} coins</button></div>
    </section></div>` : ""}`;
}

function renderFishCareWebSurfaces() {
  if (!dom.storeOverlay) return;
  let page = document.getElementById("stillwaterPage");
  if (!page) {
    page = document.createElement("section");
    page.id = "stillwaterPage";
    page.className = "stillwater-page";
    page.setAttribute("aria-label", "Stillwater Veterinary Telehealth");
    dom.storeOverlay.querySelector(".tankazon-panel")?.append(page);
  }
  const open = runtime.storeOverlayOpen && runtime.stillwaterOpen === true && !runtime.settingsOverlayOpen && !runtime.webSurfRouteError;
  page.hidden = !open;
  dom.storeOverlay.classList.toggle("is-stillwater-open", Boolean(open));
  if (open) {
    setMarkupIfChanged("stillwater-page", page, renderStillwaterPage());
    for (const image of page.querySelectorAll(".stillwater-fish-thumb img")) {
      const path = image.getAttribute("data-sprite-src") || image.getAttribute("src");
      if (path) void setAssetImageSource(image, path);
      image.loading = "eager";
    }
  }
  let checker = document.getElementById("pharmacySymptomChecker");
  const body = document.getElementById("tankazonCatalogArea");
  if (!checker && body) {
    checker = document.createElement("section");
    checker.id = "pharmacySymptomChecker";
    checker.className = "pharmacy-symptom-checker";
    checker.setAttribute("aria-label", "Pharmacy symptom questionnaire");
    body.prepend(checker);
  }
  if (checker) {
    const category = dom.storeOverlay.dataset.tankazonCategory;
    checker.hidden = !runtime.storeOverlayOpen || open || category !== "pharmacy" || runtime.webHomeOpen || runtime.webSurfThemesOpen || runtime.bubbleBodegaHomeOpen || runtime.bubbleBankOpen || runtime.davyJonesLockerOpen || runtime.settingsOverlayOpen || runtime.proteusDesignerOpen || runtime.webSurfRouteError || dom.storeOverlay.classList.contains("proteus-biodyne-open") || dom.storeOverlay.classList.contains("websurf-subsidiary-open");
    if (!checker.hidden) setMarkupIfChanged("pharmacy-symptom-checker", checker, renderPharmacySymptomChecker());
  }
  if (!dom.storeOverlay.dataset.careHandlersReady) {
    dom.storeOverlay.dataset.careHandlersReady = "true";
    dom.storeOverlay.addEventListener("click", handleFishCareWebClick);
    dom.storeOverlay.addEventListener("change", handleFishCareWebChange);
    dom.storeOverlay.addEventListener("keydown", handleFishCareWebKeyDown);
  }
}

function handleFishCareWebChange(event) {
  const target = event.target;
  const quiz = runtime.pharmacyQuiz ||= { symptoms: [], submitted: false };
  if (target.matches("[data-care-symptom]")) {
    quiz.symptoms = quiz.symptoms.filter((id) => id !== target.dataset.careSymptom);
    if (target.checked) quiz.symptoms.push(target.dataset.careSymptom);
    quiz.submitted = false;
  } else if (target.matches("[data-care-vet-fish]") && runtime.stillwaterVisit) {
    const visit = runtime.stillwaterVisit;
    visit.fishIds = visit.fishIds.filter((id) => id !== target.dataset.careVetFish);
    if (target.checked) visit.fishIds.push(target.dataset.careVetFish);
  } else return;
  const selector = target.matches("[data-care-symptom]") ? `[data-care-symptom="${target.dataset.careSymptom}"]` : `[data-care-vet-fish="${target.dataset.careVetFish}"]`;
  renderFishCareWebSurfaces();
  dom.storeOverlay.querySelector(selector)?.focus({ preventScroll: true });
}

function handleFishCareWebClick(event) {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.matches("[data-care-stillwater]")) return navigateWebSurf("stillwatervet.swim");
  if (button.matches("[data-care-clear]")) runtime.pharmacyQuiz = { symptoms: [], submitted: false };
  else if (button.matches("[data-care-find]")) runtime.pharmacyQuiz.submitted = true;
  else if (button.matches("[data-care-consult]")) {
    runtime.stillwaterVisit = { tankId: getCurrentTank()?.id, fishIds: [], submissionId: createId("vet"), notice: "" };
  } else if (button.matches("[data-care-cancel-consult]")) runtime.stillwaterVisit = null;
  else if (button.matches("[data-care-confirm-consult]")) {
    const visit = runtime.stillwaterVisit;
    if (!visit || visit.busy) return;
    visit.busy = true;
    try {
      const result = purchaseStillwaterConsultation(visit.tankId, visit.fishIds, visit.submissionId);
      if (result.ok) {
        runtime.stillwaterLastEmail = `stillwater-${result.consultation.id}`;
        runtime.stillwaterVisit = null;
      } else visit.notice = result.message;
    } catch (error) { visit.notice = "The consultation could not be displayed. Check your inbox or retry this consultation; a completed purchase is charged only once."; }
    finally { visit.busy = false; }
  } else if (button.matches("[data-care-open-email]")) {
    const id = button.dataset.careOpenEmail;
    navigateWebSurf("websurf.swim");
    runtime.webSurfSelectedMailId = id;
    markWebSurfMailRead(id);
    renderUi(Date.now());
    return;
  } else if (button.matches("[data-care-show-fish]")) {
    const id = button.dataset.careShowFish;
    const tank = getTankContainingFish(id);
    if (!tank) return showToast("This fish is no longer in an aquarium. The email remains available as history.");
    closeStoreOverlay({ force: true });
    if (tank.id !== getCurrentTank()?.id) { showToast(`Switch to ${getTankLabel(tank)} to view this fish. Its consultation report stays in your inbox.`); return; }
    openFishInspector(id, { settingsOpen: false });
    return;
  } else if (button.matches("[data-care-view-medicine]")) {
    const id = button.dataset.careViewMedicine;
    const card = window.getBubbleBodegaCatalogCards?.("pharmacy")?.find((entry) => entry.querySelector(`[data-buy-medicine="${id}"]`));
    card?.querySelector(".shop-card-image, img")?.click();
    if (!card) showToast("Browse the Pharmacy products below; clear product filters if needed.");
    return;
  } else return;
  renderFishCareWebSurfaces();
  if (button.matches("[data-care-consult]")) document.getElementById("stillwaterDialogTitle")?.focus();
  if (button.matches("[data-care-cancel-consult]")) dom.storeOverlay.querySelector("[data-care-consult]")?.focus();
}

function handleFishCareWebKeyDown(event) {
  if (!runtime.stillwaterVisit || !runtime.stillwaterOpen) return;
  const dialog = document.querySelector(".stillwater-dialog");
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    runtime.stillwaterVisit = null;
    renderFishCareWebSurfaces();
    dom.storeOverlay.querySelector("[data-care-consult]")?.focus();
  } else if (event.key === "Tab" && dialog) {
    const controls = [...dialog.querySelectorAll("button:not([disabled]), input:not([disabled])")];
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement.id === "stillwaterDialogTitle")) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
}
