// ── Supabase ──────────────────────────────────────────────────────────────────
const { createClient } = supabase;
const sb = createClient(
  "https://kymqjecvcnmpnjcxfpuv.supabase.co",
  "sb_publishable_gtEiSZVEWFl_FAFFBG_XjQ_1MchKFyH"
);

let currentUser   = null;
let settingsTimer = null;
let statusSaveTimer = null;

// ── Data ──────────────────────────────────────────────────────────────────────
const SUBJECT_PAPERS = {
  Mathematics: ["P1","P2","P3","P4","M1","M2","S1","S2"],
  Physics:     ["Unit 1","Unit 2","Unit 3","Unit 4","Unit 5","Unit 6"],
  Chemistry:   ["Unit 1","Unit 2","Unit 3","Unit 4","Unit 5","Unit 6"],
  Biology:     ["Unit 1","Unit 2","Unit 3","Unit 4","Unit 5","Unit 6"],
};
const SERIES         = ["January","May/June","October/November"];
const STATUS_OPTIONS = ["Not Done","In Progress","Done","Done + Reviewed"];
const THIS_YEAR      = new Date().getFullYear();
const MIN_YEAR       = 2010;

// ── Storage keys ──────────────────────────────────────────────────────────────
const KEY_STATUS      = "ial-tracker-state";
const KEY_SETTINGS    = "ial-tracker-settings";
const paperSelKey     = (s)    => `ial-tracker-papers__${s}`;
const yearsSelKey     = (s)    => `ial-tracker-yearslist__${s}`;
const seriesToggleKey = (s, y) => `ial-tracker-series-toggle__${s}__${y}`;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const authOverlay     = document.getElementById("auth-overlay");
const appEl           = document.getElementById("app");
const loginForm       = document.getElementById("login-form");
const signupForm      = document.getElementById("signup-form");
const authError       = document.getElementById("auth-error");
const authSuccess     = document.getElementById("auth-success");
const loginBtn        = document.getElementById("login-btn");
const signupBtn       = document.getElementById("signup-btn");
const logoutBtn       = document.getElementById("logout-btn");
const userEmailEl     = document.getElementById("user-email");
const userAvatarEl    = document.getElementById("user-avatar");
const subjectSelect   = document.getElementById("subject");
const yearPickerBtn   = document.getElementById("year-picker-btn");
const yearPickerPanel = document.getElementById("year-picker-panel");
const yearPickerLabel = document.getElementById("year-picker-label");
const yearChecklist   = document.getElementById("year-checklist");
const yearPickAll     = document.getElementById("year-pick-all");
const yearPickNone    = document.getElementById("year-pick-none");
const searchInput     = document.getElementById("search-input");
const searchClear     = document.getElementById("search-clear");
const chipGrid        = document.getElementById("chip-grid");
const pickAllBtn      = document.getElementById("pick-all");
const pickNoneBtn     = document.getElementById("pick-none");
const tracker         = document.getElementById("tracker");
const summary         = document.getElementById("summary");
const paperCounterVal = document.getElementById("paper-counter-val");
const lbBtn           = document.getElementById("lb-btn");
const lbOverlay       = document.getElementById("lb-overlay");
const lbClose         = document.getElementById("lb-close");
const lbList          = document.getElementById("lb-list");
const hamburger       = document.getElementById("hamburger");
const settingsPanel   = document.getElementById("settings-panel");

// ── Loading spinner ───────────────────────────────────────────────────────────
// Shown while auth resolves on page load — hides the flash of broken UI
const loader = document.createElement("div");
loader.id        = "auth-loader";
loader.innerHTML = `<span class="loader-spinner"></span>`;
document.body.appendChild(loader);

function hideLoader() { loader.style.display = "none"; }

