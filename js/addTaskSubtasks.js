/**
 * Adds a subtask when pressing Enter on the target input.
 * @param {KeyboardEvent} event
 * @param {string} inputId
 */
function onEnterAddSubTask(event, inputId) {
  if (event.key !== "Enter") return;
  event.preventDefault();
  addSubtask(inputId);
}

/**
 * Saves an edited subtask on Enter or binds Enter-save to an input.
 * @param {KeyboardEvent|HTMLInputElement} eventOrInput
 * @param {HTMLInputElement} [inputEl]
 */
function onEnterEditSubTask(eventOrInput, inputEl) {
  if (eventOrInput?.key === "Enter") {
    submitEditedSubtask(eventOrInput, eventOrInput.target);
    return;
  }
  bindEnterSave(inputEl || eventOrInput);
}

/**
 * Binds Enter handling once to an inline edit input.
 * @param {HTMLInputElement} input
 */
function bindEnterSave(input) {
  if (!input || typeof input.addEventListener !== "function") return;
  if (input.dataset.enterBound === "1") return;
  input.dataset.enterBound = "1";
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    submitEditedSubtask(event, input);
  });
}

/**
 * Prevents default key behavior and saves edited text.
 * @param {KeyboardEvent} event
 * @param {HTMLElement} target
 */
function submitEditedSubtask(event, target) {
  event.preventDefault();
  finalEditditSubtask(target);
}

/** Shows the add/cancel control group below the subtask input. */
function showAddCancelBtns() {
  document.getElementById("addCancelBtns")?.classList.remove("display-none");
}

/** Resets subtask inputs and hides add/cancel controls. */
function cancelSubtask() {
  const sub = document.getElementById("subtasks");
  const edit = document.getElementById("editedSubtasks");
  const plus = document.getElementById("subtaskPlusBtn");
  const wrap = document.getElementById("addCancelBtns");
  if (sub) sub.value = "";
  if (edit) edit.value = "";
  plus?.classList.remove("display-none");
  wrap?.classList.add("display-none");
}

/**
 * Adds a subtask to the appropriate list after validation.
 * @param {string} inputId
 */
function addSubtask(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const listId = inputId === "editedSubtasks" ? "editedSubtasksList" : "subtasksList";
  const list = document.getElementById(listId);
  const value = input.value.trim();
  if (!checkSubtask(value.length, value, list) || !list) return;
  list.classList.remove("display-none");
  list.innerHTML += addSubTaskTemplate(value);
  input.value = "";
}

/** Toggles subtask hint visibility and error highlight class. */
function showHideAlertMessage() {
  document.getElementById("subtaskHintMessage")?.classList.toggle("display-none");
  document.getElementById("inputBox")?.classList.toggle("correct-me");
}

/**
 * Live input handler: shows controls and validates value.
 * @param {HTMLInputElement} inputEl
 */
function handleSubtaskInputChange(inputEl) {
  if (!inputEl) return;
  showAddCancelForInput();
  const list = document.getElementById("subtasksList");
  const value = inputEl.value;
  checkSubtask(value.length, value, list);
  if (!value.trim()) resetSubtaskValidationState();
}

/** Ensures add/cancel wrapper is visible for subtask input. */
function showAddCancelForInput() {
  const wrapper = document.getElementById("addCancelBtns");
  if (wrapper?.classList.contains("display-none")) wrapper.classList.remove("display-none");
}

/** Clears hint and error highlight for subtask input. */
function resetSubtaskValidationState() {
  document.getElementById("addCancelBtns")?.classList.add("display-none");
  document.getElementById("subtaskHintMessage")?.classList.add("display-none");
  document.getElementById("inputBox")?.classList.remove("correct-me");
}

/**
 * Validates subtask input value and toggles contextual error hints.
 * @param {number} _ Legacy length parameter.
 * @param {string} inputValue Current input value.
 * @param {HTMLElement} subtasksList Optional list for duplicate check.
 * @returns {boolean}
 */
function checkSubtask(_, inputValue, subtasksList) {
  const hint = document.getElementById("subtaskHintMessage");
  const box = document.getElementById("inputBox");
  const list = resolveSubtasksList(subtasksList);
  const value = resolveSubtaskValue(inputValue);
  const error = detectSubtaskError(value, list);
  if (hint) {
    hint.textContent = error;
    hint.classList.toggle("display-none", !error);
  }
  box?.classList.toggle("correct-me", !!error);
  return !error;
}

/**
 * Resolves subtask value from argument or active input.
 * @param {string|unknown} inputValue
 * @returns {string}
 */
function resolveSubtaskValue(inputValue) {
  if (typeof inputValue === "string") return inputValue.trim();
  return (document.activeElement?.value || "").trim();
}

