// Source fragment: core/cloud-save.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function getCloudSession() {
  try {
    const raw = localStorage.getItem(CLOUD_AUTH_SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" && parsed.access_token ? parsed : null;
  } catch {
    return null;
  }
}

function persistCloudSession(session) {
  if (!session || !session.access_token) {
    localStorage.removeItem(CLOUD_AUTH_SESSION_KEY);
    runtime.cloudSession = null;
    return null;
  }
  const expiresIn = Math.max(30, Number(session.expires_in) || 3600);
  const normalized = {
    access_token: String(session.access_token || ""),
    refresh_token: String(session.refresh_token || ""),
    token_type: String(session.token_type || "bearer"),
    expires_at: Number(session.expires_at) || (Date.now() + expiresIn * 1000),
    user: session.user || runtime.cloudSession?.user || null
  };
  localStorage.setItem(CLOUD_AUTH_SESSION_KEY, JSON.stringify(normalized));
  runtime.cloudSession = normalized;
  return normalized;
}

function clearCloudSession() {
  localStorage.removeItem(CLOUD_AUTH_SESSION_KEY);
  runtime.cloudSession = null;
  runtime.cloudWritesAllowed = false;
  runtime.cloudChecked = false;
  setCloudSyncStatus("signed-out", "Not signed in");
  renderCloudAccountPanel();
  renderStartupActions();
}

