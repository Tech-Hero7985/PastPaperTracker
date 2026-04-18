// ── Force login on every page load ───────────────────────────────────────────
localStorage.removeItem("sb-kymqjecvcnmpnjcxfpuv-auth-token");

// ── Supabase ──────────────────────────────────────────────────────────────────
const { createClient } = supabase;
const sb = createClient(
  "https://kymqjecvcnmpnjcxfpuv.supabase.co",
  "sb_publishable_gtEiSZVEWFl_FAFFBG_XjQ_1MchKFyH"
);

let currentUser          = null;
let settingsTimer        = null;
let statusSaveTimer      = null;
let initializedForUserId = null;
let appBootstrapped      = false;

// ── Data ──────────────────────────────────────────────────────────────────────
const SUBJECT_PAPERS = {
  Mathematics: ["P1","P2","P3","P4","M1","M2","S1","S2"],
  Physics:     ["Unit 1","Unit 2","Unit 3","Unit 4","Unit 5","Unit 6"],
  Chemistry:   ["Unit 1","Unit 2","Unit 3","Unit 4","Unit 5","Unit 6"],
  Biology:     ["Unit 1","Unit 2","Unit 3","Unit 4","Unit 5","Unit 6"],
};
const SERIES         = ["January","May/June","October/November"];
const STATUS_OPTIONS = ["Not Done","In Progress","Done","Done + Reviewed"];

const THIS_YEAR  = new Date().getFullYear();
const MIN_YEAR   = 2010;
const MAX_YEAR   = THIS_YEAR;

// ── Storage keys ──────────────────────────────────────────────────────────────
const KEY_STATUS   = "ial-tracker-state";
const KEY_SETTINGS = "ial-tracker-settings";
const paperSelKey  = (s) => `ial-tracker-papers__${s}`;
const yearRangeKey = (s) => `ial-tracker-yearrange__${s}`;

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
const yearFromSel   = document.getElementById("year-from");
const yearToSel     = document.getElementById("year-to");
const chipGrid      = document.getElementById("chip-grid");
const pickAllBtn    = document.getElementById("pick-all");
const pickNoneBtn   = document.getElementById("pick-none");
const tracker       = document.getElementById("tracker");
const summary       = document.getElementById("summary");

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

// ── Populate year dropdowns ───────────────────────────────────────────────────
function populateYearSelects() {
  const years = [];
  for (let y = MAX_YEAR; y >= MIN_YEAR; y--) years.push(y);
  [yearFromSel, yearToSel].forEach((sel) => {
    sel.innerHTML = "";
    years.forEach((y) => {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      sel.appendChild(opt);
    });
  });
}

// ── Year range helpers ────────────────────────────────────────────────────────
function loadYearRange(subject) {
  try {
    const raw = localStorage.getItem(yearRangeKey(subject));
    if (raw) return JSON.parse(raw);
  } catch {}
  // Default: current year back 2 years
  return { from: THIS_YEAR - 2, to: THIS_YEAR };
}

function saveYearRange(subject, from, to) {
  localStorage.setItem(yearRangeKey(subject), JSON.stringify({ from, to }));
  debouncedSaveSettings();
}

function applyYearRange(subject) {
  const { from, to } = loadYearRange(subject);
  yearFromSel.value = from;
  yearToSel.value   = to;
  enforceRange();
}

// Make sure "from" never exceeds "to"
function enforceRange() {
  const from = parseInt(yearFromSel.value, 10);
  const to   = parseInt(yearToSel.value,   10);
  if (from > to) yearToSel.value = from;
  // Disable "to" options below "from"
  [...yearToSel.options].forEach((opt) => {
    opt.disabled = parseInt(opt.value, 10) < parseInt(yearFromSel.value, 10);
  });
  // Disable "from" options above "to"
  [...yearFromSel.options].forEach((opt) => {
    opt.disabled = parseInt(opt.value, 10) > parseInt(yearToSel.value, 10);
  });
}

function getYearsInRange() {
  const from = parseInt(yearFromSel.value, 10);
  const to   = parseInt(yearToSel.value,   10);
  const years = [];
  for (let y = to; y >= from; y--) years.push(y);
  return years;
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
  await sb.auth.signOut();
  localStorage.removeItem(KEY_STATUS);
  localStorage.removeItem(KEY_SETTINGS);
  Object.keys(SUBJECT_PAPERS).forEach((s) => {
    localStorage.removeItem(paperSelKey(s));
    localStorage.removeItem(yearRangeKey(s));
  });
});

// ── App show/hide ─────────────────────────────────────────────────────────────
function showApp()  { authOverlay.style.display = "none"; appEl.style.display = "block"; }
function showAuth() { authOverlay.style.display = "flex"; appEl.style.display = "none";  }

// ── Auth handlers ─────────────────────────────────────────────────────────────
async function handleSignedInUser(user, event = "INITIAL") {
  currentUser = user;
  if (initializedForUserId === currentUser.id && appBootstrapped && event !== "SIGNED_IN") return;
  initializedForUserId     = currentUser.id;
  userEmailEl.textContent  = currentUser.email || "";
  userAvatarEl.textContent = (currentUser.email?.[0] || "U").toUpperCase();
  showApp();
  await loadAllFromCloud();
  initApp();
  appBootstrapped = true;
}