/**
 * Resolves the correct UL element for subtask list.
 * @param {HTMLElement|null} list
 * @returns {HTMLElement|null}
 */
function resolveSubtasksList(list) {
  if (list) return list;
  const activeId = document.activeElement?.id;
  const targetId = activeId === "editedSubtasks" ? "editedSubtasksList" : "subtasksList";
  return document.getElementById(targetId);
}

/**
 * Computes validation error message or empty string when valid.
 * @param {string} value
 * @param {HTMLElement|null} list
 * @returns {string}
 */
function detectSubtaskError(value, list) {
  if (!value) return "Subtask required";
  if (value.length < 3) return "Subtask must be at least 3 characters";
  const duplicate = hasDuplicateSubtaskText(value, list);
  return duplicate ? "Subtask already exists" : "";
}

/**
 * Checks if value already exists as subtask text in list.
 * @param {string} value
 * @param {HTMLElement|null} list
 * @returns {boolean}
 */
function hasDuplicateSubtaskText(value, list) {
  if (!list) return false;
  return Array.from(list.querySelectorAll(".subtask-text"))
    .some((entry) => entry.textContent?.trim() === value);
}

/** Removes a subtask row from the list. */
function deleteSubtask(subtask) {
  subtask.closest(".subtask-item").remove();
}

/** Opens a subtask row in edit mode and prefills the input. */
function editSubtask(button) {
  const row = button.closest(".subtask-item");
  openSubtaskEditUI(row);
}

/**
 * Switches a row to edit mode and wires Enter-save.
 * @param {HTMLElement} row
 */
function openSubtaskEditUI(row) {
  const display = row.querySelector(".subtask");
  const edit = row.querySelector(".edit-subtask-input-wrapper");
  const text = row.querySelector(".subtask-text")?.textContent || "";
  display.classList.add("display-none");
  edit.classList.remove("display-none");
  const input = edit.querySelector(".edit-subtask-input");
  input.value = text;
  onEnterEditSubTask(input);
}

/**
 * Finalizes subtask edit; validates and applies new text.
 * @param {HTMLElement} subtask
 */
function finalEditditSubtask(subtask) {
  const item = subtask.closest(".subtask-item");
  const edit = item.querySelector(".edit-subtask-input-wrapper");
  const display = item.querySelector(".subtask");
  const input = edit.querySelector(".edit-subtask-input");
  const text = input.value.trim();
  if (!validateEditedSubtask(item, text)) return;
  item.querySelector(".subtask-text").textContent = text;
  edit.classList.add("display-none");
  display.classList.remove("display-none");
  clearEditValidation(item);
}

/**
 * Validates the edited subtask text.
 * @param {HTMLElement} subtaskItem
 * @param {string} text
 * @returns {boolean}
 */
function validateEditedSubtask(subtaskItem, text) {
  if (text.length < 3) {
    showEditValidationError(subtaskItem, "Subtask must be at least 3 characters");
    return false;
  }
  if (subtaskAlreadyExists(subtaskItem, text)) {
    showEditValidationError(subtaskItem, "Subtask already exists");
    return false;
  }
  return true;
}

/**
 * Checks for duplicate subtask text among sibling rows.
 * @param {HTMLElement} currentItem
 * @param {string} text
 * @returns {boolean}
 */
function subtaskAlreadyExists(currentItem, text) {
  const existing = [];
  document.querySelectorAll(".subtask-item").forEach((item) => {
    const content = item.querySelector(".subtask-text")?.textContent?.trim();
    if (item !== currentItem && content) existing.push(content.toLowerCase());
  });
  return existing.includes(text.toLowerCase());
}

/**
 * Shows inline validation error styling and message for a row.
 * @param {HTMLElement} subtaskItem
 * @param {string} message
 */
function showEditValidationError(subtaskItem, message) {
  const editWrapper = subtaskItem.querySelector(".edit-subtask-input-wrapper");
  editWrapper.classList.add("edit-validation-error");
  subtaskItem.querySelector(".hint")?.remove();
  insertSubtaskHintAfter(editWrapper, message);
}

/**
 * Creates and inserts a hint element after the edit wrapper.
 * @param {HTMLElement} editWrapper
 * @param {string} message
 */
function insertSubtaskHintAfter(editWrapper, message) {
  const hint = document.createElement("span");
  hint.className = "hint edit-validation-hint";
  hint.textContent = message;
  editWrapper.parentNode.insertBefore(hint, editWrapper.nextSibling);
}

/** Clears validation state and removes hint for a subtask row. */
function clearEditValidation(subtaskItem) {
  const editWrapper = subtaskItem.querySelector(".edit-subtask-input-wrapper");
  editWrapper.classList.remove("edit-validation-error");
  subtaskItem.querySelector(".hint")?.remove();
}
