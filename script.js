const SUBJECT_PAPERS = {
  Mathematics: ["P1", "P2", "P3", "P4", "M1", "M2", "S1", "S2"],
  Physics: ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5", "Unit 6"],
  Chemistry: ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5", "Unit 6"],
  Biology: ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5", "Unit 6"],
};

const SERIES = ["January", "May/June", "October/November"];
const STATUS_OPTIONS = ["Not Done", "In Progress", "Done", "Done + Reviewed"];

const subjectSelect = document.getElementById("subject");
const yearsInput = document.getElementById("years");
const generateButton = document.getElementById("generate");
const tracker = document.getElementById("tracker");
const summary = document.getElementById("summary");

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

function updateSummary() {
  const counts = STATUS_OPTIONS.reduce((acc, value) => ({ ...acc, [value]: 0 }), {});
  tracker.querySelectorAll("select.status").forEach((select) => {
    counts[select.value] += 1;
  });

  summary.innerHTML = "";
  STATUS_OPTIONS.forEach((value) => {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = `${value}: ${counts[value]}`;
    summary.appendChild(badge);
  });
}

function createStatusSelect(year, seriesName, paper) {
  const select = document.createElement("select");
  select.className = "status";
  select.setAttribute("aria-label", `${year} ${seriesName} ${paper} status`);

  STATUS_OPTIONS.forEach((status) => {
    const option = document.createElement("option");
    option.value = status;
    option.textContent = status;
    select.appendChild(option);
  });

  return select;
}

function buildTracker() {
  const yearsToTrack = Number.parseInt(yearsInput.value, 10);
  const safeYearCount = Number.isNaN(yearsToTrack) ? 1 : Math.min(Math.max(yearsToTrack, 1), 12);
  const subject = subjectSelect.value;
  const papers = SUBJECT_PAPERS[subject];

  tracker.innerHTML = "";

  currentYears(safeYearCount).forEach((year) => {
    const yearCard = document.createElement("article");
    yearCard.className = "year-card";
    const heading = document.createElement("h2");
    heading.textContent = `${subject} - ${year}`;
    yearCard.appendChild(heading);

    SERIES.forEach((seriesName) => {
      const section = document.createElement("section");
      section.className = "series";

      const table = document.createElement("table");
      const tableHead = document.createElement("thead");
      const headerRow = document.createElement("tr");
      const seriesHeader = document.createElement("th");
      const statusHeader = document.createElement("th");
      seriesHeader.textContent = `Series: ${seriesName}`;
      statusHeader.textContent = "Status";
      headerRow.appendChild(seriesHeader);
      headerRow.appendChild(statusHeader);
      tableHead.appendChild(headerRow);

      const tableBody = document.createElement("tbody");
      papers.forEach((paper) => {
        const row = document.createElement("tr");
        const paperCell = document.createElement("td");
        const statusCell = document.createElement("td");
        paperCell.textContent = paper;
        statusCell.appendChild(createStatusSelect(year, seriesName, paper));
        row.appendChild(paperCell);
        row.appendChild(statusCell);
        tableBody.appendChild(row);
      });

      table.appendChild(tableHead);
      table.appendChild(tableBody);

      section.appendChild(table);
      yearCard.appendChild(section);
    });

    tracker.appendChild(yearCard);
  });

  tracker.querySelectorAll("select.status").forEach((select) => {
    select.addEventListener("change", updateSummary);
  });

  updateSummary();
}

buildSubjectOptions();
generateButton.addEventListener("click", buildTracker);
buildTracker();