function handleSignedOutUser() {
  currentUser = null; initializedForUserId = null; appBootstrapped = false;
  showAuth();
  tracker.innerHTML = ""; summary.innerHTML = "";
}

(async function bootstrapAuth() {
  const { data, error } = await sb.auth.getSession();
  if (error) { handleSignedOutUser(); return; }
  const user = data?.session?.user;
  if (user) await handleSignedInUser(user, "INITIAL");
  else      handleSignedOutUser();
})();

sb.auth.onAuthStateChange(async (event, session) => {
  if (session?.user) await handleSignedInUser(session.user, event);
  else               handleSignedOutUser();
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

    // Paper selections
    Object.keys(SUBJECT_PAPERS).forEach((subj) => {
      if (Array.isArray(sel[subj])) {
        localStorage.setItem(paperSelKey(subj), JSON.stringify(sel[subj]));
      }
    });

    // Year ranges stored under __yearranges__
    const ranges = sel.__yearranges__;
    if (ranges && typeof ranges === "object") {
      Object.entries(ranges).forEach(([subj, range]) => {
        localStorage.setItem(yearRangeKey(subj), JSON.stringify(range));
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
    user_id: currentUser.id, subject,
    year: parseInt(year, 10), series, paper, status,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,subject,year,series,paper" });
  if (error) console.error("saveStatusToCloud:", error);
}

function debouncedSaveStatus(key, status) {
  clearTimeout(statusSaveTimer);
  statusSaveTimer = setTimeout(() => saveStatusToCloud(key, status), 250);
}

// ── Cloud: save settings ──────────────────────────────────────────────────────
async function saveSettingsToCloud() {
  if (!currentUser) return;
  const paperSelections = {};
  Object.keys(SUBJECT_PAPERS).forEach((subj) => {
    const raw = localStorage.getItem(paperSelKey(subj));
    if (raw) try { paperSelections[subj] = JSON.parse(raw); } catch {}
  });
  // Store year ranges
  const yearranges = {};
  Object.keys(SUBJECT_PAPERS).forEach((subj) => {
    const raw = localStorage.getItem(yearRangeKey(subj));
    if (raw) try { yearranges[subj] = JSON.parse(raw); } catch {}
  });
  paperSelections.__yearranges__ = yearranges;

  const s = loadSettings();
  const range = loadYearRange(subjectSelect.value);
  await sb.from("user_settings").upsert({
    user_id:          currentUser.id,
    subject:          s?.subject || subjectSelect.value,
    years:            range.to - range.from + 1,
    paper_selections: paperSelections,
    updated_at:       new Date().toISOString(),
  }, { onConflict: "user_id" });
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

function saveActiveSubject() {
  localStorage.setItem(KEY_SETTINGS, JSON.stringify({ subject: subjectSelect.value }));
  debouncedSaveSettings();
}

// ── Paper picker ──────────────────────────────────────────────────────────────
function getSelectedPapers() {
  return [...chipGrid.querySelectorAll(".chip.active")].map((c) => c.dataset.paper);
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
  let total = 0;
  tracker.querySelectorAll("select.status").forEach((s) => {
    counts[s.value] += 1; total += 1;
  });
  const completed = counts["Done"] + counts["Done + Reviewed"];
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

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
  const subject = subjectSelect.value;
  const papers  = getSelectedPapers();
  const saved   = loadStatus();
  const years   = getYearsInRange();

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
    tracker.innerHTML = `<div class="empty-state">Please select a valid year range.</div>`;
    updateSummary(); return;
  }

  years.forEach((year, idx) => {
    const card       = document.createElement("article");
    card.className   = "year-card";
    card.style.animationDelay = `${idx * 0.06}s`;

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
        debouncedSaveStatus(sel.dataset.key, sel.value);
        updateSummary();
        updateYearProgress(card);
      });
    });

    updateYearProgress(card);
  });

  // Save this subject's range
  saveYearRange(subject, parseInt(yearFromSel.value, 10), parseInt(yearToSel.value, 10));
  saveActiveSubject();
  updateSummary();
}

// ── Subject change ────────────────────────────────────────────────────────────
function onSubjectChange() {
  const subject = subjectSelect.value;
  applyYearRange(subject);
  buildChips(subject);
  buildTracker();
}

// ── App init ──────────────────────────────────────────────────────────────────
function initApp() {
  populateYearSelects();

  if (subjectSelect.children.length === 0) {
    Object.keys(SUBJECT_PAPERS).forEach((subj) => {
      const opt = document.createElement("option");
      opt.value = subj; opt.textContent = subj;
      subjectSelect.appendChild(opt);
    });
  }

  // Restore last active subject
  const s             = loadSettings();
  const validSubjects = Object.keys(SUBJECT_PAPERS);
  subjectSelect.value = (s?.subject && SUBJECT_PAPERS[s.subject]) ? s.subject : validSubjects[0];

  // Wire events (only once)
  subjectSelect.onchange = onSubjectChange;

  yearFromSel.onchange = () => {
    enforceRange();
    buildTracker();
  };
  yearToSel.onchange = () => {
    enforceRange();
    buildTracker();
  };

  onSubjectChange();
}