// ── Toasts ────────────────────────────────────────────────────────────────────
const syncToast = document.createElement("div");
syncToast.className = "sync-toast";
syncToast.innerHTML = `<span class="sync-dot"></span>Saving…`;
document.body.appendChild(syncToast);
let syncToastTimer;
function showSyncToast() {
  clearTimeout(syncToastTimer);
  syncToast.classList.add("visible");
  syncToastTimer = setTimeout(() => syncToast.classList.remove("visible"), 1800);
}

const celebrateToast = document.createElement("div");
celebrateToast.className = "celebrate-toast";
document.body.appendChild(celebrateToast);
let celebrateTimer;
function showCelebration(msg) {
  clearTimeout(celebrateTimer);
  celebrateToast.textContent = msg;
  celebrateToast.classList.add("visible");
  celebrateTimer = setTimeout(() => celebrateToast.classList.remove("visible"), 3000);
}

// ── Hamburger ────────────────────────────────────────────────────────────────
hamburger.addEventListener("click", () => {
  hamburger.classList.toggle("open");
  settingsPanel.classList.toggle("open");
});

// ── Search ────────────────────────────────────────────────────────────────────
searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim();
  searchClear.style.display = q ? "block" : "none";
  applySearch(q);
});
searchClear.addEventListener("click", () => {
  searchInput.value = "";
  searchClear.style.display = "none";
  applySearch("");
});

function applySearch(q) {
  const term = q.toLowerCase();
  tracker.querySelectorAll(".year-card").forEach((card) => {
    let cardHasVisible = false;
    card.querySelectorAll("tbody tr").forEach((row) => {
      const series = row.closest(".series");
      if (series?.classList.contains("series-hidden")) return;
      const name = row.querySelector(".paper-name")?.textContent.toLowerCase() || "";
      const show = !term || name.includes(term);
      row.classList.toggle("row-hidden", !show);
      if (show) cardHasVisible = true;
    });
    card.classList.toggle("hidden", !!term && !cardHasVisible);
  });
  updateSummary();
}

// ── Year picker ───────────────────────────────────────────────────────────────
function buildYearChecklist(subject) {
  const saved = loadYearSelection(subject);
  yearChecklist.innerHTML = "";
  for (let y = THIS_YEAR; y >= MIN_YEAR; y--) {
    const checked = saved.includes(y);
    const item    = document.createElement("div");
    item.className    = "year-check-item" + (checked ? " checked" : "");
    item.dataset.year = y;
    item.innerHTML    = `<span class="year-checkbox">${checked ? "✓" : ""}</span>${y}`;
    item.addEventListener("click", () => {
      item.classList.toggle("checked");
      item.querySelector(".year-checkbox").textContent = item.classList.contains("checked") ? "✓" : "";
      saveYearSelection(subject, getCheckedYears());
      updateYearPickerLabel();
      buildTracker();
    });
    yearChecklist.appendChild(item);
  }
  updateYearPickerLabel();
}

function getCheckedYears() {
  return [...yearChecklist.querySelectorAll(".year-check-item.checked")]
    .map((el) => parseInt(el.dataset.year, 10));
}

function updateYearPickerLabel() {
  const checked = getCheckedYears();
  if (checked.length === 0) {
    yearPickerLabel.textContent = "No years selected";
    yearPickerLabel.classList.add("placeholder");
  } else if (checked.length === 1) {
    yearPickerLabel.textContent = String(checked[0]);
    yearPickerLabel.classList.remove("placeholder");
  } else {
    const sorted       = [...checked].sort((a,b) => a-b);
    const isContiguous = sorted.every((y,i) => i === 0 || y === sorted[i-1]+1);
    yearPickerLabel.textContent = isContiguous
      ? `${sorted[0]} – ${sorted[sorted.length-1]}`
      : `${checked.length} years`;
    yearPickerLabel.classList.remove("placeholder");
  }
}

yearPickerBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const isOpen = yearPickerPanel.classList.contains("open");
  yearPickerPanel.classList.toggle("open", !isOpen);
  yearPickerBtn.classList.toggle("open", !isOpen);
});

