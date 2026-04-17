const SUBJECT_PAPERS = {
  Mathematics: ["P1", "P2", "P3", "P4", "M1", "M2", "S1", "S2"],
  Physics: ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5", "Unit 6"],
  Chemistry: ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5", "Unit 6"],
  Biology: ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5", "Unit 6"],
};

const SERIES = ["January", "May/June", "October/November"];
const STATUS_OPTIONS = ["Not Done", "In Progress", "Done", "Done + Reviewed"];
const STORAGE_KEY = "pastPaperTrackerStateV1";
const DEFAULT_SUBJECT = "Mathematics";

const subjectSelect = document.getElementById("subject");
const yearsInput = document.getElementById("years");
const generateButton = document.getElementById("generate");
const tracker = document.getElementById("tracker");
const summary = document.getElementById("summary");

const trackerState = loadState();

function buildSubjectOptions() {
  Object.keys(SUBJECT_PAPERS).forEach((subject) => {
    const option = document.createElement("option");
    option.value = subject;
    option.textContent = subject;
    subjectSelect.appendChild(option);
  });
}

function currentYears(count) {
  const thisYear = new Date().getFullYear();
  return Array.from({ length: count }, (_, index) => thisYear - index);
}

function normalizeYears(value) {
  const years = Number.parseInt(value, 10);
  if (Number.isNaN(years)) {
    return 2;
  }

  return Math.min(Math.max(years, 1), 12);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        subject: DEFAULT_SUBJECT,
        years: 2,
        statuses: {},
      };
    }

    const parsed = JSON.parse(raw);
    const safeSubject = Object.hasOwn(SUBJECT_PAPERS, parsed.subject)
      ? parsed.subject
      : DEFAULT_SUBJECT;

    return {
      subject: safeSubject,
      years: normalizeYears(parsed.years),
      statuses: parsed.statuses && typeof parsed.statuses === "object" ? parsed.statuses : {},
    };
  } catch {
    return {
      subject: DEFAULT_SUBJECT,
      years: 2,
      statuses: {},
    };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trackerState));
}

function statusKey(subject, year, seriesName, paper) {
  return `${subject}|${year}|${seriesName}|${paper}`;
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
  const safeYearCount = normalizeYears(yearsInput.value);
  const subject = subjectSelect.value;
  const papers = SUBJECT_PAPERS[subject];

  trackerState.subject = subject;
  trackerState.years = safeYearCount;
  yearsInput.value = safeYearCount;
  saveState();

  tracker.innerHTML = "";

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
                <select class="status" data-status-key="${statusKey(subject, year, seriesName, paper)}" aria-label="${year} ${seriesName} ${paper} status">
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
    const key = select.dataset.statusKey;
    const savedStatus = trackerState.statuses[key];
    if (STATUS_OPTIONS.includes(savedStatus)) {
      select.value = savedStatus;
    }

    select.addEventListener("change", (event) => {
      trackerState.statuses[key] = event.target.value;
      saveState();
      updateSummary();
    });
  });

  updateSummary();
}

buildSubjectOptions();
subjectSelect.value = trackerState.subject;
yearsInput.value = trackerState.years;
generateButton.addEventListener("click", buildTracker);
buildTracker();
