/**
 * Handles outside clicks for the category options dropdown.
 * Closes category options when click happens outside.
 * @param {MouseEvent} event - The click event.
 */
function handleCategoryOptionsOutsideClick(event) {
  const opts = document.getElementById("categoryOptions");
  const input = document.getElementById("taskCategory");
  if (!opts || !opts.classList.contains("active")) return;

  const clickedInsideOpts = opts.contains(event.target);
  const clickedInput = input && input.contains(event.target);

  if (!clickedInsideOpts && !clickedInput) {
    opts.classList.add("display-none");
    opts.classList.remove("active");
  }
}

/**
 * Handles outside clicks for the assignee options list.
 * @param {MouseEvent} event - The click event.
 */
function handleAssigneeOptionsOutsideClick(event) {
  const assigneeOptions = document.getElementById("assigneeOptions");
  if (assigneeOptions && assigneeOptions.classList.contains("active")) {
    if (
      !assigneeOptions.contains(event.target) &&
      event.target.id !== "taskAssignee"
    ) {
      assigneeOptions.classList.add("display-none");
      assigneeOptions.classList.remove("active");
    }
  }
}

/**
 * Handles outside clicks for the subtask input area.
 * Hides controls and validation state when clicking outside.
 * @param {MouseEvent} event - The click event.
 */
function handleSubtaskInputOutsideClick(event) {
  const inputFeld = document.getElementById("inputBox");
  const addCancelBtns = document.getElementById("addCancelBtns");
  const HINT_MESSAGE_DIV = document.getElementById("subtaskHintMessage");

  if (inputFeld && !inputFeld.contains(event.target)) {
    addCancelBtns?.classList.add("display-none");
    HINT_MESSAGE_DIV?.classList.add("display-none");
    inputFeld.classList.remove("correct-me");
  }
}

/**
 * Delegates global outside clicks to all section handlers.
 * @param {MouseEvent} event - The click event.
 */
function handleOutsideClick(event) {
  handleCategoryOptionsOutsideClick(event);
  handleAssigneeOptionsOutsideClick(event);
  handleSubtaskInputOutsideClick(event);
}

/**
 * Opens the add-task overlay and initializes its content.
 * @param {string} columnId - Board column id for the new task.
 */
async function addTaskOverlay(columnId) {
  renderAddTaskOverlayContent(columnId);
  showOverlay();
  activateOverlayAnimation();
  if (typeof loadAndRenderContacts === "function") {
    await loadAndRenderContacts();
  }
}

/**
 * Renders the Add Task overlay HTML content.
 * @param {string} columnId - Board column id.
 */
function renderAddTaskOverlayContent(columnId) {
  OVERLAY_CONTENT.innerHTML = addTaskOverlayForm(columnId);
  OVERLAY_CONTENT.classList.add("add-task");
}

/** Shows the overlay container. */
function showOverlay() { OVERLAY.classList.remove("display-none"); }

/** Adds entry animation to the overlay content. */
function activateOverlayAnimation() { setTimeout(() => OVERLAY_CONTENT.classList.add("active"), 10); }

/** Hides all validation error messages for required inputs. */
function hideValidationErrors() {
  document
    .querySelectorAll(".required-span")
    .forEach((span) => span.classList.add("display-none"));
  document
    .querySelectorAll(".requierd-input")
    .forEach((input) => input.classList.remove("correct-me"));
}

/** Shows all validation error messages for required inputs. */
function showValidationErrors() {
  document
    .querySelectorAll(".required-span")
    .forEach((span) => span.classList.remove("display-none"));
  document
    .querySelectorAll(".requierd-input")
    .forEach((input) => input.classList.add("correct-me"));
}

/**
 * Sets the active priority button by given priority.
 * @param {('high'|'medium'|'low')} priority - Target priority.
 */
function priorityHandler(priority) {
  const buttons = document.querySelectorAll(".priority-button, .edit-priority-button");
  const map = { high: "HighPriority", medium: "MidPriority", low: "LowPriority" };
  buttons.forEach((b) => b.classList.remove("active"));
  buttons.forEach((b) => { if (b.classList.contains(map[priority])) b.classList.add("active"); });
}

/**
 * Toggles the category options dropdown visibility.
 * @returns {void}
 */
function toggleCategoryOptions() {
  const opts = document.getElementById("categoryOptions");
  if (!opts) return;
  opts.classList.toggle("display-none");
  opts.classList.toggle("active");
}

/**
 * Selects a category, updates the input, and closes the dropdown.
 * @param {string} category - Selected category label.
 */
function selectCategory(category) {
  const input = document.getElementById("taskCategory");
  const opts = document.getElementById("categoryOptions");
  if (!input) return;

  input.textContent = category;
  input.classList.add("selected");
  opts?.classList.add("display-none");
  opts?.classList.remove("active");
}

// Add event listener for outside clicks to close dropdowns
document.addEventListener('click', handleOutsideClick);

/** Injects the Add Task form into the dedicated page container. */
async function addTaskForm() {
  const form = document.getElementById("addTaskSeite");
  form.innerHTML = addTaskOverlayForm("triageColumn", 'Clear');

  const closeBtn = document.getElementById("closeOverlayBtn");
  if (closeBtn) closeBtn.classList.add("display-none");
  if (typeof loadAndRenderContacts === "function") {
    await loadAndRenderContacts();
  }
}

/**
 * Initializes the add-task page including header initials.
 * @returns {Promise<void>}
 */
async function initAddTaskPage() {
  await init();
  const user = await waitForAuthUser();
  if (!user) return;
  syncSessionFromUser(user);
  await setUserInitials();
  await addTaskForm();
}

window.initAddTaskPage = initAddTaskPage;

/**
 * Opens the native date picker for a date input (triggered by the calendar icon).
 * @param {string} inputId
 * @param {Event} [event]
 */
function openDatePicker(inputId, event) {
  event?.preventDefault();
  event?.stopPropagation();

  const input = document.getElementById(inputId);
  if (!input) return;

  prepareDateInput(input);
  if (tryShowNativeDatePicker(input)) return;
  input.click();
}

/**
 * Sets the minimum date and focuses the input.
 * @param {HTMLInputElement} input
 */
function prepareDateInput(input) {
  input.min = new Date().toISOString().split("T")[0];
  input.focus();
}

/**
 * Tries to open native date picker API.
 * @param {HTMLInputElement} input
 * @returns {boolean} True if native picker was opened.
 */
function tryShowNativeDatePicker(input) {
  try {
    if (typeof input.showPicker !== "function") return false;
    input.showPicker();
    return true;
  } catch (_) {
    return false;
  }
}

window.openDatePicker = openDatePicker;