document.addEventListener("click", (e) => {
  if (!document.getElementById("year-picker").contains(e.target)) {
    yearPickerPanel.classList.remove("open");
    yearPickerBtn.classList.remove("open");
  }
});

yearPickAll.addEventListener("click", () => {
  yearChecklist.querySelectorAll(".year-check-item").forEach((el) => {
    el.classList.add("checked");
    el.querySelector(".year-checkbox").textContent = "✓";
  });
  saveYearSelection(subjectSelect.value, getCheckedYears());
  updateYearPickerLabel();
  buildTracker();
});

yearPickNone.addEventListener("click", () => {
  yearChecklist.querySelectorAll(".year-check-item").forEach((el) => {
    el.classList.remove("checked");
    el.querySelector(".year-checkbox").textContent = "";
  });
  saveYearSelection(subjectSelect.value, []);
  updateYearPickerLabel();
  buildTracker();
});

function loadYearSelection(subject) {
  try {
    const raw = localStorage.getItem(yearsSelKey(subject));
    if (raw) return JSON.parse(raw);
  } catch {}
  return [THIS_YEAR, THIS_YEAR - 1];
}

function saveYearSelection(subject, years) {
  localStorage.setItem(yearsSelKey(subject), JSON.stringify(years));
  debouncedSaveSettings();
}

// ── Series toggles ────────────────────────────────────────────────────────────
function loadSeriesToggle(subject, year) {
  try {
    const raw = localStorage.getItem(seriesToggleKey(subject, year));
    if (raw) return JSON.parse(raw);
  } catch {}
  return { "January": true, "May/June": true, "October/November": true };
}

function saveSeriesToggle(subject, year, toggles) {
  localStorage.setItem(seriesToggleKey(subject, year), JSON.stringify(toggles));
  debouncedSaveSettings();
}

// ── Series complete check ─────────────────────────────────────────────────────
function checkSeriesComplete(card, seriesName, year) {
  const section = card.querySelector(`.series[data-series="${seriesName}"]`);
  if (!section || section.classList.contains("series-hidden")) return;
  const selects = [...section.querySelectorAll("select.status")];
  if (selects.length === 0) return;
  const allDone = selects.every((s) => s.value === "Done" || s.value === "Done + Reviewed");
  if (allDone) showCelebration(`🔥 ${seriesName} ${year} complete!`);
}

// ── Auth UI ───────────────────────────────────────────────────────────────────
document.querySelectorAll(".auth-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".auth-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    const which = tab.dataset.tab;
    loginForm.style.display  = which === "login"  ? "flex" : "none";
    signupForm.style.display = which === "signup" ? "flex" : "none";
    hideAuthMsg();
  });
});

function showAuthError(msg)   { authError.textContent   = msg; authError.style.display   = "block"; authSuccess.style.display = "none"; }
function showAuthSuccess(msg) { authSuccess.textContent = msg; authSuccess.style.display = "block"; authError.style.display   = "none"; }
function hideAuthMsg()        { authError.style.display = "none"; authSuccess.style.display = "none"; }

function setBtnLoading(btn, loading, text) {
  btn.disabled = loading;
  btn.textContent = loading ? "Please wait…" : text;
}

// Google OAuth
document.getElementById("google-btn").addEventListener("click", async () => {
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options:  { redirectTo: "https://wadhwanimedia.me/" },
  });
  if (error) showAuthError("Google sign-in failed: " + error.message);
});

// Email login
loginBtn.addEventListener("click", async () => {
  const email    = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  if (!email || !password) return showAuthError("Please fill in all fields.");
  setBtnLoading(loginBtn, true, "Log In");
  const { error } = await sb.auth.signInWithPassword({ email, password });
  setBtnLoading(loginBtn, false, "Log In");
  if (error) showAuthError(error.message);
});

["login-email","login-password"].forEach((id) => {
  document.getElementById(id).addEventListener("keydown", (e) => {
    if (e.key === "Enter") loginBtn.click();
  });
});