function getCloudMeta() {
  try {
    const raw = localStorage.getItem(CLOUD_SAVE_META_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function setCloudMeta(patch = {}) {
  const next = { ...getCloudMeta(), ...(patch || {}) };
  localStorage.setItem(CLOUD_SAVE_META_KEY, JSON.stringify(next));
  return next;
}

function recordLocalSaveForCloud(savedAt = Date.now()) {
  setCloudMeta({ localSavedAt: savedAt });
}

function setCloudSyncStatus(status, label = "") {
  runtime.cloudSyncStatus = status;
  runtime.cloudSyncLabel = label;
  document.querySelectorAll("[data-cloud-sync-status]").forEach((element) => {
    element.dataset.status = status;
    const text = element.querySelector("[data-cloud-sync-text]");
    if (text) {
      text.textContent = label || ({
        syncing: "Syncing...",
        synced: "Synced",
        offline: "Offline",
        error: "Sync failed",
        checking: "Checking cloud save...",
        "signed-out": "Not signed in"
      }[status] || "Cloud save");
    }
  });
}

function isCloudSessionCached() {
  return Boolean(getCloudSession());
}

async function supabaseAuthFetch(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method: options.method || "POST",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json",
      ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {})
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    throw new Error(data?.msg || data?.message || data?.error_description || data?.error || `Cloud request failed (${response.status}).`);
  }
  return data;
}

async function refreshCloudSessionIfNeeded() {
  let session = runtime.cloudSession || getCloudSession();
  if (!session) return null;
  if (Number(session.expires_at) - Date.now() > 60000) {
    runtime.cloudSession = session;
    return session;
  }
  if (!session.refresh_token) {
    clearCloudSession();
    return null;
  }
  try {
    const refreshed = await supabaseAuthFetch("/auth/v1/token?grant_type=refresh_token", {
      body: { refresh_token: session.refresh_token }
    });
    return persistCloudSession(refreshed);
  } catch (error) {
    console.error("Could not refresh cloud session.", error);
    clearCloudSession();
    return null;
  }
}

async function createCloudAccount(email, password) {
  const result = await supabaseAuthFetch("/auth/v1/signup", { body: { email, password } });
  if (result?.access_token) {
    persistCloudSession(result);
    await resolveCloudAfterLogin({ source: "signup" });
    return { signedIn: true };
  }
  return { signedIn: false, needsConfirmation: true };
}

async function signInCloudAccount(email, password) {
  const result = await supabaseAuthFetch("/auth/v1/token?grant_type=password", { body: { email, password } });
  persistCloudSession(result);
  await resolveCloudAfterLogin({ source: "signin" });
  return true;
}

async function signOutCloudAccount() {
  const session = await refreshCloudSessionIfNeeded();
  if (session?.access_token) {
    try {
      await supabaseAuthFetch("/auth/v1/logout", { accessToken: session.access_token, body: {} });
    } catch (error) {
      console.warn("Cloud sign out request failed; local session will still be cleared.", error);
    }
  }
  clearCloudSession();
  return true;
}

async function supabaseSaveFetch(query = "", options = {}) {
  const session = await refreshCloudSessionIfNeeded();
  if (!session?.access_token) throw new Error("You are not signed in.");
  const response = await fetch(`${SUPABASE_URL}/rest/v1/game_saves${query}`, {
    method: options.method || "GET",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      ...(options.prefer ? { Prefer: options.prefer } : {})
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    throw new Error(data?.message || data?.hint || data?.details || `Cloud save request failed (${response.status}).`);
  }
  return data;
}

async function getCloudSaveRecord() {
  const session = await refreshCloudSessionIfNeeded();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Your cloud session is missing its user ID. Please sign in again.");
  const rows = await supabaseSaveFetch(`?user_id=eq.${encodeURIComponent(userId)}&select=user_id,save_data,save_version,revision,updated_at`);
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function createCloudSavePayload(timestamp = Date.now()) {
  const exportState = await createPortableExportState(state);
  return {
    format: SAVE_FILE_FORMAT,
    exportVersion: SAVE_FILE_EXPORT_VERSION,
    exportedAt: timestamp,
    state: exportState
  };
}

function validateCloudSavePayload(payload) {
  const rawState = extractImportedSaveState(payload);
  if (!isLikelySaveStateObject(rawState)) throw new Error("The cloud save does not contain valid aquarium data.");
  return rawState;
}

async function backupCurrentLocalBeforeReplacement(reason = "before-cloud-load") {
  if (!state) return false;
  try {
    const payload = await createCloudSavePayload(Date.now());
    localStorage.setItem(CLOUD_REPLACEMENT_BACKUP_KEY, JSON.stringify({ reason, createdAt: Date.now(), payload }));
    return true;
  } catch (error) {
    console.warn("Could not create automatic local replacement backup.", error);
    return false;
  }
}

async function downloadCloudPayload(payload, prefix = "bubble-borough-cloud-save") {
  if (!payload) return false;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  downloadTextFile(JSON.stringify(payload, null, 2), `${prefix}-${timestamp}.json`, "application/json");
  return true;
}

async function applyCloudSaveRecord(record) {
  if (!record?.save_data) throw new Error("No cloud aquarium was found.");
  const rawState = validateCloudSavePayload(record.save_data);
  const hasMeaningfulLocalSave = Boolean(runtime.hadLocalSaveAtStartup && !runtime.freshGameSaveLocked);
  if (hasMeaningfulLocalSave) {
    const backedUp = await backupCurrentLocalBeforeReplacement("before-cloud-load");
    if (!backedUp && runtime.localBackupDownloadConfirmed !== true) {
      throw new Error("The existing device save could not be backed up safely. Download the local save first, then try again.");
    }
  }
  runtime.freshGameSaveLocked = false;
  runtime.applyingCloudSave = true;
  try {
    await applyImportedSaveData(rawState);
  } finally {
    runtime.applyingCloudSave = false;
  }
  const now = Date.now();
  setCloudMeta({
    cloudRevision: Number(record.revision) || 1,
    cloudUpdatedAt: record.updated_at || "",
    lastCloudSyncedAt: now,
    localSavedAt: now
  });
  runtime.cloudRevision = Number(record.revision) || 1;
  runtime.cloudWritesAllowed = true;
  runtime.cloudChecked = true;
  setCloudSyncStatus("synced", "Synced");
  renderCloudAccountPanel();
  return true;
}

async function uploadCurrentSaveToCloud(options = {}) {
  if (!state || runtime.applyingCloudSave || runtime.freshGameSaveLocked) return false;
  if (!runtime.cloudWritesAllowed && options.force !== true) return false;
  const session = await refreshCloudSessionIfNeeded();
  const userId = session?.user?.id;
  if (!userId) return false;
  const meta = getCloudMeta();
  const nextRevision = Math.max(1, Number(runtime.cloudRevision) || Number(meta.cloudRevision) || 0) + 1;
  setCloudSyncStatus("syncing", "Syncing...");
  try {
    const payload = await createCloudSavePayload(Date.now());
    const rows = await supabaseSaveFetch("?on_conflict=user_id", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=representation",
      body: {
        user_id: userId,
        save_data: payload,
        save_version: Number(state.version) || 1,
        revision: nextRevision,
        updated_at: new Date().toISOString()
      }
    });
    const row = Array.isArray(rows) ? rows[0] : null;
    const syncedAt = Date.now();
    runtime.cloudRevision = Number(row?.revision) || nextRevision;
    setCloudMeta({
      cloudRevision: runtime.cloudRevision,
      cloudUpdatedAt: row?.updated_at || new Date(syncedAt).toISOString(),
      lastCloudSyncedAt: syncedAt,
      localSavedAt: Number(meta.localSavedAt) || syncedAt
    });
    setCloudSyncStatus("synced", "Synced");
    renderCloudAccountPanel();
    return true;
  } catch (error) {
    console.error("Cloud save failed.", error);
    setCloudSyncStatus(navigator.onLine === false ? "offline" : "error", navigator.onLine === false ? "Offline, saved locally" : "Sync failed, saved locally");
    renderCloudAccountPanel();
    if (options.showToast !== false) showToast("Cloud sync failed. Your aquarium is still saved on this device.");
    return false;
  }
}

function scheduleCloudSave() {
  if (!runtime.cloudWritesAllowed || runtime.freshGameSaveLocked || !getCloudSession()) return false;
  if (runtime.cloudSaveTimerId) window.clearTimeout(runtime.cloudSaveTimerId);
  setCloudSyncStatus("syncing", "Syncing...");
  runtime.cloudSaveTimerId = window.setTimeout(() => {
    runtime.cloudSaveTimerId = 0;
    void uploadCurrentSaveToCloud({ showToast: false });
  }, CLOUD_SYNC_DEBOUNCE_MS);
  return true;
}

async function resolveCloudAfterLogin(options = {}) {
  runtime.cloudWritesAllowed = false;
  runtime.cloudChecked = false;
  setCloudSyncStatus("checking", "Checking cloud save...");
  renderCloudAccountPanel();
  try {
    const cloud = await getCloudSaveRecord();
    runtime.cloudChecked = true;
    if (!cloud) {
      runtime.cloudRevision = 0;
      runtime.cloudWritesAllowed = !runtime.freshGameSaveLocked;
      if (!runtime.freshGameSaveLocked && runtime.hadLocalSaveAtStartup !== false) {
        await uploadCurrentSaveToCloud({ force: true, showToast: options.source !== "startup" });
      } else {
        setCloudSyncStatus("synced", "Cloud ready");
      }
      renderStartupActions();
      renderCloudAccountPanel();
      return { kind: "empty" };
    }

    runtime.cloudRevision = Number(cloud.revision) || 1;
    const hasLocal = Boolean(runtime.hadLocalSaveAtStartup || (!runtime.freshGameSaveLocked && state?.tutorial?.completed));
    const meta = getCloudMeta();
    const knownCloudRevision = Number(meta.cloudRevision) || 0;
    const localChangedAfterSync = Number(meta.localSavedAt) > Number(meta.lastCloudSyncedAt || 0);

    if (!hasLocal) {
      await applyCloudSaveRecord(cloud);
      renderStartupActions();
      return { kind: "cloud-loaded" };
    }

    if (knownCloudRevision && knownCloudRevision === runtime.cloudRevision) {
      runtime.cloudWritesAllowed = true;
      if (localChangedAfterSync) await uploadCurrentSaveToCloud({ force: true, showToast: false });
      else setCloudSyncStatus("synced", "Synced");
      renderStartupActions();
      renderCloudAccountPanel();
      return { kind: "matched" };
    }

    await showCloudConflictDialog(cloud);
    return { kind: "conflict" };
  } catch (error) {
    console.error("Could not check cloud save.", error);
    runtime.cloudWritesAllowed = false;
    runtime.cloudChecked = false;
    setCloudSyncStatus(navigator.onLine === false ? "offline" : "error", navigator.onLine === false ? "Offline, cloud locked" : "Cloud check failed, cloud locked");
    renderCloudAccountPanel();
    renderStartupActions();
    if (options.source !== "startup") showToast("Could not safely check your cloud save. Cloud writes are locked.");
    return { kind: "error", error };
  }
}

async function chooseLocalForCloudConflict(cloud) {
  await downloadCloudPayload(cloud?.save_data, "bubble-borough-cloud-backup");
  runtime.cloudWritesAllowed = true;
  const uploaded = await uploadCurrentSaveToCloud({ force: true });
  if (!uploaded) throw new Error("Your device save could not be uploaded. Please try again.");
  finishCloudConflictSelection();
}

async function chooseCloudForCloudConflict(cloud) {
  await applyCloudSaveRecord(cloud);
  finishCloudConflictSelection();
}

function finishCloudConflictSelection() {
  closeCloudDialog();
  renderStartupActions();
  // The user already pressed Continue to reach this decision. Do not strand
  // them on the start screen after their selection has safely completed.
  primeSoundEffects();
  playRegularButtonSoundEffect();
  hideLoadingOverlay();
}

function closeCloudDialog() {
  const dialog = document.querySelector("[data-cloud-dialog]");
  if (dialog) dialog.remove();
}

async function showCloudConflictDialog(cloud) {
  closeCloudDialog();
  const localMeta = getCloudMeta();
  const wrapper = document.createElement("div");
  wrapper.className = "cloud-dialog-backdrop";
  wrapper.dataset.cloudDialog = "conflict";
  const cloudDate = cloud?.updated_at ? new Date(cloud.updated_at).toLocaleString() : "Unknown";
  const localDate = localMeta.localSavedAt ? new Date(localMeta.localSavedAt).toLocaleString() : "This device";
  wrapper.innerHTML = `
    <div class="cloud-dialog" role="dialog" aria-modal="true" aria-labelledby="cloudConflictTitle">
      <h2 id="cloudConflictTitle">Two aquariums were found</h2>
      <p>Nothing will be overwritten until you choose which aquarium to keep.</p>
      <div class="cloud-conflict-grid">
        <section><strong>This Device</strong><span>Last saved: ${escapeHtml(localDate)}</span><button type="button" class="small-button" data-cloud-use-local>Use This Device</button><button type="button" class="small-button alt" data-cloud-download-local>Download Local</button></section>
        <section><strong>Cloud Save</strong><span>Last saved: ${escapeHtml(cloudDate)}</span><button type="button" class="small-button" data-cloud-use-cloud>Use Cloud Save</button><button type="button" class="small-button alt" data-cloud-download-cloud>Download Cloud</button></section>
      </div>
      <p class="settings-section-note" data-cloud-conflict-message role="alert" hidden></p>
      <button type="button" class="small-button alt" data-cloud-conflict-later>Decide Later</button>
    </div>`;
  document.body.appendChild(wrapper);
  wrapper.querySelector("[data-cloud-download-local]")?.addEventListener("click", () => {
    void exportSaveData({ openOverlay: false }).then((downloaded) => {
      if (downloaded) runtime.localBackupDownloadConfirmed = true;
    });
  });
  wrapper.querySelector("[data-cloud-download-cloud]")?.addEventListener("click", () => void downloadCloudPayload(cloud.save_data));
  const runChoice = async (action) => {
    const buttons = [...wrapper.querySelectorAll("button")];
    const message = wrapper.querySelector("[data-cloud-conflict-message]");
    buttons.forEach((button) => { button.disabled = true; });
    if (message) {
      message.hidden = false;
      message.textContent = "Loading aquarium...";
    }
    try {
      await action();
    } catch (error) {
      console.error("Cloud conflict selection failed.", error);
      if (message) message.textContent = error?.message || "Could not load that aquarium. Please try again.";
      buttons.forEach((button) => { button.disabled = false; });
    }
  };
  wrapper.querySelector("[data-cloud-use-local]")?.addEventListener("click", () => void runChoice(() => chooseLocalForCloudConflict(cloud)));
  wrapper.querySelector("[data-cloud-use-cloud]")?.addEventListener("click", () => void runChoice(() => chooseCloudForCloudConflict(cloud)));
  wrapper.querySelector("[data-cloud-conflict-later]")?.addEventListener("click", closeCloudDialog);
}

function ensureStartupActions() {
  const content = dom.loadingOverlay?.querySelector(".loading-overlay-content");
  if (!content) return null;
  let actions = content.querySelector("[data-startup-actions]");
  if (actions) return actions;
  actions = document.createElement("div");
  actions.className = "startup-actions";
  actions.dataset.startupActions = "true";
  actions.innerHTML = `
    <div data-startup-buttons></div>
    <div class="startup-auth" data-startup-auth hidden>
      <label>Email<input type="email" autocomplete="email" data-startup-email></label>
      <label>Password<input type="password" autocomplete="current-password" data-startup-password></label>
      <div class="startup-auth-actions"><button class="small-button" type="button" data-startup-signin-submit>Sign In</button><button class="small-button alt" type="button" data-startup-create-submit>Create Account</button><button class="small-button alt" type="button" data-startup-auth-cancel>Back</button></div>
      <small data-startup-auth-status></small>
    </div>`;
  content.appendChild(actions);
  actions.addEventListener("click", handleStartupActionClick);
  return actions;
}

function renderStartupActions() {
  const actions = ensureStartupActions();
  if (!actions || !dom.loadingOverlay?.classList.contains("is-ready")) return;
  const buttons = actions.querySelector("[data-startup-buttons]");
  const auth = actions.querySelector("[data-startup-auth]");
  if (!buttons || !auth) return;
  if (!auth.hidden) return;
  const hasLocal = Boolean(runtime.hadLocalSaveAtStartup);
  const signedIn = Boolean(getCloudSession());
  buttons.innerHTML = (hasLocal || signedIn)
    ? `<button class="startup-primary-button" type="button" data-startup-continue>Continue</button>`
    : `<button class="startup-primary-button" type="button" data-startup-new>Start New Aquarium</button><button class="startup-secondary-button" type="button" data-startup-signin>Sign In</button>`;
  // The logo establishes the start screen. Keep the live-status node empty so
  // it does not render as a misleading, non-actionable welcome button.
  if (dom.loadingOverlayText) dom.loadingOverlayText.textContent = "";
}

function showStartupAuth() {
  const actions = ensureStartupActions();
  const buttons = actions?.querySelector("[data-startup-buttons]");
  const auth = actions?.querySelector("[data-startup-auth]");
  if (buttons) buttons.innerHTML = "";
  if (auth) auth.hidden = false;
  actions?.querySelector("[data-startup-email]")?.focus();
}

async function handleStartupAuthSubmit(createAccount = false) {
  const actions = ensureStartupActions();
  const email = String(actions?.querySelector("[data-startup-email]")?.value || "").trim();
  const password = String(actions?.querySelector("[data-startup-password]")?.value || "");
  const status = actions?.querySelector("[data-startup-auth-status]");
  if (!email || password.length < 6) {
    if (status) status.textContent = "Enter your email and a password with at least 6 characters.";
    return;
  }
  if (status) status.textContent = createAccount ? "Creating account..." : "Signing in...";
  try {
    if (createAccount) {
      const result = await createCloudAccount(email, password);
      if (result.needsConfirmation) {
        if (status) status.textContent = "Account created. Check your email to confirm it, then sign in.";
        return;
      }
    } else {
      await signInCloudAccount(email, password);
    }
    if (status) status.textContent = "Signed in.";
    const auth = actions?.querySelector("[data-startup-auth]");
    if (auth) auth.hidden = true;
    renderStartupActions();
  } catch (error) {
    if (status) status.textContent = error?.message || "Could not sign in.";
  }
}

function handleStartupActionClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  if (target.closest("[data-startup-signin]")) { showStartupAuth(); return; }
  if (target.closest("[data-startup-auth-cancel]")) {
    const auth = ensureStartupActions()?.querySelector("[data-startup-auth]");
    if (auth) auth.hidden = true;
    renderStartupActions();
    return;
  }
  if (target.closest("[data-startup-signin-submit]")) { void handleStartupAuthSubmit(false); return; }
  if (target.closest("[data-startup-create-submit]")) { void handleStartupAuthSubmit(true); return; }
  if (target.closest("[data-startup-new]")) {
    const button = target.closest("[data-startup-new]");
    showStartupLoadingState(button, "Starting aquarium...");
    runtime.freshGameSaveLocked = true;
    primeSoundEffects();
    playRegularButtonSoundEffect();
    window.setTimeout(hideLoadingOverlay, 130);
    return;
  }
  if (target.closest("[data-startup-continue]")) {
    void continueFromStartup();
  }
}

function showStartupLoadingState(button, label) {
  const actions = ensureStartupActions();
  const buttons = actions?.querySelector("[data-startup-buttons]");
  if (!actions || !buttons || actions.dataset.startupPending === "true") return;
  actions.dataset.startupPending = "true";
  if (button) {
    button.disabled = true;
    button.classList.add("is-pressed");
  }
  window.setTimeout(() => {
    buttons.innerHTML = `<div class="startup-loading-indicator" role="status"><span aria-hidden="true"></span>${escapeHtml(label)}</div>`;
  }, 90);
}

async function continueFromStartup() {
  const button = ensureStartupActions()?.querySelector("[data-startup-continue]");
  showStartupLoadingState(button, "Loading aquarium...");
  if (getCloudSession()) await resolveCloudAfterLogin({ source: "startup" });
  if (document.querySelector("[data-cloud-dialog]")) {
    const actions = ensureStartupActions();
    if (actions) delete actions.dataset.startupPending;
    renderStartupActions();
    return;
  }
  primeSoundEffects();
  playRegularButtonSoundEffect();
  hideLoadingOverlay();
}

function renderCloudAccountPanel() {
  const container = document.querySelector("[data-cloud-account-panel]");
  if (!container) return;
  const session = runtime.cloudSession || getCloudSession();
  const email = session?.user?.email || "";
  if (!session) {
    container.innerHTML = `<p class="settings-section-note">Sign in to automatically back up this aquarium and load it on another device.</p><div class="cloud-settings-auth"><input type="email" placeholder="Email" autocomplete="email" data-cloud-settings-email><input type="password" placeholder="Password" autocomplete="current-password" data-cloud-settings-password><div class="overview-actions"><button class="small-button" type="button" data-cloud-settings-signin>Sign In</button><button class="small-button alt" type="button" data-cloud-settings-create>Create Account</button></div><small data-cloud-settings-message></small></div>`;
  } else {
    container.innerHTML = `<p><strong>${escapeHtml(email || "Signed in")}</strong></p><div class="cloud-sync-row" data-cloud-sync-status data-status="${escapeHtml(runtime.cloudSyncStatus || "checking")}"><span class="cloud-bubble-spinner" aria-hidden="true"><i></i><i></i><i></i></span><span data-cloud-sync-text>${escapeHtml(runtime.cloudSyncLabel || "Checking cloud save...")}</span></div><div class="overview-actions"><button class="small-button" type="button" data-cloud-sync-now>Sync Now</button><button class="small-button alt" type="button" data-cloud-download-save>Download Save</button><button class="small-button alt" type="button" data-cloud-signout>Sign Out</button></div><small data-cloud-settings-message></small>`;
  }
}

async function handleCloudSettingsClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  const panel = target?.closest("[data-cloud-account-panel]");
  if (!panel) return false;
  const message = panel.querySelector("[data-cloud-settings-message]");
  const email = String(panel.querySelector("[data-cloud-settings-email]")?.value || "").trim();
  const password = String(panel.querySelector("[data-cloud-settings-password]")?.value || "");
  try {
    if (target.closest("[data-cloud-settings-signin]")) {
      if (message) message.textContent = "Signing in...";
      await signInCloudAccount(email, password);
      renderCloudAccountPanel();
      return true;
    }
    if (target.closest("[data-cloud-settings-create]")) {
      if (message) message.textContent = "Creating account...";
      const result = await createCloudAccount(email, password);
      if (result.needsConfirmation) {
        if (message) message.textContent = "Account created. Check your email to confirm it, then sign in.";
      } else renderCloudAccountPanel();
      return true;
    }
    if (target.closest("[data-cloud-sync-now]")) { await uploadCurrentSaveToCloud({ force: true }); return true; }
    if (target.closest("[data-cloud-download-save]")) { await exportSaveData({ openOverlay: false }); return true; }
    if (target.closest("[data-cloud-signout]")) { await signOutCloudAccount(); return true; }
  } catch (error) {
    console.error(error);
    if (message) message.textContent = error?.message || "Cloud account action failed.";
    return true;
  }
  return false;
}

function initializeCloudSaveRuntime() {
  runtime.cloudSession = getCloudSession();
  runtime.cloudWritesAllowed = false;
  runtime.cloudChecked = false;
  runtime.cloudRevision = Number(getCloudMeta().cloudRevision) || 0;
  setCloudSyncStatus(runtime.cloudSession ? "checking" : "signed-out", runtime.cloudSession ? "Cloud check pending" : "Not signed in");
  renderCloudAccountPanel();
}
