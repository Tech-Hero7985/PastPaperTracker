const SUBJECT_PAPERS = {
  Mathematics: ["P1", "P2", "P3", "P4", "M1", "M2", "S1", "S2"],
  Physics: ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5", "Unit 6"],
  Chemistry: ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5", "Unit 6"],
  Biology: ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5", "Unit 6"],
};

const SERIES = ["January", "May/June", "October/November"];
const STATUS_OPTIONS = ["Not Done", "In Progress", "Done", "Done + Reviewed"];
const STORAGE_KEY = "pastPaperTrackerState.v1";

const subjectSelect = document.getElementById("subject");
const yearsInput = document.getElementById("years");
const generateButton = document.getElementById("generate");
const tracker = document.getElementById("tracker");
const summary = document.getElementById("summary");
const settingsButton = document.getElementById("settingsButton");
const closeSettingsButton = document.getElementById("closeSettings");
const settingsDialog = document.getElementById("settingsDialog");
const paperSettings = document.getElementById("paperSettings");
const themeToggle = document.getElementById("themeToggle");

const defaultSubject = Object.keys(SUBJECT_PAPERS)[0];
const state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        subject: defaultSubject,
        years: 2,
        theme: "dark",
        visiblePapers: {},
        statuses: {},
      };
    }

    const parsed = JSON.parse(raw);
    return {
      subject: parsed.subject || defaultSubject,
      years: Number.isFinite(parsed.years) ? parsed.years : 2,
      theme: parsed.theme === "light" ? "light" : "dark",
      visiblePapers: parsed.visiblePapers || {},
      statuses: parsed.statuses || {},
    };
  } catch {
    return {
      subject: defaultSubject,
      years: 2,
      theme: "dark",
      visiblePapers: {},
      statuses: {},
    };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getVisiblePapers(subject) {
  const allPapers = SUBJECT_PAPERS[subject];
  const selected = state.visiblePapers[subject];
  return Array.isArray(selected) && selected.length ? selected : [...allPapers];
}

function statusKey({ subject, year, series, paper }) {
  return `${subject}|${year}|${series}|${paper}`;
}

function buildSubjectOptions() {
  subjectSelect.innerHTML = "";
  Object.keys(SUBJECT_PAPERS).forEach((subject) => {
    const option = document.createElement("option");
    option.value = subject;
    option.textContent = subject;
    option.selected = subject === state.subject;
    subjectSelect.appendChild(option);
  });
}

function currentYears(count) {
  const thisYear = new Date().getFullYear();
  return Array.from({ length: count }, (_, index) => thisYear - index);
}

function updateSummary() {
  const counts = STATUS_OPTIONS.reduce((acc, value) => ({ ...acc, [value]: 0 }), {});
  tracker.querySelectorAll("select.status").forEach((select) => {
    counts[select.value] += 1;
  });

  summary.innerHTML = STATUS_OPTIONS.map(
    (value) => `<span class="badge">${value}: ${counts[value]}</span>`
  ).join("");
}

function buildTracker() {
  const yearsToTrack = Number.parseInt(yearsInput.value, 10);
  const safeYearCount = Number.isNaN(yearsToTrack) ? 1 : Math.min(Math.max(yearsToTrack, 1), 12);
  const subject = subjectSelect.value;
  const papers = getVisiblePapers(subject);

  state.subject = subject;
  state.years = safeYearCount;
  saveState();

  tracker.innerHTML = "";
  summary.innerHTML = "";

  if (!papers.length) {
    tracker.innerHTML = `
      <article class="empty-state">
        <h2>No papers selected</h2>
        <p>Open settings and select at least one paper to show in the tracker.</p>
      </article>
    `;
    return;
  }

  currentYears(safeYearCount).forEach((year) => {
    const yearCard = document.createElement("article");
    yearCard.className = "year-card";
    yearCard.innerHTML = `<h2>${subject} - ${year}</h2>`;

    SERIES.forEach((seriesName) => {
      const section = document.createElement("section");
      section.className = "series";

      const table = document.createElement("table");
      table.innerHTML = `
        <thead>
          <tr>
            <th>Series: ${seriesName}</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${papers
            .map(
              (paper) => `
            <tr>
              <td>${paper}</td>
              <td>
                <select class="status" aria-label="${year} ${seriesName} ${paper} status" data-year="${year}" data-series="${seriesName}" data-paper="${paper}" data-subject="${subject}">
                  ${STATUS_OPTIONS.map((status) => `<option value="${status}">${status}</option>`).join("")}
                </select>
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      `;

      section.appendChild(table);
      yearCard.appendChild(section);
    });

    tracker.appendChild(yearCard);
  });

  tracker.querySelectorAll("select.status").forEach((select) => {
    const key = statusKey({
      subject: select.dataset.subject,
      year: select.dataset.year,
      series: select.dataset.series,
      paper: select.dataset.paper,
    });
    const savedStatus = state.statuses[key];
    if (savedStatus && STATUS_OPTIONS.includes(savedStatus)) {
      select.value = savedStatus;
    }

    select.addEventListener("change", () => {
      state.statuses[key] = select.value;
      saveState();
      updateSummary();
    });
  });

  updateSummary();
}

function buildPaperSettings() {
  const subject = subjectSelect.value;
  const allPapers = SUBJECT_PAPERS[subject];
  const selectedPapers = new Set(getVisiblePapers(subject));

  paperSettings.innerHTML = allPapers
    .map(
      (paper) => `
        <label class="paper-option">
          <input type="checkbox" value="${paper}" ${selectedPapers.has(paper) ? "checked" : ""} />
          <span>${paper}</span>
        </label>
      `
    )
    .join("");

  paperSettings.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const checkedPapers = [...paperSettings.querySelectorAll('input[type="checkbox"]:checked')].map(
        (input) => input.value
      );
      state.visiblePapers[subject] = checkedPapers;
      saveState();
      buildTracker();
    });
  });
}

function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  themeToggle.textContent = theme === "dark" ? "🌞" : "🌙";
  saveState();
}

buildSubjectOptions();
yearsInput.value = state.years;
generateButton.addEventListener("click", buildTracker);
subjectSelect.addEventListener("change", () => {
  buildPaperSettings();
  buildTracker();
});
yearsInput.addEventListener("change", buildTracker);

settingsButton.addEventListener("click", () => {
  buildPaperSettings();
  settingsDialog.showModal();
});

closeSettingsButton.addEventListener("click", () => {
  settingsDialog.close();
});

themeToggle.addEventListener("click", () => {
  applyTheme(state.theme === "dark" ? "light" : "dark");
});

if (typeof settingsDialog.addEventListener === "function") {
  settingsDialog.addEventListener("click", (event) => {
    const dialogDimensions = settingsDialog.getBoundingClientRect();
    const clickedInDialog =
      event.clientX >= dialogDimensions.left &&
      event.clientX <= dialogDimensions.right &&
      event.clientY >= dialogDimensions.top &&
      event.clientY <= dialogDimensions.bottom;
    if (!clickedInDialog) {
      settingsDialog.close();
    }
  });
}

applyTheme(state.theme);
buildPaperSettings();
buildTracker();