// Signup
signupBtn.addEventListener("click", async () => {
  const name     = document.getElementById("signup-name").value.trim();
  const email    = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  if (!name || !email || !password) return showAuthError("Please fill in all fields.");
  if (password.length < 6) return showAuthError("Password must be at least 6 characters.");
  setBtnLoading(signupBtn, true, "Create Free Account");
  const { data, error } = await sb.auth.signUp({ email, password, options: { data: { display_name: name } } });
  setBtnLoading(signupBtn, false, "Create Free Account");
  if (error) showAuthError(error.message);
  else {
    if (data?.user) {
      await sb.from("leaderboard").upsert({
        user_id: data.user.id, display_name: name, papers_done: 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    }
    showAuthSuccess("Account created! You can now log in.");
  }
});

// Forgot password
document.getElementById("forgot-link").addEventListener("click", () => {
  loginForm.style.display  = "none";
  document.getElementById("reset-form").style.display = "flex";
  hideAuthMsg();
});

document.getElementById("back-to-login").addEventListener("click", () => {
  document.getElementById("reset-form").style.display = "none";
  loginForm.style.display = "flex";
  hideAuthMsg();
});

document.getElementById("reset-btn").addEventListener("click", async () => {
  const email = document.getElementById("reset-email").value.trim();
  if (!email) return showAuthError("Please enter your email.");
  setBtnLoading(document.getElementById("reset-btn"), true, "Send Reset Link");
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: "https://wadhwanimedia.me/",
  });
  setBtnLoading(document.getElementById("reset-btn"), false, "Send Reset Link");
  if (error) showAuthError(error.message);
  else showAuthSuccess("Reset link sent! Check your inbox.");
});

// Set new password
document.getElementById("new-password-btn").addEventListener("click", async () => {
  const newPass = document.getElementById("new-password-input").value;
  if (!newPass || newPass.length < 6) {
    document.getElementById("new-password-error").textContent   = "Password must be at least 6 characters.";
    document.getElementById("new-password-error").style.display = "block";
    return;
  }
  setBtnLoading(document.getElementById("new-password-btn"), true, "Update Password");
  const { error } = await sb.auth.updateUser({ password: newPass });
  setBtnLoading(document.getElementById("new-password-btn"), false, "Update Password");
  if (error) {
    document.getElementById("new-password-error").textContent   = error.message;
    document.getElementById("new-password-error").style.display = "block";
  } else {
    document.getElementById("new-password-success").textContent   = "Password updated! Logging you in…";
    document.getElementById("new-password-success").style.display = "block";
    setTimeout(() => {
      document.getElementById("new-password-overlay").style.display = "none";
    }, 1500);
  }
});

// Logout
logoutBtn.addEventListener("click", async () => {
  await sb.auth.signOut();
  localStorage.removeItem(KEY_STATUS);
  localStorage.removeItem(KEY_SETTINGS);
  Object.keys(SUBJECT_PAPERS).forEach((s) => {
    localStorage.removeItem(paperSelKey(s));
    localStorage.removeItem(yearsSelKey(s));
  });
});

// ── App show/hide ─────────────────────────────────────────────────────────────
function showApp() {
  hideLoader();
  authOverlay.style.display = "none";
  appEl.style.display       = "block";
}

function showAuth() {
  hideLoader();
  authOverlay.style.display = "flex";
  appEl.style.display       = "none";
}

// ── THE AUTH HANDLER — single source of truth ─────────────────────────────────
// We rely ONLY on onAuthStateChange. The INITIAL_SESSION event fires on every
// page load with the persisted session (or null). No IIFE, no race condition.
sb.auth.onAuthStateChange(async (event, session) => {

  // Password reset link clicked — show set-new-password modal
  if (event === "PASSWORD_RECOVERY") {
    hideLoader();
    authOverlay.style.display              = "none";
    document.getElementById("new-password-overlay").style.display = "flex";
    return;
  }

  // User is logged in (initial load with session OR fresh login)
  if (session?.user) {
    // Avoid re-initialising on token refresh or duplicate SIGNED_IN events
    if (currentUser?.id === session.user.id && appEl.style.display === "block") return;

    currentUser = session.user;
    userEmailEl.textContent  = currentUser.email || "";
    userAvatarEl.textContent = (
      currentUser.user_metadata?.display_name?.[0] ||
      currentUser.email?.[0] || "U"
    ).toUpperCase();

    // Load cloud data first, THEN show the app — no broken flash
    await loadAllFromCloud();
    showApp();
    initApp();
    return;
  }

  // No session — show login
  showAuth();
});

