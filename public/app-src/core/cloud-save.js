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
    syncDebugToolsAuthorization();
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
  syncDebugToolsAuthorization();
  return normalized;
}

function clearCloudSession() {
  runtime.cloudEmailChangeNotice = "";
  localStorage.removeItem(CLOUD_AUTH_SESSION_KEY);
  runtime.cloudSession = null;
  syncDebugToolsAuthorization();
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

function getCloudSyncStatusPresentation(status, label = "") {
  const normalizedStatus = String(status || "");
  const normalizedLabel = String(label || "").trim();
  const presentations = {
    syncing: {
      title: "Syncing...",
      detail: normalizedLabel === "Pending sync..." ? "Changes are waiting to upload..." : "Uploading save data..."
    },
    checking: { title: "Checking...", detail: "Looking for your latest cloud save..." },
    synced: {
      title: "Synced",
      detail: normalizedLabel === "Cloud ready" ? "Cloud save is ready." : "All save data is up to date."
    },
    offline: { title: "Offline", detail: "Saved locally. Cloud sync will resume when you're online." },
    error: {
      title: "Sync Failed",
      detail: normalizedLabel.toLowerCase().includes("check") ? "Could not verify your cloud save." : "Could not upload save data."
    },
    "signed-out": { title: "Not Signed In", detail: "Sign in to keep your aquarium backed up." }
  };
  return presentations[normalizedStatus] || { title: normalizedLabel || "Cloud Save", detail: "" };
}

function setCloudSyncStatus(status, label = "") {
  runtime.cloudSyncStatus = status;
  runtime.cloudSyncLabel = label;
  const presentation = getCloudSyncStatusPresentation(status, label);
  runtime.cloudSyncDetail = presentation.detail;
  document.querySelectorAll("[data-cloud-sync-status]").forEach((element) => {
    element.dataset.status = status;
    const text = element.querySelector("[data-cloud-sync-text]");
    const detail = element.querySelector("[data-cloud-sync-detail]");
    if (text) text.textContent = presentation.title;
    if (detail) detail.textContent = presentation.detail;
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
    const error = new Error(data?.msg || data?.message || data?.error_description || data?.error || `Cloud request failed (${response.status}).`);
    error.code = data?.error_code || data?.code || "";
    error.status = response.status;
    throw error;
  }
  return data;
}

async function refreshCloudSessionIfNeeded() {
  let session = runtime.cloudSession || getCloudSession();
  if (!session) return null;
  if (Number(session.expires_at) - Date.now() > 60000) {
    runtime.cloudSession = session;
    syncDebugToolsAuthorization();
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
  const redirectTo = getCloudAuthRedirectUrl("signup-confirmed");
  const result = await supabaseAuthFetch(`/auth/v1/signup?redirect_to=${encodeURIComponent(redirectTo)}`, { body: { email, password } });
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
  runtime.cloudForceLogin = false;
  await resolveCloudAfterLogin({ source: "signin" });
  return true;
}

function getCloudAuthRedirectUrl(auth = "") {
  try {
    const url = new URL(window.location.href);
    url.hash = "";
    url.search = "";
    if (auth) url.searchParams.set("auth", auth);
    return url.toString();
  } catch {
    return window.location.href.split("#")[0].split("?")[0];
  }
}

async function requestCloudPasswordReset(email) {
  const normalizedEmail = String(email || "").trim();
  if (!normalizedEmail) throw new Error("Enter your email address first.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new Error("Enter a valid email address.");
  const redirectTo = getCloudAuthRedirectUrl("recovery");
  await supabaseAuthFetch(`/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
    body: { email: normalizedEmail }
  });
  return true;
}

async function requestCloudEmailChange(email) {
  const normalizedEmail = String(email || "").trim();
  if (!normalizedEmail) throw new Error("Enter a new email address first.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new Error("Enter a valid email address.");
  const session = await refreshCloudSessionIfNeeded();
  if (!session?.access_token) throw new Error("You are not signed in.");
  const currentEmail = String(session.user?.email || "").trim().toLowerCase();
  if (currentEmail && currentEmail === normalizedEmail.toLowerCase()) throw new Error("That is already your account email.");
  const redirectTo = getCloudAuthRedirectUrl("email-changed");
  const user = await supabaseAuthFetch(`/auth/v1/user?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: "PUT",
    accessToken: session.access_token,
    body: { email: normalizedEmail }
  });
  if (user && typeof user === "object") persistCloudSession({ ...session, user });
  return user;
}

function clearCloudAuthCallbackUrl() {
  try {
    const url = new URL(window.location.href);
    const keys = ["auth", "access_token", "refresh_token", "token_type", "expires_in", "expires_at", "type", "error", "error_code", "error_description", "code", "token_hash"];
    keys.forEach(key => url.searchParams.delete(key));
    const hash = new URLSearchParams(url.hash.slice(1));
    if (keys.some(key => hash.has(key))) url.hash = "";
    window.history.replaceState(null, document.title, `${url.pathname}${url.search}${url.hash}`);
  } catch {
    // Some embedded browsers do not permit history cleanup.
  }
}

function getCloudAuthErrorMessage(error) {
  const code = String(error?.code || "");
  if (error?.status === 429 || /rate|too many|over_.*limit/.test(code)) return "Too many requests. Please wait a few minutes and try again.";
  if (error instanceof TypeError || /network|fetch/i.test(error?.message || "")) return "We couldn't connect. Check your internet connection and try again.";
  if (/reauthentication_not_valid/.test(code)) return "The verification code is incorrect or expired. Check the code and try again, or request a new code.";
  return error?.message || "We couldn't verify this request. Please try again.";
}

function showAuthSuccess({ title, message, buttonText = "Return to Login", error = false }) {
  runtime.cloudAuthScreen = { title, message, buttonText, error };
  runtime.cloudWritesAllowed = false;
  renderStartupActions();
}

function showCloudAuthLinkError(error, recovery = false) {
  const expired = /expired|otp_expired/i.test(`${error?.code} ${error?.message}`);
  const verified = /already.*(verified|confirmed)/i.test(error?.message || "");
  showAuthSuccess({
    title: verified ? "Email Already Verified" : expired ? "Verification Link Expired" : recovery ? "Invalid Password Recovery Link" : "Something Went Wrong",
    message: verified ? "This email has already been verified. Return to Login to sign in." : expired ? "This verification link is no longer valid. Please request a new link." : getCloudAuthErrorMessage(error),
    error: !verified
  });
}

// The sole URL router. Callback credentials are validated before any success UI
// or game session is created. Query routes alone are never proof of verification.
async function handleAuthRoute() {
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.slice(1));
  const value = key => hash.get(key) || url.searchParams.get(key) || "";
  const route = value("auth");
  const type = value("type");
  const recovery = type === "recovery" || route === "recovery";
  const handled = Boolean(route || value("access_token") || value("error") || value("error_description") || value("code") || value("token_hash"));
  if (!handled) return { handled: false, recovery: false, type };
  runtime.cloudWritesAllowed = false;
  try {
    if (value("error") || value("error_description")) {
      throw Object.assign(new Error(value("error_description") || value("error")), { code: value("error_code") });
    }
    if (route === "reauth") {
      if (!runtime.cloudReauth) throw new Error("There is no pending verification request. Sign in and try your account action again.");
      renderStartupActions();
      return { handled: true, recovery: false, type };
    }
    const accessToken = value("access_token");
    if (!accessToken) throw new Error(recovery ? "Open the password reset link from your email, or request a new one using Forgot Password." : "This verification link is invalid or its session is missing. Please sign in or request a new link.");
    const user = await supabaseAuthFetch("/auth/v1/user", { method: "GET", accessToken });
    if (!user?.id) throw new Error("The verification session is missing. Please request a new link.");
    const session = { access_token: accessToken, refresh_token: value("refresh_token"), token_type: value("token_type") || "bearer", expires_in: Number(value("expires_in")) || 3600, user };
    runtime.cloudAuthTemporarySession = session;
    if (recovery) {
      runtime.cloudPasswordRecovery = session;
      runtime.cloudAuthScreen = null;
    } else if (type === "invite") {
      // Administrative invitations deliberately land on the ordinary sign-in card.
      runtime.cloudForceLogin = true;
    } else if (type === "signup" || route === "signup-confirmed") {
      showAuthSuccess({ title: "Email Confirmed", message: "Your Bubble Borough account has been verified." });
    } else if (type === "email_change" || route === "email-changed") {
      if (user.new_email) {
        showAuthSuccess({ title: "Verification Still Needed", message: "Please follow the verification instructions sent to both your current and new email addresses to finish changing your email." });
      } else showAuthSuccess({ title: "Email Address Changed", message: "Your new email address has been verified." });
    } else if (route) {
      throw new Error("This authentication request is no longer available. Please sign in again.");
    } else {
      // Preserve existing magic-link callbacks without exposing new login options.
      persistCloudSession(session);
      runtime.cloudAuthTemporarySession = null;
    }
  } catch (error) {
    showCloudAuthLinkError(error, recovery);
  } finally {
    clearCloudAuthCallbackUrl();
  }
  return { handled: true, recovery: hasCloudPasswordRecoverySession(), type };
}

async function consumeCloudAuthCallbackFromUrl() {
  return handleAuthRoute();
}

function returnToCloudLogin() {
  runtime.cloudAuthScreen = null;
  runtime.cloudPasswordRecovery = null;
  runtime.cloudAuthTemporarySession = null;
  runtime.cloudReauth = null;
  runtime.cloudAuthNotice = "";
  runtime.cloudAuthCallbackType = "";
  runtime.cloudForceLogin = false;
  clearCloudAuthCallbackUrl();
  clearCloudSession();
  const actions = ensureStartupActions();
  actions?.querySelectorAll("input").forEach(input => { input.value = ""; });
  actions?.querySelectorAll("small").forEach(status => { status.textContent = ""; });
  renderStartupActions();
  actions?.querySelector("[data-startup-email]")?.focus();
}

function hasCloudPasswordRecoverySession() {
  return Boolean(runtime.cloudPasswordRecovery?.access_token);
}

async function completeCloudPasswordReset(password, confirmation) {
  const nextPassword = String(password || "");
  const confirmedPassword = String(confirmation || "");
  if (nextPassword.length < 6) throw new Error("Use a password with at least 6 characters.");
  if (nextPassword !== confirmedPassword) throw new Error("The passwords do not match.");
  const recovery = runtime.cloudPasswordRecovery;
  if (!recovery?.access_token) throw new Error("This password reset link has expired or is no longer available.");

  return submitCloudPasswordUpdate(recovery, nextPassword);
}

async function submitCloudPasswordUpdate(session, password, nonce = "") {
  try {
    const user = await supabaseAuthFetch("/auth/v1/user", {
      method: "PUT", accessToken: session.access_token,
      body: { password, ...(nonce ? { nonce } : {}) }
    });
    runtime.cloudPasswordRecovery = null;
    runtime.cloudReauth = null;
    runtime.cloudAuthTemporarySession = { ...session, user };
    showAuthSuccess({ title: "Password Changed", message: "Your password has been updated successfully." });
    ensureStartupActions()?.querySelectorAll('input[type="password"]').forEach(input => { input.value = ""; });
    return user;
  } catch (error) {
    if (error.code !== "reauthentication_needed" || nonce) throw error;
    await supabaseAuthFetch("/auth/v1/reauthenticate", { method: "GET", accessToken: session.access_token });
    runtime.cloudReauth = { session, password };
    renderStartupActions();
    return null;
  }
}

async function handleCloudReauth(resend = false) {
  const pending = runtime.cloudReauth;
  const card = ensureStartupActions()?.querySelector("[data-startup-reauth]");
  const status = card?.querySelector("small");
  if (!pending || runtime.cloudReauthBusy) return;
  runtime.cloudReauthBusy = true;
  card?.querySelectorAll("button").forEach(button => { button.disabled = true; });
  try {
    if (resend) {
      await supabaseAuthFetch("/auth/v1/reauthenticate", { method: "GET", accessToken: pending.session.access_token });
      if (status) status.textContent = "A new verification code has been sent. Check your email.";
    } else {
      const nonce = String(card?.querySelector("input")?.value || "").trim();
      if (!nonce) throw new Error("Enter the verification code from your email.");
      if (status) status.textContent = "Verifying...";
      await submitCloudPasswordUpdate(pending.session, pending.password, nonce);
    }
  } catch (error) {
    if (status) status.textContent = getCloudAuthErrorMessage(error);
  } finally {
    runtime.cloudReauthBusy = false;
    card?.querySelectorAll("button").forEach(button => { button.disabled = false; });
  }
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

async function performCloudSaveUpload(options = {}) {
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
    await supabaseSaveFetch("?on_conflict=user_id", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=minimal",
      body: {
        user_id: userId,
        save_data: payload,
        save_version: Number(state.version) || 1,
        revision: nextRevision,
        updated_at: new Date().toISOString()
      }
    });
    const syncedAt = Date.now();
    runtime.cloudRevision = nextRevision;
    setCloudMeta({
      cloudRevision: runtime.cloudRevision,
      cloudUpdatedAt: new Date(syncedAt).toISOString(),
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

function uploadCurrentSaveToCloud(options = {}) {
  if (runtime.cloudUploadPromise) {
    runtime.cloudUploadQueued = true;
    return runtime.cloudUploadPromise;
  }
  runtime.cloudUploadPromise = performCloudSaveUpload(options).finally(() => {
    runtime.cloudUploadPromise = null;
    if (runtime.cloudUploadQueued) {
      runtime.cloudUploadQueued = false;
      scheduleCloudSave();
    }
  });
  return runtime.cloudUploadPromise;
}

function scheduleCloudSave() {
  if (!runtime.cloudWritesAllowed || runtime.freshGameSaveLocked || !getCloudSession()) return false;
  if (runtime.cloudSaveTimerId) window.clearTimeout(runtime.cloudSaveTimerId);
  setCloudSyncStatus("syncing", "Pending sync...");
  const lastSyncedAt = Number(getCloudMeta().lastCloudSyncedAt) || 0;
  const minimumDelay = Math.max(0, CLOUD_SYNC_MIN_INTERVAL_MS - (Date.now() - lastSyncedAt));
  runtime.cloudSaveTimerId = window.setTimeout(() => {
    runtime.cloudSaveTimerId = 0;
    void uploadCurrentSaveToCloud({ showToast: false });
  }, Math.max(CLOUD_SYNC_DEBOUNCE_MS, minimumDelay));
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
  showStartupAccountWelcome();
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

// All full-screen auth states use the original Password Reset card primitives.
function renderAuthCard({ attribute, title, message, fields = [], buttons = [], footer = "", status = "" }) {
  return `<form class="startup-auth" ${attribute} hidden>
    <div class="startup-auth-heading"><strong class="startup-auth-title" tabindex="-1">${escapeHtml(title)}</strong><span class="startup-auth-copy">${escapeHtml(message)}</span></div>
    ${fields.map(field => `<label class="startup-auth-field"><span class="startup-auth-label">${escapeHtml(field.label)}</span><span class="startup-auth-input-wrap"><span class="startup-auth-input-icon" aria-hidden="true">${field.type === "email" ? "✉" : "▣"}</span><input type="${field.type}" autocomplete="${field.autocomplete}" placeholder="${escapeHtml(field.placeholder || field.label)}" ${field.attribute}></span></label>`).join("")}
    <div class="startup-auth-actions ${buttons.length === 1 ? "startup-auth-actions-single" : ""}">${buttons.map((button, index) => `<button class="small-button ${index ? "alt startup-create-button" : "startup-signin-button"}" type="${index ? "button" : "submit"}" ${button.attribute}>${escapeHtml(button.text)}</button>`).join("")}</div>
    ${footer}<small role="status" aria-live="polite" ${status}></small>
  </form>`;
}

function getCloudAuthFormMarkup(recovery = false, settings = false) {
  const prefix = settings ? "data-cloud-settings" : "data-startup";
  return renderAuthCard(recovery ? {
    attribute: "data-startup-password-recovery", title: "Choose a new password", message: "Create a new password for your Bubble Borough account.",
    fields: [
      { label: "New Password", type: "password", autocomplete: "new-password", placeholder: "Enter a new password", attribute: `${prefix}-new-password` },
      { label: "Confirm Password", type: "password", autocomplete: "new-password", placeholder: "Confirm your new password", attribute: `${prefix}-confirm-password` }
    ],
    buttons: [{ text: "Save New Password", attribute: `${prefix}-complete-password-reset` }], status: settings ? `${prefix}-message` : "data-startup-password-recovery-status"
  } : {
    attribute: "data-startup-auth", title: "Sign in to Bubble Borough", message: "Sign in or create an account to continue.",
    fields: [
      { label: "Email", type: "email", autocomplete: "email", placeholder: "Enter your email", attribute: `${prefix}-email` },
      { label: "Password", type: "password", autocomplete: "current-password", placeholder: "Enter your password", attribute: `${prefix}-password` }
    ],
    buttons: [{ text: "Sign In", attribute: settings ? `${prefix}-signin` : `${prefix}-signin-submit` }, { text: "Create Account", attribute: settings ? `${prefix}-create` : `${prefix}-create-submit` }],
    footer: `<div class="startup-forgot-row"><span aria-hidden="true"></span><button class="startup-forgot-button" type="button" ${prefix}-forgot-password><b aria-hidden="true">?</b> Forgot Password</button><span aria-hidden="true"></span></div>`,
    status: settings ? `${prefix}-message` : "data-startup-auth-status"
  });
}

function ensureStartupActions() {
  const content = dom.loadingOverlay?.querySelector(".loading-overlay-content");
  if (!content) return null;
  let actions = content.querySelector("[data-startup-actions]");
  if (actions) return actions;
  actions = document.createElement("div");
  actions.className = "startup-actions";
  actions.dataset.startupActions = "true";
  actions.innerHTML = `<div data-startup-buttons></div>${getCloudAuthFormMarkup()}${getCloudAuthFormMarkup(true)}
    ${renderAuthCard({ attribute: "data-startup-result", title: "", message: "", buttons: [{ text: "Return to Login", attribute: "data-auth-return-login" }] })}
    ${renderAuthCard({ attribute: "data-startup-reauth", title: "Verify It's You", message: "For your security, please verify your identity before continuing.", fields: [{ label: "Verification Code", type: "text", autocomplete: "one-time-code", attribute: "data-auth-nonce" }], buttons: [{ text: "Verify", attribute: "data-auth-verify" }], footer: '<button class="startup-forgot-button" type="button" data-auth-resend-code>Send New Code</button><button class="startup-forgot-button" type="button" data-auth-return-login>Return to Login</button>' })}`;
  content.appendChild(actions);
  actions.addEventListener("click", handleStartupActionClick);
  actions.addEventListener("submit", event => {
    event.preventDefault();
    const button = event.target.querySelector('button[type="submit"]');
    if (button && !button.disabled) button.click();
  });
  return actions;
}

function renderStartupActions() {
  const actions = ensureStartupActions();
  if (!actions || !dom.loadingOverlay?.classList.contains("is-ready")) return;
  const buttons = actions.querySelector("[data-startup-buttons]");
  const auth = actions.querySelector("[data-startup-auth]");
  const recovery = actions.querySelector("[data-startup-password-recovery]");
  if (!buttons || !auth || !recovery) return;
  const overlay = dom.loadingOverlay;
  const result = actions.querySelector("[data-startup-result]");
  const reauth = actions.querySelector("[data-startup-reauth]");
  result.hidden = true;
  reauth.hidden = true;
  if (runtime.cloudAuthScreen || runtime.cloudReauth) {
    overlay.classList.add("is-auth-mode");
    overlay.classList.remove("is-welcome-mode");
    buttons.innerHTML = "";
    auth.hidden = true;
    recovery.hidden = true;
    const card = runtime.cloudAuthScreen ? result : reauth;
    card.hidden = false;
    if (runtime.cloudAuthScreen) {
      const screen = runtime.cloudAuthScreen;
      card.querySelector(".startup-auth-title").textContent = screen.title;
      card.querySelector(".startup-auth-copy").textContent = screen.message;
      card.querySelector("button").textContent = screen.buttonText;
      card.dataset.authError = String(screen.error);
    }
    if (!card.contains(document.activeElement)) card.querySelector("input, .startup-auth-title")?.focus();
    return;
  }
  if (hasCloudPasswordRecoverySession()) {
    overlay?.classList.add("is-auth-mode");
    overlay?.classList.remove("is-welcome-mode");
    buttons.innerHTML = "";
    auth.hidden = true;
    recovery.hidden = false;
    if (dom.loadingOverlayText) dom.loadingOverlayText.textContent = "";
    recovery.querySelector("[data-startup-new-password]")?.focus();
    return;
  }
  recovery.hidden = true;
  const hasLocal = Boolean(runtime.hadLocalSaveAtStartup);
  const session = getCloudSession();
  const signedIn = Boolean(session) && !runtime.cloudForceLogin;
  const authStatus = auth.querySelector("[data-startup-auth-status]");
  if (!signedIn) {
    overlay?.classList.add("is-auth-mode");
    overlay?.classList.remove("is-welcome-mode");
    buttons.innerHTML = "";
    auth.hidden = false;
    if (dom.loadingOverlayText) dom.loadingOverlayText.textContent = "";
    if (authStatus && runtime.cloudAuthNotice) authStatus.textContent = runtime.cloudAuthNotice;
    return;
  }
  overlay?.classList.remove("is-auth-mode");
  overlay?.classList.add("is-welcome-mode");
  auth.hidden = true;
  const username = getAccountUsernameForUser(session?.user?.id || "");
  const shouldStartFresh = !hasLocal && (
    runtime.cloudAuthCallbackType === "signup"
    || (runtime.cloudChecked === true && runtime.freshGameSaveLocked === true)
  );
  const notice = runtime.cloudAuthNotice
    ? `<div class="startup-auth-confirmed" role="status">${escapeHtml(runtime.cloudAuthNotice)}</div>`
    : "";
  if (dom.loadingOverlayText) dom.loadingOverlayText.textContent = "";
  buttons.innerHTML = `${notice}<div class="startup-welcome-title">Welcome, ${escapeHtml(username)}!</div>${shouldStartFresh
    ? `<button class="startup-primary-button" type="button" data-startup-new>Start</button>`
    : `<button class="startup-primary-button" type="button" data-startup-continue>Continue</button>`}`;
}

function showStartupAuth() {
  const actions = ensureStartupActions();
  const buttons = actions?.querySelector("[data-startup-buttons]");
  const auth = actions?.querySelector("[data-startup-auth]");
  dom.loadingOverlay?.classList.add("is-auth-mode");
  dom.loadingOverlay?.classList.remove("is-welcome-mode");
  if (buttons) buttons.innerHTML = "";
  if (auth) auth.hidden = false;
  actions?.querySelector("[data-startup-email]")?.focus();
}

async function startFromStartup() {
  const button = ensureStartupActions()?.querySelector("[data-startup-new]");
  showStartupLoadingState(button, "Starting aquarium...");
  runtime.freshGameSaveLocked = true;
  if (getCloudSession()) await resolveCloudAfterLogin({ source: "startup" });
  if (document.querySelector("[data-cloud-dialog]")) {
    const actions = ensureStartupActions();
    if (actions) delete actions.dataset.startupPending;
    renderStartupActions();
    return;
  }
  runtime.cloudAuthCallbackType = "";
  runtime.cloudAuthNotice = "";
  primeSoundEffects();
  playRegularButtonSoundEffect();
  hideLoadingOverlay();
  showStartupAccountWelcome();
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
        if (status) status.textContent = "Account created. Check your email to confirm it, then return here to start.";
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
    if (status) status.textContent = getCloudAuthErrorMessage(error);
  }
}

async function handleStartupForgotPassword() {
  const actions = ensureStartupActions();
  const email = String(actions?.querySelector("[data-startup-email]")?.value || "").trim();
  const status = actions?.querySelector("[data-startup-auth-status]");
  if (!email) {
    if (status) status.textContent = "Enter your email address first.";
    return;
  }
  if (status) status.textContent = "Sending reset email...";
  try {
    await requestCloudPasswordReset(email);
    if (status) status.textContent = "If that email has a Bubble Borough account, a password reset link is on the way.";
  } catch (error) {
    if (status) status.textContent = getCloudAuthErrorMessage(error);
  }
}

async function handleStartupCompletePasswordReset() {
  const actions = ensureStartupActions();
  const recovery = actions?.querySelector("[data-startup-password-recovery]");
  const password = String(recovery?.querySelector("[data-startup-new-password]")?.value || "");
  const confirmation = String(recovery?.querySelector("[data-startup-confirm-password]")?.value || "");
  const status = recovery?.querySelector("[data-startup-password-recovery-status]");
  if (status) status.textContent = "Updating password...";
  try {
    await completeCloudPasswordReset(password, confirmation);
    if (status) status.textContent = "";
    renderStartupActions();
  } catch (error) {
    if (status) status.textContent = getCloudAuthErrorMessage(error);
  }
}

function handleStartupActionClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  // Button clicks are handled here; Enter is forwarded by the form listener.
  if (target.closest('button[type="submit"]')) event.preventDefault();
  if (target.closest("[data-auth-return-login]")) { returnToCloudLogin(); return; }
  if (target.closest("[data-auth-verify]")) { void handleCloudReauth(); return; }
  if (target.closest("[data-auth-resend-code]")) { void handleCloudReauth(true); return; }
  if (target.closest("[data-startup-signin]")) { showStartupAuth(); return; }
  if (target.closest("[data-startup-signin-submit]")) { void runStartupAuthAction(() => handleStartupAuthSubmit(false)); return; }
  if (target.closest("[data-startup-create-submit]")) { void runStartupAuthAction(() => handleStartupAuthSubmit(true)); return; }
  if (target.closest("[data-startup-forgot-password]")) { void runStartupAuthAction(handleStartupForgotPassword); return; }
  if (target.closest("[data-startup-complete-password-reset]")) { void runStartupAuthAction(handleStartupCompletePasswordReset); return; }
  if (target.closest("[data-startup-new]")) {
    void startFromStartup();
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
  const trivia = document.querySelector("[data-loading-trivia]");
  if (trivia) {
    const messages = [
      "The whole world decays\nI retreat beneath the glass\nDigital fish swim",
      "Goldfish can recognize familiar people.",
      "Angelfish communicate with posture and color.",
      "A school of fish can move as one without a leader.",
      "A clean tank is a happier neighborhood."
    ];
    trivia.textContent = messages[Math.floor(Math.random() * messages.length)];
  }
  if (button) {
    button.disabled = true;
    button.classList.add("is-pressed");
  }
  window.setTimeout(() => {
    buttons.innerHTML = `<div class="startup-loading-indicator" role="status"><span aria-hidden="true"></span>${escapeHtml(label)}</div>`;
  }, 90);
}

function showStartupAccountWelcome() {
  const session = getCloudSession();
  const userId = session?.user?.id || "";
  const username = getAccountUsernameForUser(userId);
  if (!userId || !username) return false;
  window.setTimeout(() => showToast(`Welcome, ${username}!`), 250);
  return true;
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
  runtime.cloudAuthNotice = "";
  runtime.cloudAuthCallbackType = "";
  showStartupAccountWelcome();
}

function renderCloudAccountPanel() {
  const container = document.querySelector("[data-cloud-account-panel]");
  if (!container) return;
  container.closest(".settings-section")?.classList.add("cloud-account-settings-section");
  container.closest(".settings-panel")?.classList.add("has-cloud-account-ui");
  const session = runtime.cloudSession || getCloudSession();
  const email = session?.user?.email || "";
  const pendingEmail = session?.user?.new_email || "";
  const userId = session?.user?.id || "";
  if (hasCloudPasswordRecoverySession() || !session) {
    container.innerHTML = getCloudAuthFormMarkup(hasCloudPasswordRecoverySession(), true).replace(" hidden>", ">");
    container.querySelector("form")?.addEventListener("submit", event => {
      event.preventDefault();
      const button = event.target.querySelector('button[type="submit"]');
      if (button && !button.disabled) button.click();
    });
  } else {
    const username = getAccountUsernameForUser(userId);
    const presentation = getCloudSyncStatusPresentation(runtime.cloudSyncStatus || "checking", runtime.cloudSyncLabel || "");
    container.innerHTML = `
      <div class="cloud-account-shell">
        <header class="cloud-account-hero">
          <div class="cloud-account-title-group">
            <span class="cloud-account-title-icon" aria-hidden="true"><span>↑</span><span>↓</span></span>
            <div><strong>Cloud Save Sync</strong><span>Keep your progress safe across devices.</span></div>
          </div>
          <div class="cloud-sync-state-card" data-cloud-sync-status data-status="${escapeHtml(runtime.cloudSyncStatus || "checking")}" role="status" aria-live="polite">
            <span class="cloud-sync-light" aria-hidden="true"></span>
            <span class="cloud-sync-state-copy"><strong data-cloud-sync-text>${escapeHtml(presentation.title)}</strong><span data-cloud-sync-detail>${escapeHtml(presentation.detail)}</span></span>
          </div>
        </header>

        <section class="cloud-account-details-panel">
          <div class="cloud-account-section-heading"><strong>Account Details</strong><span>Your account keeps your progress, settings, and unlocks safe.</span></div>
          <div class="cloud-account-identity-grid">
            <div class="cloud-account-identity-card">
              <span class="cloud-account-avatar" aria-hidden="true">●</span>
              <div class="cloud-account-identity-copy"><span>Username</span><strong>${escapeHtml(username)}</strong></div>
              <button class="cloud-account-edit-button" type="button" data-cloud-edit-username aria-label="Edit username" title="Edit username">✎</button>
              <div class="cloud-account-username-editor" data-cloud-username-editor hidden>
                <input type="text" maxlength="32" autocomplete="nickname" placeholder="Choose a name" value="${escapeHtml(username)}" data-cloud-settings-username>
                <button class="small-button" type="button" data-cloud-save-username>Save</button>
                <button class="small-button alt" type="button" data-cloud-cancel-username>Cancel</button>
              </div>
            </div>
            <div class="cloud-account-identity-card">
              <span class="cloud-account-mail-icon" aria-hidden="true">✉</span>
              <div class="cloud-account-identity-copy"><span>Email</span><strong>${escapeHtml(email || "Signed in")}</strong>${pendingEmail ? `<small>Pending: ${escapeHtml(pendingEmail)}</small>` : ""}</div>
            </div>
          </div>
        </section>

        <div class="cloud-account-primary-actions">
          <button class="cloud-account-action cloud-account-action-primary" type="button" data-cloud-sync-now><span class="cloud-account-action-icon" aria-hidden="true">↻</span><span><strong>Sync Now</strong><small>Upload latest save</small></span></button>
          <button class="cloud-account-action" type="button" data-cloud-download-save><span class="cloud-account-action-icon" aria-hidden="true">⇩</span><span><strong>Download Save</strong><small>Create a backup copy</small></span></button>
          <button class="cloud-account-action" type="button" data-cloud-signout><span class="cloud-account-action-icon" aria-hidden="true">⇥</span><span><strong>Sign Out</strong><small>Disconnect this account</small></span></button>
        </div>

        <section class="cloud-account-security" aria-label="Account security">
          <div class="cloud-account-section-heading"><strong>Account Security</strong><span>Manage recovery and your sign-in email.</span></div>
          <div class="cloud-account-security-grid">
            <section class="cloud-account-security-card">
              <div><strong>Forgot Password</strong><span>Send a password reset link to ${escapeHtml(email || "your account email")}.</span></div>
              <button class="small-button alt" type="button" data-cloud-settings-signedin-forgot-password>Send Reset Email</button>
            </section>
            <section class="cloud-account-security-card cloud-account-security-card-email">
              <div><strong>Change Email Address</strong><span>We'll verify the new address before changing your sign-in email.</span></div>
              <div class="cloud-account-email-change-controls"><input type="email" placeholder="New email address" autocomplete="email" data-cloud-settings-new-email><button class="small-button alt" type="button" data-cloud-settings-change-email ${runtime.cloudEmailChangeBusy ? "disabled" : ""}>Change Email</button></div>
              <small class="cloud-account-email-status" data-cloud-email-status role="status" aria-live="polite">${escapeHtml(runtime.cloudEmailChangeNotice || "")}</small>
            </section>
          </div>
        </section>
        <small class="cloud-account-message" data-cloud-settings-message>${escapeHtml(runtime.cloudAuthNotice || "")}</small>
      </div>`;
  }
}

async function handleCloudSettingsClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  const panel = target?.closest("[data-cloud-account-panel]");
  if (!panel) return false;
  if (target.closest('button[type="submit"]')) event.preventDefault();
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
        if (message) message.textContent = "Account created. Check your email to confirm it, then return here.";
      } else renderCloudAccountPanel();
      return true;
    }
    if (target.closest("[data-cloud-settings-forgot-password]")) {
      if (!email) {
        if (message) message.textContent = "Enter your email address first.";
        return true;
      }
      if (message) message.textContent = "Sending reset email...";
      await requestCloudPasswordReset(email);
      if (message) message.textContent = "If that email has a Bubble Borough account, a password reset link is on the way.";
      return true;
    }
    if (target.closest("[data-cloud-settings-signedin-forgot-password]")) {
      const session = runtime.cloudSession || getCloudSession();
      const signedInEmail = String(session?.user?.email || "").trim();
      if (!signedInEmail) {
        if (message) message.textContent = "Your account email could not be found. Sign out and sign in again.";
        return true;
      }
      if (message) message.textContent = "Sending reset email...";
      await requestCloudPasswordReset(signedInEmail);
      if (message) message.textContent = "Password reset email sent. Check your inbox.";
      return true;
    }
    if (target.closest("[data-cloud-settings-change-email]")) {
      if (runtime.cloudEmailChangeBusy) return true;
      const button = panel.querySelector("[data-cloud-settings-change-email]");
      const nextEmail = String(panel.querySelector("[data-cloud-settings-new-email]")?.value || "").trim();
      runtime.cloudEmailChangeBusy = true;
      button.disabled = true;
      const setNotice = text => {
        runtime.cloudEmailChangeNotice = text;
        const status = panel.querySelector("[data-cloud-email-status]");
        if (status) status.textContent = text;
      };
      setNotice("Sending verification instructions...");
      try {
        await requestCloudEmailChange(nextEmail);
        setNotice(`Verification instructions sent for: ${nextEmail}. Follow the instructions sent to your new and, if required, current email address. Your email address will change after all required verifications are complete.`);
      } catch (error) {
        setNotice(getCloudAuthErrorMessage(error));
      } finally {
        runtime.cloudEmailChangeBusy = false;
        button.disabled = false;
      }
      return true;
    }
    if (target.closest("[data-cloud-settings-complete-password-reset]")) {
      const password = String(panel.querySelector("[data-cloud-settings-new-password]")?.value || "");
      const confirmation = String(panel.querySelector("[data-cloud-settings-confirm-password]")?.value || "");
      if (message) message.textContent = "Updating password...";
      await completeCloudPasswordReset(password, confirmation);
      dom.loadingOverlay.hidden = false;
      dom.loadingOverlay.classList.remove("is-hiding");
      dom.loadingOverlay.classList.add("is-ready");
      renderStartupActions();
      renderCloudAccountPanel();
      return true;
    }
    if (target.closest("[data-cloud-edit-username]")) {
      const editor = panel.querySelector("[data-cloud-username-editor]");
      if (editor) editor.hidden = false;
      panel.querySelector("[data-cloud-settings-username]")?.focus();
      return true;
    }
    if (target.closest("[data-cloud-cancel-username]")) {
      const editor = panel.querySelector("[data-cloud-username-editor]");
      if (editor) editor.hidden = true;
      return true;
    }
    if (target.closest("[data-cloud-save-username]")) {
      const session = runtime.cloudSession || getCloudSession();
      const userId = session?.user?.id || "";
      const usernameInput = panel.querySelector("[data-cloud-settings-username]");
      if (!userId || !usernameInput) return true;
      const profile = sanitizeAccountProfile({ username: usernameInput.value, userId });
      state.accountProfile = profile;
      saveState();
      renderCloudAccountPanel();
      showToast(profile.username ? `Username saved as ${profile.username}.` : "Username cleared.");
      return true;
    }
    if (target.closest("[data-cloud-sync-now]")) { await uploadCurrentSaveToCloud({ force: true }); return true; }
    if (target.closest("[data-cloud-download-save]")) { await exportSaveData({ openOverlay: false }); return true; }
    if (target.closest("[data-cloud-signout]")) { await signOutCloudAccount(); return true; }
  } catch (error) {
    console.error(error);
    if (message) message.textContent = getCloudAuthErrorMessage(error);
    return true;
  }
  return false;
}

async function initializeCloudSaveRuntime() {
  const callback = await consumeCloudAuthCallbackFromUrl();
  runtime.cloudSession = callback.recovery ? null : getCloudSession();
  syncDebugToolsAuthorization();
  runtime.cloudWritesAllowed = false;
  runtime.cloudChecked = false;
  runtime.cloudRevision = Number(getCloudMeta().cloudRevision) || 0;
  setCloudSyncStatus(runtime.cloudSession ? "checking" : "signed-out", runtime.cloudSession ? "Cloud check pending" : "Not signed in");
  renderCloudAccountPanel();
}

async function runStartupAuthAction(action) {
  if (runtime.cloudStartupAuthBusy) return;
  runtime.cloudStartupAuthBusy = true;
  const actions = ensureStartupActions();
  actions?.querySelectorAll("button").forEach(button => { button.disabled = true; });
  try { await action(); }
  finally {
    runtime.cloudStartupAuthBusy = false;
    actions?.querySelectorAll("button").forEach(button => { button.disabled = false; });
  }
}
