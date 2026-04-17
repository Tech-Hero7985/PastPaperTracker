// ── Data ──────────────────────────────────────────────────────────────────────

const SUBJECT_PAPERS = {
  Mathematics: ["P1", "P2", "P3", "P4", "M1", "M2", "S1", "S2"],
  Physics:     ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5", "Unit 6"],
  Chemistry:   ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5", "Unit 6"],
  Biology:     ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5", "Unit 6"],
};

const SERIES = ["January", "May/June", "October/November"];
const STATUS_OPTIONS = ["Not Done", "In Progress", "Done", "Done + Reviewed"];

// ── Storage keys ──────────────────────────────────────────────────────────────

const KEY_STATUS   = "ial-tracker-state";
const KEY_SETTINGS = "ial-tracker-settings";
const paperSelKey  = (subject) => `ial-tracker-papers__${subject}`;

// ── DOM refs ──────────────────────────────────────────────────────────────────

const subjectSelect = document.getElementById("subject");
const yearsInput    = document.getElementById("years");
const chipGrid      = document.getElementById("chip-grid");
const pickAllBtn    = document.getElementById("pick-all");
const pickNoneBtn   = document.getElementById("pick-none");
const tracker       = document.getElementById("tracker");
const summary       = document.getElementById("summary");

// ── Persistence helpers ───────────────────────────────────────────────────────

function loadStatus() {
  try { return JSON.parse(localStorage.getItem(KEY_STATUS)) || {}; }
  catch { return {}; }
}

function saveStatus() {
  const state = {};
  tracker.querySelectorAll("select.status").forEach((s) => {
    state[s.dataset.key] = s.value;
  });
  // Merge with existing (so other subjects aren't wiped)
  const existing = loadStatus();
  localStorage.setItem(KEY_STATUS, JSON.stringify({ ...existing, ...state }));
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
}

/** Returns the saved paper selection for a subject, defaulting to ALL papers */
function loadPaperSelection(subject) {
  try {
    const raw = localStorage.getItem(paperSelKey(subject));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  // Default: all papers selected
  return [...SUBJECT_PAPERS[subject]];
}

function savePaperSelection(subject, selected) {
  localStorage.setItem(paperSelKey(subject), JSON.stringify(selected));
}

// ── Paper picker ──────────────────────────────────────────────────────────────

function getSelectedPapers() {
  return [...chipGrid.querySelectorAll(".chip.active")].map((c) => c.dataset.paper);
}

function buildChips(subject) {
  const allPapers = SUBJECT_PAPERS[subject];
  const saved     = loadPaperSelection(subject);

  chipGrid.innerHTML = "";

  allPapers.forEach((paper) => {
    const chip = document.createElement("button");
    chip.type          = "button";
    chip.className     = "chip" + (saved.includes(paper) ? " active" : "");
    chip.dataset.paper = paper;
    chip.innerHTML     = `<span class="chip-check">✓</span>${paper}`;

    chip.addEventListener("click", () => {
      chip.classList.toggle("active");
      const sel = getSelectedPapers();
      savePaperSelection(subject, sel);
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
  tracker.querySelectorAll("select.status").forEach((s) => {
    counts[s.value] += 1;
  });
  summary.innerHTML = STATUS_OPTIONS.map(
    (v) => `<span class="badge" data-status="${v}">${v} <strong>${counts[v]}</strong></span>`
  ).join("");
}

// ── Year card progress ────────────────────────────────────────────────────────

function updateYearProgress(card) {
  const selects = card.querySelectorAll("select.status");
  const done    = [...selects].filter(
    (s) => s.value === "Done" || s.value === "Done + Reviewed"
  ).length;
  const pct   = selects.length ? Math.round((done / selects.length) * 100) : 0;
  const fill  = card.querySelector(".year-progress-fill");
  const label = card.querySelector(".year-progress-label");
  if (fill)  fill.style.width  = pct + "%";
  if (label) label.textContent = `${done}/${selects.length} done`;
}

// ── Main tracker builder ──────────────────────────────────────────────────────

function buildTracker() {
  const raw     = Number.parseInt(yearsInput.value, 10);
  const count   = Number.isNaN(raw) ? 1 : Math.min(Math.max(raw, 1), 12);
  const subject = subjectSelect.value;
  const papers  = getSelectedPapers();
  const saved   = loadStatus();

  tracker.innerHTML = "";

  if (papers.length === 0) {
    tracker.innerHTML = `<div class="empty-state">No papers selected — pick at least one above to start tracking.</div>`;
    updateSummary();
    return;
  }

  const years = Array.from({ length: count }, (_, i) => new Date().getFullYear() - i);

  years.forEach((year, cardIdx) => {
    const card = document.createElement("article");
    card.className = "year-card";
    card.style.animationDelay = `${cardIdx * 0.07}s`;

    // Header
    const header = document.createElement("div");
    header.className = "year-card-header";
    header.innerHTML = `
      <h2 class="year-title">${subject} &mdash; <span>${year}</span></h2>
      <div class="year-progress-wrap">
        <span class="year-progress-label">0 done</span>
        <div class="year-progress-bar"><div class="year-progress-fill"></div></div>
      </div>`;
    card.appendChild(header);

    // Series columns
    const body = document.createElement("div");
    body.className = "year-body";

    SERIES.forEach((seriesName) => {
      const section = document.createElement("section");
      section.className = "series";
      section.dataset.series = seriesName;

      // Visible series header
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

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="paper-name">${paper}</td>
          <td class="status-cell">
            <select
              class="status"
              data-key="${key}"
              data-status="${value}"
              aria-label="${year} ${seriesName} ${paper} status"
            >
              ${STATUS_OPTIONS.map(
                (s) => `<option value="${s}"${s === value ? " selected" : ""}>${s}</option>`
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

    // Events
    card.querySelectorAll("select.status").forEach((sel) => {
      sel.addEventListener("change", () => {
        sel.dataset.status = sel.value;
        saveStatus();
        updateSummary();
        updateYearProgress(card);
      });
    });

    updateYearProgress(card);
  });

  saveSettings();
  updateSummary();
}

// ── Subject change: rebuild chips + tracker ───────────────────────────────────

function onSubjectChange() {
  buildChips(subjectSelect.value);
  buildTracker();
}

// ── Init ──────────────────────────────────────────────────────────────────────

// Populate subject dropdown
Object.keys(SUBJECT_PAPERS).forEach((subject) => {
  const opt = document.createElement("option");
  opt.value = subject;
  opt.textContent = subject;
  subjectSelect.appendChild(opt);
});

// Restore last settings
const settings = loadSettings();
if (settings) {
  if (settings.subject && SUBJECT_PAPERS[settings.subject]) {
    subjectSelect.value = settings.subject;
  }
  if (settings.years) {
    yearsInput.value = settings.years;
  }
}

subjectSelect.addEventListener("change", onSubjectChange);
yearsInput.addEventListener("change", buildTracker);
yearsInput.addEventListener("input",  buildTracker);

// First render
onSubjectChange();
