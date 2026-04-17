const SUBJECT_PAPERS = {
  Mathematics: ["P1", "P2", "P3", "P4", "M1", "M2", "S1", "S2"],
  Physics: ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5", "Unit 6"],
  Chemistry: ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5", "Unit 6"],
  Biology: ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5", "Unit 6"],
};

const SERIES = ["January", "May/June", "October/November"];
const STATUS_OPTIONS = ["Not Done", "In Progress", "Done", "Done + Reviewed"];
const STORAGE_KEY = "ial-tracker-state";

const subjectSelect = document.getElementById("subject");
const yearsInput    = document.getElementById("years");
const generateBtn   = document.getElementById("generate");
const tracker       = document.getElementById("tracker");
const summary       = document.getElementById("summary");

// ── Persistence ──────────────────────────────────────────────────────────────

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}

function saveState() {
  const state = {};
  tracker.querySelectorAll("select.status").forEach((s) => {
    state[s.dataset.key] = s.value;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadSettings() {
  try { return JSON.parse(localStorage.getItem("ial-tracker-settings")); }
  catch { return null; }
}

function saveSettings() {
  localStorage.setItem(
    "ial-tracker-settings",
    JSON.stringify({ subject: subjectSelect.value, years: yearsInput.value })
  );
}

// ── UI helpers ───────────────────────────────────────────────────────────────

function buildSubjectOptions() {
  Object.keys(SUBJECT_PAPERS).forEach((subject) => {
    const opt = document.createElement("option");
    opt.value = subject;
    opt.textContent = subject;
    subjectSelect.appendChild(opt);
  });
}

function currentYears(count) {
  const thisYear = new Date().getFullYear();
  return Array.from({ length: count }, (_, i) => thisYear - i);
}

function applyStatusStyle(select) {
  select.dataset.status = select.value;
}

function updateYearProgress(yearCard) {
  const selects = yearCard.querySelectorAll("select.status");
  const done = [...selects].filter(
    (s) => s.value === "Done" || s.value === "Done + Reviewed"
  ).length;
  const pct = selects.length ? Math.round((done / selects.length) * 100) : 0;
  const fill  = yearCard.querySelector(".year-progress-fill");
  const label = yearCard.querySelector(".year-progress-label");
  if (fill)  fill.style.width  = pct + "%";
  if (label) label.textContent = `${done}/${selects.length} done`;
}

function updateSummary() {
  const counts = STATUS_OPTIONS.reduce((a, v) => ({ ...a, [v]: 0 }), {});
  tracker.querySelectorAll("select.status").forEach((s) => {
    counts[s.value] += 1;
  });
  summary.innerHTML = STATUS_OPTIONS.map(
    (v) => `<span class="badge" data-status="${v}">${v} <strong>${counts[v]}</strong></span>`
  ).join("");
}

// ── Core builder ─────────────────────────────────────────────────────────────

function buildTracker() {
  const raw   = Number.parseInt(yearsInput.value, 10);
  const count = Number.isNaN(raw) ? 1 : Math.min(Math.max(raw, 1), 12);
  const subject = subjectSelect.value;
  const papers  = SUBJECT_PAPERS[subject];
  const saved   = loadState();

  tracker.innerHTML = "";

  currentYears(count).forEach((year, cardIndex) => {
    const card = document.createElement("article");
    card.className = "year-card";
    card.style.animationDelay = `${cardIndex * 0.07}s`;

    const header = document.createElement("div");
    header.className = "year-card-header";
    header.innerHTML = `
      <h2 class="year-title">${subject} &mdash; <span>${year}</span></h2>
      <div class="year-progress-wrap">
        <span class="year-progress-label">0 done</span>
        <div class="year-progress-bar">
          <div class="year-progress-fill"></div>
        </div>
      </div>`;
    card.appendChild(header);

    const body = document.createElement("div");
    body.className = "year-body";

    SERIES.forEach((seriesName) => {
      const section = document.createElement("section");
      section.className = "series";

      const title = document.createElement("p");
      title.className = "series-title";
      title.textContent = seriesName;
      section.appendChild(title);

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
      section.appendChild(table);
      body.appendChild(section);
    });

    card.appendChild(body);
    tracker.appendChild(card);

    card.querySelectorAll("select.status").forEach((sel) => {
      sel.addEventListener("change", () => {
        applyStatusStyle(sel);
        saveState();
        updateSummary();
        updateYearProgress(card);
      });
    });

    updateYearProgress(card);
  });

  saveSettings();
  updateSummary();
}

// ── Init ─────────────────────────────────────────────────────────────────────

buildSubjectOptions();

const settings = loadSettings();
if (settings) {
  subjectSelect.value = settings.subject;
  yearsInput.value    = settings.years;
}

generateBtn.addEventListener("click", buildTracker);
buildTracker();
