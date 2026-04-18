// ── Supabase ──────────────────────────────────────────────────────────────────
const { createClient } = supabase;
const sb = createClient(
  "https://kymqjecvcnmpnjcxfpuv.supabase.co",
  "sb_publishable_gtEiSZVEWFl_FAFFBG_XjQ_1MchKFyH"
);

let currentUser    = null;
let settingsTimer  = null;
let appInitialized = false;

// ── Data ──────────────────────────────────────────────────────────────────────
const SUBJECT_PAPERS = {
  Mathematics: ["P1","P2","P3","P4","M1","M2","S1","S2"],
  Physics:     ["Unit 1","Unit 2","Unit 3","Unit 4","Unit 5","Unit 6"],
  Chemistry:   ["Unit 1","Unit 2","Unit 3","Unit 4","Unit 5","Unit 6"],
  Biology:     ["Unit 1","Unit 2","Unit 3","Unit 4","Unit 5","Unit 6"],
};
const SERIES         = ["January","May/June","October/November"];
const STATUS_OPTIONS = ["Not Done","In Progress","Done","Done + Reviewed"];

// ── Storage keys ──────────────────────────────────────────────────────────────
const KEY_STATUS   = "ial-tracker-state";
const KEY_SETTINGS = "ial-tracker-settings";
const paperSelKey  = (s) => `ial-tracker-papers__${s}`;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const authOverlay   = document.getElementById("auth-overlay");
const appEl         = document.getElementById("app");
const loginForm     = document.getElementById("login-form");
const signupForm    = document.getElementById("signup-form");
const authError     = document.getElementById("auth-error");
const authSuccess   = document.getElementById("auth-success");
const loginBtn      = document.getElementById("login-btn");
const signupBtn     = document.getElementById("signup-btn");
const logoutBtn     = document.getElementById("logout-btn");
const userEmailEl   = document.getElementById("user-email");
const userAvatarEl  = document.getElementById("user-avatar");
const subjectSelect = document.getElementById("subject");
const yearsInput    = document.getElementById("years");
const chipGrid      = document.getElementById("chip-grid");
const pickAllBtn    = document.getElementById("pick-all");
const pickNoneBtn   = document.getElementById("pick-none");
const tracker       = document.getElementById("tracker");
const summary       = document.getElementById("summary");

// ── Loading spinner (shown while auth resolves on refresh) ────────────────────
const loader = document.createElement("div");
loader.id        = "auth-loader";
loader.innerHTML = `<span class="loader-spinner"></span>`;
document.body.appendChild(loader);

// ── Sync toast ────────────────────────────────────────────────────────────────
const toast = document.createElement("div");
toast.className = "sync-toast";
toast.innerHTML = `<span class="sync-dot"></span>Saving…`;
document.body.appendChild(toast);
let toastTimer;

function showToast() {
  clearTimeout(toastTimer);
  toast.classList.add("visible");
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 1800);
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
  btn.disabled    = loading;
  btn.textContent = loading ? "Please wait…" : text;
}

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

signupBtn.addEventListener("click", async () => {
  const email    = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  if (!email || !password) return showAuthError("Please fill in all fields.");
  if (password.length < 6)  return showAuthError("Password must be at least 6 characters.");
  setBtnLoading(signupBtn, true, "Create Free Account");
  const { error } = await sb.auth.signUp({ email, password });
  setBtnLoading(signupBtn, false, "Create Free Account");
  if (error) showAuthError(error.message);
  else       showAuthSuccess("Account created! You can now log in.");
});

logoutBtn.addEventListener("click", async () => {
  appInitialized = false;
  await sb.auth.signOut();
  // Clear local cache on explicit logout
  localStorage.removeItem(KEY_STATUS);
  localStorage.removeItem(KEY_SETTINGS);
  Object.keys(SUBJECT_PAPERS).forEach((s) => localStorage.removeItem(paperSelKey(s)));
});

// ── App show/hide ─────────────────────────────────────────────────────────────
function showApp() {
  loader.style.display       = "none";
  authOverlay.style.display  = "none";
  appEl.style.display        = "block";
}

function showAuth() {
  loader.style.display       = "none";
  authOverlay.style.display  = "flex";
  appEl.style.display        = "none";
}

