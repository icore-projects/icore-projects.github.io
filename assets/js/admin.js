/* ============================================================
   I.Core Projects — admin dashboard logic
   Publishing model: the whole app list lives in one file,
   apps.json, at the root of this repo. Connecting with a GitHub
   token lets this page read + commit that file directly via the
   GitHub Contents API — no backend server needed, since the
   commit IS the backend write.
   ============================================================ */

(function () {
  "use strict";

  // ---- Adjust these to match where this site actually lives ----
  const CONFIG = {
    owner: "icore-projects",          // GitHub username or org
    repo: "icore-projects.github.io", // repo name
    branch: null,                     // null = auto-detect the repo's default branch
    path: "apps.json",
  };

  const TOKEN_SESSION_KEY = "icore_admin_token";
  const LOCAL_APPS_KEY = "icore_local_apps";

  const state = {
    token: null,
    mode: null,       // "github" | "local"
    sha: null,        // current apps.json sha (github mode), needed to commit updates
    branch: null,
    apps: [],
    editingId: null,
  };

  // ---------------- DOM ----------------
  const lockScreen = document.getElementById("lock-screen");
  const dashboard = document.getElementById("dashboard");
  const tokenInput = document.getElementById("gh-token");
  const tokenError = document.getElementById("token-error");
  const rememberCheckbox = document.getElementById("remember-token");
  const connectBtn = document.getElementById("connect-btn");
  const localPreviewBtn = document.getElementById("local-preview-btn");
  const disconnectBtn = document.getElementById("disconnect-btn");

  const statusBanner = document.getElementById("status-banner");
  const statusText = document.getElementById("status-text");

  const form = document.getElementById("app-form");
  const appIdField = document.getElementById("app-id");
  const nameInput = document.getElementById("app-name");
  const descInput = document.getElementById("app-desc");
  const shotRows = document.getElementById("shot-rows");
  const addShotBtn = document.getElementById("add-shot-btn");
  const shotsError = document.getElementById("shots-error");
  const versionInput = document.getElementById("app-version");
  const releaseInput = document.getElementById("app-release");
  const openInput = document.getElementById("app-open");
  const submitBtn = document.getElementById("submit-btn");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");
  const formHeading = document.getElementById("form-heading");

  const appList = document.getElementById("app-list");
  const manageSub = document.getElementById("manage-sub");
  const toastRoot = document.getElementById("toast-root");

  // ---------------- helpers ----------------

  function toast(message, type) {
    const el = document.createElement("div");
    el.className = "toast" + (type ? " " + type : "");
    el.textContent = message;
    toastRoot.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  function b64EncodeUnicode(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
  }

  function b64DecodeUnicode(b64) {
    const binary = atob(b64.replace(/\n/g, ""));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function setStatus(kind, text) {
    statusBanner.className = "status-banner " + kind;
    statusText.textContent = text;
  }

  function isValidUrl(value) {
    try {
      const u = new URL(value);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }

  // ---------------- GitHub API ----------------

  async function ghFetch(path, options = {}) {
    const res = await fetch("https://api.github.com" + path, {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: "Bearer " + state.token,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(options.headers || {}),
      },
    });
    return res;
  }

  async function detectBranch() {
    const res = await ghFetch(`/repos/${CONFIG.owner}/${CONFIG.repo}`);
    if (!res.ok) {
      if (res.status === 404) throw new Error(`Repo ${CONFIG.owner}/${CONFIG.repo} not found, or this token can't see it.`);
      if (res.status === 401) throw new Error("GitHub rejected this token (invalid or expired).");
      throw new Error(`GitHub error ${res.status} while checking the repo.`);
    }
    const data = await res.json();
    return data.default_branch || "main";
  }

  async function fetchAppsFile() {
    const branch = CONFIG.branch || state.branch;
    const res = await ghFetch(`/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${CONFIG.path}?ref=${branch}`);
    if (res.status === 404) {
      state.sha = null;
      return [];
    }
    if (!res.ok) {
      throw new Error(`Couldn't read ${CONFIG.path} (GitHub error ${res.status}).`);
    }
    const data = await res.json();
    state.sha = data.sha;
    const json = b64DecodeUnicode(data.content);
    try {
      const parsed = JSON.parse(json);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      throw new Error(`${CONFIG.path} exists but isn't valid JSON.`);
    }
  }

  async function commitAppsFile(apps, message) {
    const branch = CONFIG.branch || state.branch;
    const body = {
      message,
      content: b64EncodeUnicode(JSON.stringify(apps, null, 2)),
      branch,
    };
    if (state.sha) body.sha = state.sha;

    const res = await ghFetch(`/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${CONFIG.path}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      if (res.status === 409) throw new Error("Someone else published a change at the same time. Reloading the latest version — try again.");
      if (res.status === 403) throw new Error("This token doesn't have write access to the repo's contents.");
      throw new Error(errBody.message || `GitHub error ${res.status} while saving.`);
    }
    const data = await res.json();
    state.sha = data.content.sha;
  }

  // ---------------- local preview mode ----------------

  function loadLocalApps() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_APPS_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveLocalApps(apps) {
    localStorage.setItem(LOCAL_APPS_KEY, JSON.stringify(apps));
  }

  // ---------------- connection flow ----------------

  async function connectWithToken(token, remember) {
    state.token = token;
    connectBtn.disabled = true;
    connectBtn.textContent = "Connecting…";
    try {
      state.branch = await detectBranch();
      state.apps = await fetchAppsFile();
      state.mode = "github";
      if (remember) localStorage.setItem(TOKEN_SESSION_KEY, token);
      else sessionStorage.setItem(TOKEN_SESSION_KEY, token);
      enterDashboard();
    } catch (err) {
      tokenError.textContent = err.message;
      tokenError.style.display = "block";
      connectBtn.disabled = false;
      connectBtn.textContent = "Connect to GitHub";
    }
  }

  function enterLocalPreview() {
    state.mode = "local";
    state.token = null;
    state.apps = loadLocalApps();
    enterDashboard();
  }

  function enterDashboard() {
    lockScreen.hidden = true;
    dashboard.hidden = false;
    if (state.mode === "github") {
      setStatus("ok", `Connected to ${CONFIG.owner}/${CONFIG.repo} — publishing commits to apps.json.`);
    } else {
      setStatus("warn", "Local preview mode — changes are saved only in this browser and won't appear on the public site.");
    }
    resetForm();
    renderAppList();
  }

  function disconnect() {
    sessionStorage.removeItem(TOKEN_SESSION_KEY);
    localStorage.removeItem(TOKEN_SESSION_KEY);
    state.token = null;
    state.mode = null;
    state.sha = null;
    state.apps = [];
    dashboard.hidden = true;
    lockScreen.hidden = false;
    tokenInput.value = "";
    tokenError.style.display = "none";
  }

  connectBtn.addEventListener("click", () => {
    const token = tokenInput.value.trim();
    if (!token) {
      tokenError.textContent = "Enter a token to connect.";
      tokenError.style.display = "block";
      return;
    }
    tokenError.style.display = "none";
    connectWithToken(token, rememberCheckbox.checked);
  });

  tokenInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") connectBtn.click();
  });

  localPreviewBtn.addEventListener("click", enterLocalPreview);
  disconnectBtn.addEventListener("click", disconnect);

  // auto-reconnect if a token was remembered
  (function tryAutoConnect() {
    const saved = sessionStorage.getItem(TOKEN_SESSION_KEY) || localStorage.getItem(TOKEN_SESSION_KEY);
    if (saved) {
      tokenInput.value = saved;
      connectWithToken(saved, !!localStorage.getItem(TOKEN_SESSION_KEY));
    }
  })();

  // ---------------- screenshot rows ----------------

  function addShotRow(value = "") {
    const row = document.createElement("div");
    row.className = "shot-row";
    row.innerHTML = `
      <input type="url" placeholder="https://example.com/screenshot.png" value="${value ? value.replace(/"/g, "&quot;") : ""}" />
      <button type="button" class="shot-remove" aria-label="Remove screenshot">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
    `;
    row.querySelector(".shot-remove").addEventListener("click", () => {
      if (shotRows.children.length > 2) row.remove();
      else toast("At least 2 screenshots are required.", "err");
    });
    shotRows.appendChild(row);
  }

  addShotBtn.addEventListener("click", () => addShotRow());

  function getShotValues() {
    return Array.from(shotRows.querySelectorAll("input")).map((i) => i.value.trim());
  }

  // ---------------- form: validate / submit / edit / delete ----------------

  function clearFieldErrors() {
    document.querySelectorAll(".field").forEach((f) => f.classList.remove("has-error"));
    shotsError.style.display = "none";
  }

  function setFieldError(id) {
    const field = document.getElementById(id);
    if (field) field.classList.add("has-error");
  }

  function validateForm() {
    clearFieldErrors();
    let valid = true;

    if (!nameInput.value.trim()) {
      setFieldError("field-name");
      valid = false;
    }
    if (!versionInput.value.trim()) {
      setFieldError("field-version");
      valid = false;
    }

    const shots = getShotValues().filter(Boolean);
    const validShots = shots.filter(isValidUrl);
    if (validShots.length < 2) {
      setFieldError("field-shots");
      shotsError.textContent = shots.length < 2
        ? "Add at least 2 screenshot URLs."
        : "Some screenshot URLs look invalid — check they start with http(s)://.";
      shotsError.style.display = "block";
      valid = false;
    }

    if (releaseInput.value.trim() && !isValidUrl(releaseInput.value.trim())) {
      setFieldError("field-release");
      valid = false;
    }
    if (openInput.value.trim() && !isValidUrl(openInput.value.trim())) {
      setFieldError("field-open");
      valid = false;
    }

    return valid;
  }

  function resetForm() {
    state.editingId = null;
    appIdField.value = "";
    nameInput.value = "";
    descInput.value = "";
    versionInput.value = "";
    releaseInput.value = "";
    openInput.value = "";
    shotRows.innerHTML = "";
    addShotRow();
    addShotRow();
    clearFieldErrors();
    formHeading.textContent = "Upload new app";
    submitBtn.textContent = "Publish app";
    cancelEditBtn.hidden = true;
  }

  function populateFormForEdit(app) {
    state.editingId = app.id;
    appIdField.value = app.id;
    nameInput.value = app.name || "";
    descInput.value = app.description || "";
    versionInput.value = app.version || "";
    releaseInput.value = app.githubReleaseUrl || "";
    openInput.value = app.openUrl || "";
    shotRows.innerHTML = "";
    const shots = Array.isArray(app.screenshots) && app.screenshots.length ? app.screenshots : ["", ""];
    shots.forEach((s) => addShotRow(s));
    if (shotRows.children.length < 2) addShotRow();
    clearFieldErrors();
    formHeading.textContent = "Edit app";
    submitBtn.textContent = "Save changes";
    cancelEditBtn.hidden = false;
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  cancelEditBtn.addEventListener("click", resetForm);

  async function persistApps(message) {
    if (state.mode === "github") {
      await commitAppsFile(state.apps, message);
    } else {
      saveLocalApps(state.apps);
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      id: state.editingId || (Date.now().toString(36) + Math.random().toString(36).slice(2, 7)),
      name: nameInput.value.trim(),
      description: descInput.value.trim(),
      screenshots: getShotValues().filter(isValidUrl),
      version: versionInput.value.trim(),
      githubReleaseUrl: releaseInput.value.trim(),
      openUrl: openInput.value.trim(),
      createdAt: state.editingId
        ? (state.apps.find((a) => a.id === state.editingId) || {}).createdAt || Date.now()
        : Date.now(),
    };

    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.innerHTML = `<span class="spinner"></span> Publishing…`;

    try {
      if (state.editingId) {
        state.apps = state.apps.map((a) => (a.id === state.editingId ? payload : a));
      } else {
        state.apps.unshift(payload);
      }
      await persistApps(`${state.editingId ? "Update" : "Add"} app: ${payload.name}`);
      toast(state.editingId ? "App updated." : "App published.", "ok");
      resetForm();
      renderAppList();
    } catch (err) {
      toast(err.message || "Couldn't save changes.", "err");
      // re-sync with the source of truth in case of conflict
      if (state.mode === "github") {
        try {
          state.apps = await fetchAppsFile();
          renderAppList();
        } catch {}
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });

  async function deleteApp(id) {
    const app = state.apps.find((a) => a.id === id);
    if (!app) return;
    if (!confirm(`Delete "${app.name}"? This can't be undone.`)) return;

    const previous = state.apps;
    state.apps = state.apps.filter((a) => a.id !== id);
    try {
      await persistApps(`Delete app: ${app.name}`);
      toast("App deleted.", "ok");
      renderAppList();
      if (state.editingId === id) resetForm();
    } catch (err) {
      state.apps = previous;
      toast(err.message || "Couldn't delete the app.", "err");
    }
  }

  // ---------------- render manage list ----------------

  function renderAppList() {
    appList.innerHTML = "";
    if (!state.apps.length) {
      manageSub.textContent = "No apps published yet — use the form to add the first one.";
      return;
    }
    manageSub.textContent = `${state.apps.length} app${state.apps.length === 1 ? "" : "s"} published.`;

    state.apps.forEach((app) => {
      const row = document.createElement("div");
      row.className = "app-row";
      const shot = Array.isArray(app.screenshots) ? app.screenshots[0] : "";
      row.innerHTML = `
        ${shot ? `<img src="${shot}" alt="" onerror="this.style.visibility='hidden'">` : `<div class="app-row-noshot" style="width:52px;height:52px;border-radius:8px;background:var(--surface-2);flex:none;"></div>`}
        <div class="meta">
          <div class="name">${app.name}</div>
          <div class="ver">${app.version || ""}</div>
        </div>
        <div class="row-actions">
          <button class="icon-btn" data-action="edit" aria-label="Edit ${app.name}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>
          <button class="icon-btn danger" data-action="delete" aria-label="Delete ${app.name}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2m-1 0v14a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1V6"/></svg>
          </button>
        </div>
      `;
      row.querySelector('[data-action="edit"]').addEventListener("click", () => populateFormForEdit(app));
      row.querySelector('[data-action="delete"]').addEventListener("click", () => deleteApp(app.id));
      appList.appendChild(row);
    });
  }

  // init form rows even before connecting, so the lock screen -> dashboard swap is instant
  resetForm();
})();
