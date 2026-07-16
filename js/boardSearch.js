/** Initializes search inputs and buttons on page load. */
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("searchInput");
  const mobileInput = document.getElementById("searchInputMobile");
  const searchBtn = document.getElementById("searchButton");
  const searchBtnMobile = document.getElementById("searchButtonMobile");
  if (input) input.addEventListener("input", debounce(() => handleSearch("searchInput"), 300));
  if (mobileInput) mobileInput.addEventListener("input", debounce(() => handleSearch("searchInputMobile"), 300));
  if (searchBtn) searchBtn.addEventListener("click", () => handleSearch("searchInput"));
  if (searchBtnMobile) searchBtnMobile.addEventListener("click", () => handleSearch("searchInputMobile"));
});

/** Board columns used by search rendering. */
const SEARCH_BOARD_COLUMNS = [
  { id: "triageColumn", dragAreaId: "triageDragArea" },
  { id: "todoColumn", dragAreaId: "toDoDragArea" },
  { id: "inProgressColumn", dragAreaId: "inProgressDragArea" },
  { id: "awaitFeedbackColumn", dragAreaId: "awaitingFeedbackDragArea" },
  { id: "doneColumn", dragAreaId: "doneDragArea" },
];

/** Handles the search query and triggers task filtering. */
function handleSearch(inputId = "searchInput") {
  const query = document.getElementById(inputId)?.value.trim().toLowerCase();
  if (!query) return window.updateBoard?.();
  fetchFilteredTasks(query);
}

/** Fetches tasks from Firebase and filters them by search query. */
function fetchFilteredTasks(query) {
  authFetchUrl(getUserTasksUrl())
    .then((r) => parseJsonResponse(r))
    .then((data) => {
      const tasks = Object.entries(data || {}).map(([id, t]) => ({ ...t, id }));
      const result = tasks.filter(
        (t) =>
          t.title?.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query)
      );
      renderSearchResults(result);
    });
}

/**
 * Binds drag handlers for a board column after search render.
 * @param {string} columnId
 * @param {string} dragAreaId
 */
function bindSearchColumnDragHandlers(columnId, dragAreaId) {
  const column = document.getElementById(columnId);
  const dragArea = document.getElementById(dragAreaId);
  if (!column || !dragArea) return;
  column.ondrop = () => moveTo(columnId);
  column.ondragover = (e) => {
    allowDrop(e);
    highlight(dragAreaId);
  };
  column.ondragleave = () => removeHighlight(dragAreaId);
}

/**
 * Renders one column's filtered search results.
 * @param {{id:string,dragAreaId:string}} columnDef
 * @param {Array<object>} tasks
 */
function renderSearchColumn(columnDef, tasks) {
  const column = document.getElementById(columnDef.id);
  const columnTasks = tasks.filter((task) => task.column === columnDef.id);
  if (columnTasks.length === 0) {
    column.innerHTML = noTaskCardTemplate("found") + dragAreaTemplate(columnDef.dragAreaId);
  } else {
    column.innerHTML = columnTasks.map(taskCardTemplate).join("") + dragAreaTemplate(columnDef.dragAreaId);
  }
  bindSearchColumnDragHandlers(columnDef.id, columnDef.dragAreaId);
}

/** Renders filtered search results into their board columns. */
function renderSearchResults(tasks) {
  SEARCH_BOARD_COLUMNS.forEach((columnDef) => renderSearchColumn(columnDef, tasks));
}

/** Checks if columns are empty after filtering and updates display. */
function checkEmptyFiltered(tasks) {
  SEARCH_BOARD_COLUMNS.forEach(({ id, dragAreaId }) => {
    insertNoMatchCardIfEmpty(id, dragAreaId, tasks);
  });
}

/** Inserts a no-match card if a column has no matching tasks. */
function insertNoMatchCardIfEmpty(colId, dragAreaId, tasks) {
  const colEl = document.getElementById(colId);
  const dragArea = document.getElementById(dragAreaId);
  const hasTasks = tasks.some((t) => t.column === colId);
  if (hasTasks) return;
  colEl.innerHTML = noTaskCardTemplate("found");
  if (dragArea) colEl.appendChild(dragArea);
}

/** Delays execution of a function to limit rapid firing. */
function debounce(fn, delay) {
  let to;
  return (...a) => {
    clearTimeout(to);
    to = setTimeout(() => fn(...a), delay);
  };
}

/** Clears both search inputs and resets the board view. */
function clearSearchInput() {
  const input = document.getElementById("searchInput");
  const mobileInput = document.getElementById("searchInputMobile");
  if (input) input.value = "";
  if (mobileInput) mobileInput.value = "";
  handleSearch();
}