// ── Auth state — single source of truth ───────────────────────────────────────
// INITIAL_SESSION fires on every page load with the persisted session (or null).
// SIGNED_IN fires when the user actually logs in.
// SIGNED_OUT fires on logout or session expiry.
sb.auth.onAuthStateChange(async (event, session) => {
  if (event === "SIGNED_OUT") {
    currentUser    = null;
    appInitialized = false;
    tracker.innerHTML = "";
    summary.innerHTML = "";
    showAuth();
    return;
  }

  // Handle both initial page load (INITIAL_SESSION) and fresh logins (SIGNED_IN)
  if ((event === "INITIAL_SESSION" || event === "SIGNED_IN") && session?.user) {
    // Don't re-initialise if this is a token refresh or duplicate event
    if (appInitialized && event !== "SIGNED_IN") return;

    currentUser = session.user;
    userEmailEl.textContent  = currentUser.email;
    userAvatarEl.textContent = (currentUser.email?.[0] ?? "U").toUpperCase();

    showApp();

    await loadAllFromCloud();
    initApp();
    appInitialized = true;
    return;
  }

  // No session on initial load → show login
  if (event === "INITIAL_SESSION" && !session) {
    showAuth();
  }
});

// ── Cloud: load all data ──────────────────────────────────────────────────────
async function loadAllFromCloud() {
  const { data: statuses } = await sb.from("paper_status").select("*");
  if (statuses?.length) {
    const state = {};
    statuses.forEach((row) => {
      state[`${row.subject}__${row.year}__${row.series}__${row.paper}`] = row.status;
    });
    localStorage.setItem(KEY_STATUS, JSON.stringify(state));
  }

  const { data: settings } = await sb
    .from("user_settings")
    .select("*")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (settings) {
    localStorage.setItem(KEY_SETTINGS, JSON.stringify({
      subject: settings.subject,
      years:   settings.years,
    }));
    if (settings.paper_selections) {
      Object.entries(settings.paper_selections).forEach(([subj, papers]) => {
        localStorage.setItem(paperSelKey(subj), JSON.stringify(papers));
      });
    }
  }
}

