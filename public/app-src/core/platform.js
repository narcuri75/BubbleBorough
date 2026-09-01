// Source fragment: core/platform.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function resolveAppUrl(path) {
  if (typeof path !== "string") {
    return "";
  }

  const trimmed = path.trim();
  if (!trimmed) {
    return "";
  }

  if (/^(?:https?:|data:|blob:)/i.test(trimmed)) {
    return trimmed;
  }

  return new URL(trimmed.replace(/^\/+/, ""), document.baseURI).toString();
}

function getDesktopBridge() {
  if (typeof window === "undefined") {
    return null;
  }

  const bridge = window.bubbleBoroughDesktop;
  return bridge && typeof bridge === "object" && bridge.isDesktop === true ? bridge : null;
}

function isDesktopAppRuntime() {
  return Boolean(getDesktopBridge());
}

async function prepareDesktopSaveStorage() {
  const bridge = getDesktopBridge();
  if (!bridge || typeof bridge.getSaveCandidates !== "function") {
    return;
  }

  try {
    const candidates = await bridge.getSaveCandidates();
    runtime.desktopSaveCandidates = Array.isArray(candidates) ? candidates : [];
  } catch (error) {
    console.error("Could not read desktop save candidates.", error);
    runtime.desktopSaveCandidates = [];
    runtime.desktopSaveLoadError = error?.message || "Could not read desktop save data.";
  }
}

function getDesktopSaveCandidateState() {
  if (!isDesktopAppRuntime()) {
    return null;
  }

  if (runtime.desktopSaveCandidateChecked) {
    return runtime.desktopSaveCandidateState || null;
  }

  runtime.desktopSaveCandidateChecked = true;
  runtime.desktopSaveCandidateState = null;
  for (const candidate of runtime.desktopSaveCandidates || []) {
    try {
      const candidateState = extractImportedSaveState(candidate?.payload);
      runtime.desktopSaveCandidateState = candidateState;
      runtime.desktopSaveLoadSource = candidate?.source || "";
      return candidateState;
    } catch (error) {
      console.warn("Ignoring invalid desktop save candidate.", error);
    }
  }

  return null;
}

function writeDesktopSaveState(targetState) {
  const bridge = getDesktopBridge();
  if (!bridge || typeof bridge.writeSaveState !== "function") {
    return false;
  }

  const result = bridge.writeSaveState(JSON.stringify(targetState));
  if (!result || result.ok !== true) {
    throw new Error(result?.error || "Could not write desktop save data.");
  }

  return true;
}

async function writeDesktopPortableBackup(options = {}) {
  const bridge = getDesktopBridge();
  if (!bridge || typeof bridge.writePortableBackup !== "function" || !state) {
    return false;
  }

  const force = options.force === true;
  const now = Date.now();
  if (!force && Number(runtime.nextDesktopPortableBackupAt) > now) {
    return false;
  }
  if (!force && runtime.desktopPortableBackupInFlight) {
    return false;
  }

  runtime.desktopPortableBackupInFlight = true;
  try {
    const exportData = await createSaveExportData(now);
    const result = await bridge.writePortableBackup({
      contents: exportData.contents,
      filename: exportData.filename,
      force
    });
    if (!result || (result.ok !== true && result.skipped !== true)) {
      throw new Error(result?.error || "Could not write desktop backup.");
    }
    runtime.nextDesktopPortableBackupAt = Date.now() + DESKTOP_PORTABLE_BACKUP_INTERVAL_MS;
    return true;
  } catch (error) {
    console.error("Could not write desktop portable backup.", error);
    if (options.showToast !== false) {
      showToast("Could not write desktop backup. Check that bubbleborough_data is writable.");
    }
    return false;
  } finally {
    runtime.desktopPortableBackupInFlight = false;
  }
}

function scheduleDesktopPortableBackup() {
  if (!isDesktopAppRuntime() || !state) {
    return;
  }

  const now = Date.now();
  if (
    Number(runtime.nextDesktopPortableBackupAt) > now
    || runtime.desktopPortableBackupInFlight
    || runtime.desktopPortableBackupQueued
  ) {
    return;
  }

  runtime.desktopPortableBackupQueued = true;
  window.setTimeout(() => {
    runtime.desktopPortableBackupQueued = false;
    void writeDesktopPortableBackup({ showToast: false });
  }, 0);
}

function installDesktopCloseBackupHandler() {
  const bridge = getDesktopBridge();
  if (!bridge || typeof bridge.onBeforeClose !== "function" || runtime.desktopCloseBackupHandlerInstalled) {
    return;
  }

  runtime.desktopCloseBackupHandlerInstalled = true;
  bridge.onBeforeClose(async () => {
    if (!state) {
      return;
    }

    saveState();
    await writeDesktopPortableBackup({ force: true, showToast: false });
  });
}

function sanitizeAppConfig(rawConfig) {
  const source = rawConfig && typeof rawConfig === "object" ? rawConfig : {};
  return Object.freeze({
    wallpaperEngine: source.wallpaperEngine === true
  });
}

async function loadAppConfig() {
  try {
    const response = await fetch(resolveAppUrl(APP_CONFIG_PATH), { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Could not load app config: ${response.status}`);
    }
    appConfig = sanitizeAppConfig(await response.json());
  } catch (error) {
    console.warn("Falling back to default app config.", error);
    appConfig = DEFAULT_APP_CONFIG;
  }

  return appConfig;
}

function isWallpaperEngineModeEnabled() {
  return appConfig.wallpaperEngine === true;
}

function isIntroTutorialEnabled() {
  return true;
}

function shouldUseExternalLinkPrompt() {
  return isWallpaperEngineModeEnabled();
}

function isMobileDisplayForHardwareAccelerationNotice() {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(
    window.matchMedia?.(PORTABLE_PERFORMANCE_MEDIA_QUERY)?.matches
    || window.matchMedia?.("(max-width: 720px)")?.matches
  );
}

function shouldShowHardwareAccelerationNotice() {
  return !isDesktopAppRuntime() && !isWallpaperEngineModeEnabled() && !isMobileDisplayForHardwareAccelerationNotice();
}

function isTankMouseLockFeatureEnabled() {
  return isWallpaperEngineModeEnabled();
}

function resolveFoodAndMedAssetPath(fileName) {
  const normalizedFileName = typeof fileName === "string" && fileName.trim()
    ? fileName.trim().replace(/^\/+/, "")
    : FOOD_AND_MEDS_FALLBACK_IMAGE_NAME;
  return resolveAppUrl(`assets/foodandmeds/${normalizedFileName}?v=${FOOD_AND_MEDS_ASSET_VERSION}`);
}

function resolveDispenserAssetPath(fileName) {
  const normalizedFileName = typeof fileName === "string" && fileName.trim()
    ? fileName.trim().replace(/^\/+/, "")
    : "pelletdispenser.png";
  return resolveAppUrl(`assets/dispenser/${normalizedFileName}?v=${AUTO_DISPENSER_ASSET_VERSION}`);
}

function normalizeCatalogTheme(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
