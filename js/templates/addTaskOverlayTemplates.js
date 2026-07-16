/**
 * @returns {string}
 */
function renderAddTaskOverlayHeader() {
  return `
    <div class="overlay-header flexR width-100 space-between">
      <h2>Add Task</h2>
      <button class="overlay-button" id="closeOverlayBtn" onclick="closeOverlay()">${CLOSE_CANCEL_SVG}</button>
    </div>`;
}

/**
 * @returns {string}
 */
function renderAddTaskTitleDescFields() {
  return `
      <div class="gap-8 width-100 flexC">
        <label class="width-100" for="taskTitle">Title<span class="highlight">*</span></label>
        <input class="inputs requierd-input change-onfoucus" oninput="hideValidationErrors()" type="text" id="taskTitle" name="taskTitle" placeholder="Enter a title">
        <span class="required-span width-100 display-none">This field is required</span>
      </div>
      <div class="gap-8 width-100 flexC">
        <label class="width-100" for="taskDescription">Description</label>
        <textarea class="inputs change-onfoucus" id="taskDescription" name="taskDescription" placeholder="Enter a description"></textarea>
      </div>`;
}

/**
 * @returns {string}
 */
function renderAddTaskDueDateField() {
  return `
      <div class="gap-8 width-100 flexC">
        <label class="width-100" for="taskDueDate">Due date<span class="highlight">*</span></label>
        <div class="date-input-wrapper width-100">
          <input class="inputs requierd-input change-onfoucus" oninput="hideValidationErrors()" type="date" id="taskDueDate" name="taskDueDate" min="" onfocus="this.min=new Date().toISOString().split('T')[0]">
          <button type="button" class="date-input-icon-btn" onclick="openDatePicker('taskDueDate', event)" aria-label="Choose date">
            <img class="date-input-icon" src="../img/calender.svg" alt="" aria-hidden="true">
          </button>
        </div>
        <span class="required-span width-100 display-none">This field is required</span>
      </div>`;
}

/**
 * @returns {string}
 */
function renderAddTaskLeftColumn() {
  return `<div class="flexC task-form-column">${renderAddTaskTitleDescFields()}${renderAddTaskDueDateField()}</div>`;
}

/**
 * @returns {string}
 */
function renderAddTaskPriorityButtons() {
  return `
    <div class="gap-8 width-100 flexC">
      <span class="width-100 prio-style">Priority</span>
      <div class="flexR priority-select gap-16 width-100">
        <button type="button" class="priority-button gap-8 width-100 flexR HighPriority" onclick="priorityHandler('high'); event.stopPropagation();"><span class="priority-text">Urgent</span>${HIGH_PRIORITY_SVG}</button>
        <button type="button" class="priority-button active gap-8 width-100 flexR MidPriority" onclick="priorityHandler('medium'); event.stopPropagation();"><span class="priority-text">Medium</span>${MID_PRIORITY_SVG}</button>
        <button type="button" class="priority-button gap-8 width-100 flexR LowPriority" onclick="priorityHandler('low'); event.stopPropagation();"><span class="priority-text">Low</span>${LOW_PRIORITY_SVG}</button>
      </div>
    </div>`;
}

/**
 * @returns {string}
 */
function renderAddTaskAssigneeField() {
  return `
    <div class="flexC gap-8 width-100">
      <label class="width-100" for="taskAssignee">Assigned To</label>
      <div class="input-svg-wrapper width-100 flexC">
        <input class="inputs change-onfoucus" type="text" id="taskAssignee" placeholder="Select Contacts to assign" oninput="searchAssignee(this.value)" onfocus="toggleAssigneeOptions(); event.stopPropagation();">
        <div id="assigneeOptions" oninput="toggleAssigneeOptions()" class="assignee-options width-100 display-none"></div>
      </div>
      <div class="selected-assignee width-100 gap-8 flexR display-none" id="selectedAssignee"></div>
    </div>`;
}

/**
 * @returns {string}
 */
function renderAddTaskCategoryField() {
  return `
    <div class="gap-8 width-100 flexC">
      <label class="width-100" for="taskCategory">Category<span class="highlight">*</span></label>
      <div class="width-100">
        <button class="change-onfocus category-options-btn inputs requierd-input" type="button" id="taskCategory" onclick="toggleCategoryOptions(); event.stopPropagation(); hideValidationErrors()">Select task category</button>
        <div class="category-options-list width-100 display-none flexC" id="categoryOptions">
          <span onclick="selectCategory('User Story');" class="category-option width-100" value="userStory">User Story</span>
          <span onclick="selectCategory('Technical Task');" class="category-option width-100" value="technicalTask">Technical Task</span>
        </div>
      </div>
      <span class="required-span width-100 display-none">This field is required</span>
    </div>`;
}

/**
 * @returns {string}
 */
function renderAddTaskAssigneeCategory() {
  return `${renderAddTaskAssigneeField()}${renderAddTaskCategoryField()}`;
}

/**
 * @returns {string}
 */
function renderAddTaskSubtasksField() {
  return `
    <div class="gap-8 width-100 flexC">
      <label class="width-100" for="subtasks">Subtasks</label>
      <div class="inputs change-onfoucus flexR" id="inputBox">
        <input class="width-100" type="text" id="subtasks" placeholder="add new subtask" oninput="handleSubtaskInputChange(this)" onkeydown="onEnterAddSubTask(event, 'subtasks')">
        <div class="add-cancel-btns flexR display-none gap-8" id="addCancelBtns">
          <button class="cancel-subtask-button overlay-button" type="button" onclick="cancelSubtask()">${CLOSE_CANCEL_SVG}</button>
          ${SEPARATOR_SVG}
          <button class="add-subtask-button overlay-button" type="button" onclick="addSubtask('subtasks')">${SUBMIT_SVG}</button>
        </div>
      </div>
      <span id="subtaskHintMessage" class="width-100 display-none">Please type a clear subtask</span>
      <ul id="subtasksList" class="flexC width-100 display-none"></ul>
    </div>`;
}