// ── Cloud: save status ────────────────────────────────────────────────────────
async function saveStatusToCloud(key, status) {
  if (!currentUser) return;
  showToast();
  const [subject, year, series, paper] = key.split("__");
  const { error } = await sb.from("paper_status").upsert({
    user_id: currentUser.id,
    subject,
    year:    parseInt(year, 10),
    series,
    paper,
    status,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,subject,year,series,paper" });
  if (error) console.error("saveStatusToCloud:", error);
}

// ── Cloud: save settings (debounced) ─────────────────────────────────────────
async function saveSettingsToCloud() {
  if (!currentUser) return;
  const paperSelections = {};
  Object.keys(SUBJECT_PAPERS).forEach((subj) => {
    try {
      const raw = localStorage.getItem(paperSelKey(subj));
      if (raw) paperSelections[subj] = JSON.parse(raw);
    } catch {}
  });
  const s = loadSettings();
  const { error } = await sb.from("user_settings").upsert({
    user_id:          currentUser.id,
    subject:          s?.subject || subjectSelect.value,
    years:            parseInt(s?.years || yearsInput.value, 10),
    paper_selections: paperSelections,
    updated_at:       new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) console.error("saveSettingsToCloud:", error);
}

function debouncedSaveSettings() {
  clearTimeout(settingsTimer);
  settingsTimer = setTimeout(saveSettingsToCloud, 1200);
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

function saveSettings() {
  localStorage.setItem(KEY_SETTINGS, JSON.stringify({
    subject: subjectSelect.value,
    years:   yearsInput.value,
  }));
  debouncedSaveSettings();
}

function loadPaperSelection(subject) {
  try {
    const raw = localStorage.getItem(paperSelKey(subject));
    if (raw) return JSON.parse(raw);
  } catch {}
  return [...SUBJECT_PAPERS[subject]]; // default: all
}

function savePaperSelection(subject, selected) {
  localStorage.setItem(paperSelKey(subject), JSON.stringify(selected));
  debouncedSaveSettings();
}

// ── Paper picker ──────────────────────────────────────────────────────────────
function getSelectedPapers() {
  return [...chipGrid.querySelectorAll(".chip.active")].map((c) => c.dataset.paper);
}

function buildChips(subject) {
  if (!SUBJECT_PAPERS[subject]) { chipGrid.innerHTML = ""; return; }
  const saved = loadPaperSelection(subject);
  chipGrid.innerHTML = "";
  SUBJECT_PAPERS[subject].forEach((paper) => {
    const chip         = document.createElement("button");
    chip.type          = "button";
    chip.className     = "chip" + (saved.includes(paper) ? " active" : "");
    chip.dataset.paper = paper;
    chip.innerHTML     = `<span class="chip-check">✓</span>${paper}`;
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
  tracker.querySelectorAll("select.status").forEach((s) => { counts[s.value] += 1; });
  summary.innerHTML = STATUS_OPTIONS.map(
    (v) => `<span class="badge" data-status="${v}">${v} <strong>${counts[v]}</strong></span>`
  ).join("");
}

// ── Year progress ─────────────────────────────────────────────────────────────
function updateYearProgress(card) {
  const selects = card.querySelectorAll("select.status");
  const done    = [...selects].filter((s) => s.value === "Done" || s.value === "Done + Reviewed").length;
  const pct     = selects.length ? Math.round((done / selects.length) * 100) : 0;
  const fill    = card.querySelector(".year-progress-fill");
  const label   = card.querySelector(".year-progress-label");
  if (fill)  fill.style.width  = pct + "%";
  if (label) label.textContent = `${done}/${selects.length} done`;
}

// ── Tracker builder ───────────────────────────────────────────────────────────
function buildTracker() {
  const raw     = Number.parseInt(yearsInput.value, 10);
  const count   = Number.isNaN(raw) ? 1 : Math.min(Math.max(raw, 1), 12);
  const subject = subjectSelect.value;
  const papers  = getSelectedPapers();
  const saved   = loadStatus();

  tracker.innerHTML = "";

  if (!subject || !SUBJECT_PAPERS[subject]) {
    tracker.innerHTML = `<div class="empty-state">Please select a subject above.</div>`;
    updateSummary();
    return;
  }

  if (papers.length === 0) {
    tracker.innerHTML = `<div class="empty-state">No papers selected — pick at least one above to start tracking.</div>`;
    updateSummary();
    return;
  }

  const years = Array.from({ length: count }, (_, i) => new Date().getFullYear() - i);

  years.forEach((year, idx) => {
    const card       = document.createElement("article");
    card.className   = "year-card";
    card.style.animationDelay = `${idx * 0.07}s`;

    const header = document.createElement("div");
    header.className = "year-card-header";
    header.innerHTML = `
      <h2 class="year-title">${subject} &mdash; <span>${year}</span></h2>
      <div class="year-progress-wrap">
        <span class="year-progress-label">0 done</span>
        <div class="year-progress-bar"><div class="year-progress-fill"></div></div>
      </div>`;
    card.appendChild(header);

    const body     = document.createElement("div");
    body.className = "year-body";

    SERIES.forEach((seriesName) => {
      const section          = document.createElement("section");
      section.className      = "series";
      section.dataset.series = seriesName;
      section.innerHTML      = `
        <div class="series-header">
          <span class="series-dot"></span>
          <span class="series-name">${seriesName}</span>
        </div>`;

      const wrap     = document.createElement("div");
      wrap.className = "series-table-wrap";
      const table    = document.createElement("table");
      const tbody    = document.createElement("tbody");

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
        saveStatusToCloud(sel.dataset.key, sel.value);
        updateSummary();
        updateYearProgress(card);
      });
    });

    updateYearProgress(card);
  });

  saveSettings();
  updateSummary();
}

// ── Subject/years change ──────────────────────────────────────────────────────
function onSubjectChange() {
  buildChips(subjectSelect.value);
  buildTracker();
}

// ── App init — called once after cloud data is loaded ─────────────────────────
function initApp() {
  // Populate subject dropdown only once
  if (subjectSelect.children.length === 0) {
    Object.keys(SUBJECT_PAPERS).forEach((subj) => {
      const opt       = document.createElement("option");
      opt.value       = subj;
      opt.textContent = subj;
      subjectSelect.appendChild(opt);
    });
    subjectSelect.addEventListener("change", onSubjectChange);
    yearsInput.addEventListener("change", buildTracker);
    yearsInput.addEventListener("input",  buildTracker);
  }

  // Restore last settings (cloud data already written to localStorage by loadAllFromCloud)
  const s              = loadSettings();
  const validSubjects  = Object.keys(SUBJECT_PAPERS);
  const savedSubject   = s?.subject && SUBJECT_PAPERS[s.subject] ? s.subject : validSubjects[0];
  const savedYears     = Number.parseInt(s?.years, 10);

  subjectSelect.value = savedSubject;
  yearsInput.value    = Number.isNaN(savedYears) ? 2 : Math.min(Math.max(savedYears, 1), 12);

  onSubjectChange();
}