// ── Cloud: load ───────────────────────────────────────────────────────────────
async function loadAllFromCloud() {
  const { data: statuses } = await sb.from("paper_status").select("*");
  if (statuses) {
    const state = {};
    statuses.forEach((row) => {
      state[`${row.subject}__${row.year}__${row.series}__${row.paper}`] = row.status;
    });
    localStorage.setItem(KEY_STATUS, JSON.stringify(state));
  }

  const { data: settings } = await sb
    .from("user_settings").select("*")
    .eq("user_id", currentUser.id).maybeSingle();

  if (settings) {
    localStorage.setItem(KEY_SETTINGS, JSON.stringify({ subject: settings.subject }));
    const sel = settings.paper_selections || {};

    Object.keys(SUBJECT_PAPERS).forEach((subj) => {
      if (Array.isArray(sel[subj])) localStorage.setItem(paperSelKey(subj), JSON.stringify(sel[subj]));
    });

    const yearsMap = sel.__yearslist__;
    if (yearsMap) {
      Object.entries(yearsMap).forEach(([subj, yrs]) => {
        localStorage.setItem(yearsSelKey(subj), JSON.stringify(yrs));
      });
    }

    const seriesToggles = sel.__seriesToggles__;
    if (seriesToggles) {
      Object.entries(seriesToggles).forEach(([k, v]) => {
        localStorage.setItem(k, JSON.stringify(v));
      });
    }
  }
}