/**
 * @param {string} cancelLabel
 * @returns {string}
 */
function renderAddTaskSubmitSection(cancelLabel) {
  return `
    <div class="flexR width-100 space-between submit-section">
      <span class="flexR submit-span"><span class="highlight">*</span> This field is required</span>
      <div class="flexR gap-16">
        <button class="btn-shadow" type="button" id="closeOverlayButton" onclick="closeOverlay()">${cancelLabel} ${CLOSE_CANCEL_SVG}</button>
        <button class="btn-shadow" type="submit" id="addTaskButton">Creat Task ${SUBMIT_SVG}</button>
      </div>
    </div>`;
}

/**
 * Renders the Add Task overlay form markup for a given column.
 * @param {string} columnId
 * @param {string} [cancelLabel='Cancel']
 * @returns {string}
 */
/**
 * @returns {string}
 */
function renderAddTaskRightColumn() {
  return `
        <div class="flexC task-form-column">
          ${renderAddTaskPriorityButtons()}
          ${renderAddTaskAssigneeCategory()}
          ${renderAddTaskSubtasksField()}
        </div>`;
}

/**
 * @param {string} columnId
 * @param {string} cancelLabel
 * @returns {string}
 */
function renderAddTaskFormBody(columnId, cancelLabel) {
  return `
    <form id="addTaskForm" class="overlay-bottom width-100 flexC" onsubmit="addTask(event, '${columnId}')">
      <div class="flexR task-form-top width-100 space-between">
        ${renderAddTaskLeftColumn()}
        <svg class="middle-vector" width="2" height="426" viewBox="0 0 2 426" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1.24805 1L1.24854 425" stroke="#D1D1D1" stroke-linecap="round"/>
        </svg>
        ${renderAddTaskRightColumn()}
      </div>
      ${renderAddTaskSubmitSection(cancelLabel)}
    </form>`;
}

function addTaskOverlayForm(columnId, cancelLabel = "Cancel") {
  return `
    ${renderAddTaskOverlayHeader()}
    ${renderAddTaskFormBody(columnId, cancelLabel)}
    <div class="flexR added-to-board-message display-none" id="addedToBoardMessage">
      <span class="message-text">Task added to board</span> ${BOARD_SVG}
    </div>`;
}

/**
 * @param {string} uniqueId
 * @param {string} subtaskInput
 * @returns {string}
 */
function renderSubtaskViewRow(uniqueId, subtaskInput) {
  return `
    <div class="subtask flexR" id="${uniqueId}">
      <div class="subtask-heading flexR gap-8">•<span class="subtask-text">${escapeHtml(subtaskInput)}</span></div>
      <div class="delete-edit-btns gap-8 flexR">
        <button class="edit-subtask-button overlay-button" type="button" onclick="editSubtask(this)">${EDIT_SVG}</button>
        ${SEPARATOR_SVG}
        <button class="delete-subtask-button overlay-button" type="button" onclick="deleteSubtask(this)">${DELETE_SVG}</button>
      </div>
    </div>`;
}

/**
 * @param {string} editUniqueId
 * @param {string} editInputId
 * @returns {string}
 */
function renderSubtaskEditRow(editUniqueId, editInputId) {
  return `
    <div class="edit-subtask-input-wrapper space-between width-100 flexR display-none" id="${editUniqueId}">
      <input type="text" id="${editInputId}" class="edit-subtask-input width-100" onkeydown="onEnterEditSubTask(event, this)" oninput="clearEditValidation(this.closest('.subtask-item'))">
      <div class="gap-8 flexR">
        <button class="delete-subtask-button overlay-button" type="button" onclick="deleteSubtask(this)">${DELETE_SVG}</button>
        ${SEPARATOR_SVG}
        <button class="add-subtask-button overlay-button" type="button" onclick="finalEditditSubtask(this)">${SUBMIT_SVG}</button>
      </div>
    </div>`;
}

/**
 * HTML for a single subtask list item.
 * @param {string} subtaskInput
 * @param {number} [index=0]
 * @returns {string}
 */
function addSubTaskTemplate(subtaskInput, index = 0) {
  const stamp = Date.now();
  const uniqueId = `subtaskInfos_${index}_${stamp}`;
  const editUniqueId = `editSubtask_${index}_${stamp}`;
  const editInputId = `editSubtaskInput_${index}_${stamp}`;
  return `
    <li ondblclick="editSubtask(this)" class="subtask-item width-100 flexC">
      ${renderSubtaskViewRow(uniqueId, subtaskInput)}
      ${renderSubtaskEditRow(editUniqueId, editInputId)}
    </li>`;
}

/**
 * Inner HTML for an edited subtask row.
 * @param {string} subtaskInput
 * @returns {string}
 */
function editedSubTask(subtaskInput) {
  return `
    <div class="subtask-headdinfg flexR gap-8">•<span class="subtask-text">${escapeHtml(subtaskInput)}</span></div>
    <div class="gap-8 flexR">
      <button class="edit-subtask-button overlay-button" type="button" onclick="editSubtask(this)">${EDIT_SVG}</button>
      ${SEPARATOR_SVG}
      <button class="delete-subtask-button overlay-button" type="button" onclick="deleteSubtask(this)">${DELETE_SVG}</button>
    </div>`;
}