// ── Cloud: save status ────────────────────────────────────────────────────────
async function saveStatusToCloud(key, status) {
  if (!currentUser) return;
  showSyncToast();
  const [subject, year, series, paper] = key.split("__");
  const { error } = await sb.from("paper_status").upsert({
    user_id: currentUser.id, subject, year: parseInt(year,10), series, paper, status,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,subject,year,series,paper" });
  if (error) console.error("saveStatusToCloud:", error);
  updateLeaderboard();
}

function debouncedSaveStatus(key, status) {
  clearTimeout(statusSaveTimer);
  statusSaveTimer = setTimeout(() => saveStatusToCloud(key, status), 300);
}

// ── Cloud: save settings ──────────────────────────────────────────────────────
async function saveSettingsToCloud() {
  if (!currentUser) return;
  const paperSelections = {};
  Object.keys(SUBJECT_PAPERS).forEach((subj) => {
    const raw = localStorage.getItem(paperSelKey(subj));
    if (raw) try { paperSelections[subj] = JSON.parse(raw); } catch {}
  });
  const yearsMap = {};
  Object.keys(SUBJECT_PAPERS).forEach((subj) => {
    const raw = localStorage.getItem(yearsSelKey(subj));
    if (raw) try { yearsMap[subj] = JSON.parse(raw); } catch {}
  });
  paperSelections.__yearslist__ = yearsMap;

  const seriesToggles = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith("ial-tracker-series-toggle__")) {
      try { seriesToggles[k] = JSON.parse(localStorage.getItem(k)); } catch {}
    }
  }
  paperSelections.__seriesToggles__ = seriesToggles;

  const s = loadSettings();
  await sb.from("user_settings").upsert({
    user_id: currentUser.id,
    subject: s?.subject || subjectSelect.value,
    years: 0,
    paper_selections: paperSelections,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
}

function debouncedSaveSettings() {
  clearTimeout(settingsTimer);
  settingsTimer = setTimeout(saveSettingsToCloud, 1200);
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
lbBtn.addEventListener("click", openLeaderboard);
lbClose.addEventListener("click", () => { lbOverlay.style.display = "none"; });
lbOverlay.addEventListener("click", (e) => { if (e.target === lbOverlay) lbOverlay.style.display = "none"; });

async function openLeaderboard() {
  lbOverlay.style.display = "flex";
  lbList.innerHTML = `<div class="lb-loading">Loading…</div>`;
  const { data, error } = await sb
    .from("leaderboard").select("user_id, display_name, papers_done")
    .order("papers_done", { ascending: false }).limit(20);
  if (error || !data) { lbList.innerHTML = `<div class="lb-loading">Could not load leaderboard.</div>`; return; }
  if (data.length === 0) { lbList.innerHTML = `<div class="lb-loading">No entries yet — be the first!</div>`; return; }
  lbList.innerHTML = "";
  data.forEach((row, i) => {
    const rank  = i + 1;
    const isMe  = row.user_id === currentUser?.id;
    const div   = document.createElement("div");
    div.className = "lb-row" + (isMe ? " lb-me" : "");
    const rankClass = rank === 1 ? "rank-1" : rank === 2 ? "rank-2" : rank === 3 ? "rank-3" : "rank-other";
    const rankIcon  = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
    div.innerHTML = `
      <span class="lb-rank ${rankClass}">${rankIcon}</span>
      <span class="lb-name">${row.display_name}${isMe ? '<span class="you-tag">you</span>' : ""}</span>
      <span class="lb-score">${row.papers_done}<span class="lb-score-label"> done</span></span>`;
    lbList.appendChild(div);
  });
}

async function updateLeaderboard() {
  if (!currentUser) return;
  const state = loadStatus();
  const total = Object.values(state).filter((v) => v === "Done" || v === "Done + Reviewed").length;
  const name  = currentUser.user_metadata?.display_name || currentUser.email?.split("@")[0] || "Anonymous";
  await sb.from("leaderboard").upsert({
    user_id: currentUser.id, display_name: name, papers_done: total,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (paperCounterVal) paperCounterVal.textContent = total;
}

function refreshPaperCounter() {
  const state = loadStatus();
  const total = Object.values(state).filter((v) => v === "Done" || v === "Done + Reviewed").length;
  if (paperCounterVal) paperCounterVal.textContent = total;
}

// ── localStorage helpers ──────────────────────────────────────────────────────
function loadStatus() {
  try { return JSON.parse(localStorage.getItem(KEY_STATUS)) || {}; }
  catch { return {}; }
}

function saveStatusLocal() {
  const existing = loadStatus();
  const updates  = {};
  tracker.querySelectorAll("select.status").forEach((s) => { updates[s.dataset.key] = s.value; });
  localStorage.setItem(KEY_STATUS, JSON.stringify({ ...existing, ...updates }));
}

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(KEY_SETTINGS)); }
  catch { return null; }
}

function saveActiveSubject() {
  localStorage.setItem(KEY_SETTINGS, JSON.stringify({ subject: subjectSelect.value }));
  debouncedSaveSettings();
}

function loadPaperSelection(subject) {
  try {
    const raw = localStorage.getItem(paperSelKey(subject));
    if (raw) return JSON.parse(raw);
  } catch {}
  return [...SUBJECT_PAPERS[subject]];
}

function savePaperSelection(subject, selected) {
  localStorage.setItem(paperSelKey(subject), JSON.stringify(selected));
  debouncedSaveSettings();
}

// ── Paper chips ───────────────────────────────────────────────────────────────
function getSelectedPapers() {
  return [...chipGrid.querySelectorAll(".chip.active")].map((c) => c.dataset.paper);
}

function buildChips(subject) {
  if (!SUBJECT_PAPERS[subject]) { chipGrid.innerHTML = ""; return; }
  const saved = loadPaperSelection(subject);
  chipGrid.innerHTML = "";
  SUBJECT_PAPERS[subject].forEach((paper) => {
    const chip = document.createElement("button");
    chip.type  = "button";
    chip.className   = "chip" + (saved.includes(paper) ? " active" : "");
    chip.dataset.paper = paper;
    chip.innerHTML   = `<span class="chip-check">✓</span>${paper}`;
    chip.addEventListener("click", () => {
      chip.classList.toggle("active");
      savePaperSelection(subject, getSelectedPapers());
      buildTracker();
    });
    chipGrid.appendChild(chip);
  });
}

pickAllBtn.addEventListener("click", () => {
  const subject = subjectSelect.value;
  chipGrid.querySelectorAll(".chip").forEach((c) => c.classList.add("active"));
  savePaperSelection(subject, [...SUBJECT_PAPERS[subject]]);
  buildTracker();
});
pickNoneBtn.addEventListener("click", () => {
  const subject = subjectSelect.value;
  chipGrid.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
  savePaperSelection(subject, []);
  buildTracker();
});

// ── Summary ───────────────────────────────────────────────────────────────────
function updateSummary() {
  const counts = STATUS_OPTIONS.reduce((a, v) => ({ ...a, [v]: 0 }), {});
  let total = 0;
  tracker.querySelectorAll("select.status").forEach((sel) => {
    const row    = sel.closest("tr");
    const series = sel.closest(".series");
    if (row?.classList.contains("row-hidden")) return;
    if (series?.classList.contains("series-hidden")) return;
    counts[sel.value]++; total++;
  });
  const completed = counts["Done"] + counts["Done + Reviewed"];
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const badges = STATUS_OPTIONS.map(
    (v) => `<span class="badge" data-status="${v}">${v} <strong>${counts[v]}</strong></span>`
  ).join("");

  const bar = `
    <div class="summary-progress">
      <div class="summary-progress-track">
        <div class="summary-progress-fill" style="width:${pct}%"></div>
      </div>
      <span class="summary-progress-label">${pct}% complete</span>
    </div>`;

  summary.innerHTML = badges + bar;
}

// ── Year card progress ────────────────────────────────────────────────────────
function updateYearProgress(card) {
  const selects = [...card.querySelectorAll("select.status")].filter((sel) => {
    const series = sel.closest(".series");
    return series && !series.classList.contains("series-hidden");
  });
  const done  = selects.filter((s) => s.value === "Done" || s.value === "Done + Reviewed").length;
  const pct   = selects.length ? Math.round((done / selects.length) * 100) : 0;
  const fill  = card.querySelector(".year-progress-fill");
  const label = card.querySelector(".year-progress-label");
  if (fill)  fill.style.width  = pct + "%";
  if (label) label.textContent = `${done}/${selects.length} done`;
}

// ── Tracker builder ───────────────────────────────────────────────────────────
function buildTracker() {
  const subject = subjectSelect.value;
  const papers  = getSelectedPapers();
  const years   = getCheckedYears().sort((a,b) => b - a);
  const saved   = loadStatus();

  tracker.innerHTML = "";

  if (!SUBJECT_PAPERS[subject]) {
    tracker.innerHTML = `<div class="empty-state">Please select a subject above.</div>`;
    updateSummary(); return;
  }
  if (papers.length === 0) {
    tracker.innerHTML = `<div class="empty-state">No papers selected — pick at least one above to start tracking.</div>`;
    updateSummary(); return;
  }
  if (years.length === 0) {
    tracker.innerHTML = `<div class="empty-state">No years selected — choose years from the dropdown above.</div>`;
    updateSummary(); return;
  }

  years.forEach((year, idx) => {
    const toggles = loadSeriesToggle(subject, year);
    const card    = document.createElement("article");
    card.className = "year-card";
    card.style.animationDelay = `${idx * 0.05}s`;

    const header = document.createElement("div");
    header.className = "year-card-header";
    const togglesHtml = SERIES.map((s) => `
      <button type="button" class="series-toggle${toggles[s] === false ? " disabled" : ""}" data-series="${s}" title="Toggle ${s}">
        <span class="series-toggle-dot"></span>${s === "October/November" ? "Oct/Nov" : s}
      </button>`).join("");

    header.innerHTML = `
      <h2 class="year-title">${subject} &mdash; <span>${year}</span></h2>
      <div class="series-toggles">${togglesHtml}</div>
      <div class="year-progress-wrap">
        <span class="year-progress-label">0 done</span>
        <div class="year-progress-bar"><div class="year-progress-fill"></div></div>
      </div>`;
    card.appendChild(header);

    header.querySelectorAll(".series-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const s       = btn.dataset.series;
        const enabled = btn.classList.contains("disabled");
        btn.classList.toggle("disabled", !enabled);
        const newToggles = loadSeriesToggle(subject, year);
        newToggles[s] = enabled;
        saveSeriesToggle(subject, year, newToggles);
        const section = card.querySelector(`.series[data-series="${s}"]`);
        if (section) section.classList.toggle("series-hidden", !enabled);
        updateYearProgress(card);
        updateSummary();
      });
    });

    const body = document.createElement("div");
    body.className = "year-body";

    SERIES.forEach((seriesName) => {
      const isHidden = toggles[seriesName] === false;
      const section  = document.createElement("section");
      section.className      = "series" + (isHidden ? " series-hidden" : "");
      section.dataset.series = seriesName;
      section.innerHTML = `
        <div class="series-header">
          <span class="series-dot"></span>
          <span class="series-name">${seriesName}</span>
        </div>`;

      const wrap  = document.createElement("div");
      wrap.className = "series-table-wrap";
      const table = document.createElement("table");
      const tbody = document.createElement("tbody");

      papers.forEach((paper) => {
        const key   = `${subject}__${year}__${seriesName}__${paper}`;
        const value = saved[key] || "Not Done";
        const tr    = document.createElement("tr");
        tr.innerHTML = `
          <td class="paper-name">${paper}</td>
          <td class="status-cell">
            <select class="status" data-key="${key}" data-status="${value}"
              aria-label="${year} ${seriesName} ${paper} status">
              ${STATUS_OPTIONS.map((s) =>
                `<option value="${s}"${s === value ? " selected" : ""}>${s}</option>`
              ).join("")}
            </select>
          </td>`;
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      wrap.appendChild(table);
      section.appendChild(wrap);
      body.appendChild(section);
    });

    card.appendChild(body);
    tracker.appendChild(card);

    card.querySelectorAll("select.status").forEach((sel) => {
      sel.addEventListener("change", () => {
        sel.dataset.status = sel.value;
        saveStatusLocal();
        debouncedSaveStatus(sel.dataset.key, sel.value);
        const [,yr, seriesName] = sel.dataset.key.split("__");
        checkSeriesComplete(card, seriesName, yr);
        updateSummary();
        updateYearProgress(card);
        refreshPaperCounter();
      });
    });

    updateYearProgress(card);
  });

  const q = searchInput.value.trim();
  if (q) applySearch(q);

  saveActiveSubject();
  updateSummary();
}

// ── Subject change ────────────────────────────────────────────────────────────
function onSubjectChange() {
  const subject = subjectSelect.value;
  buildYearChecklist(subject);
  buildChips(subject);
  buildTracker();
}

// ── App init — called once after cloud data is loaded ─────────────────────────
function initApp() {
  if (subjectSelect.children.length === 0) {
    Object.keys(SUBJECT_PAPERS).forEach((subj) => {
      const opt = document.createElement("option");
      opt.value = subj; opt.textContent = subj;
      subjectSelect.appendChild(opt);
    });
    subjectSelect.addEventListener("change", onSubjectChange);
  }

  const s             = loadSettings();
  const validSubjects = Object.keys(SUBJECT_PAPERS);
  subjectSelect.value = (s?.subject && SUBJECT_PAPERS[s.subject]) ? s.subject : validSubjects[0];

  refreshPaperCounter();
  onSubjectChange();
}
