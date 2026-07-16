/**
 * Board Overlay Management
 * Handles overlay functionality for the board
 */

const OVERLAY = document.getElementById('overlay');
const OVERLAY_CONTENT = document.getElementById('overlayContent');

/**
 * Resets the dedicated add-task page form fields.
 * @param {HTMLElement} page
 */
function resetAddTaskPageForm(page) {
  page.querySelectorAll('input,textarea,select').forEach((el) => {
    if (el.type === 'checkbox' || el.type === 'radio') el.checked = false;
    else el.value = '';
  });
  page.querySelectorAll('.selected-assignee .contact-icon').forEach((n) => n.remove());
  page.querySelectorAll('#subtasksList,#editedSubtasksList').forEach((l) => (l.innerHTML = ''));
  page.querySelectorAll('.priority-button.active, .edit-priority-button.active').forEach((b) => {
    b.classList.remove('active');
  });
  page.querySelector('.priority-button.MidPriority, .edit-priority-button.MidPriority')
    ?.classList.add('active');
}

/**
 * Closes the task overlay by removing active classes and clearing content.
 * @returns {void}
 */
function closeOverlay() {
  if (!OVERLAY || !OVERLAY_CONTENT) {
    const page = document.getElementById('addTaskSeite');
    if (page) resetAddTaskPageForm(page);
    return;
  }
  OVERLAY_CONTENT.classList.remove('active');
  setTimeout(() => {
    OVERLAY.classList.add('display-none');
    OVERLAY_CONTENT.classList.remove('add-task', 'edit-task-overlay', 'task-overlay');
    OVERLAY_CONTENT.innerHTML = '';
  }, 110);
}

/**
 * Handles overlay click events and closes overlay when clicking outside.
 * @param {Event} event
 * @returns {void}
 */
function handleOverlayClicks(event) {
  event.target === OVERLAY ? closeOverlay() : handleOutsideClick(event);
}

/**
 * Shows a notification message when a task is added to the board.
 * @returns {void}
 */
function showAddedTaskNotification() {
  const addedToBoardMessage = document.getElementById('addedToBoardMessage');
  addedToBoardMessage?.classList.remove('display-none');
}

/**
 * Handles post-add-task actions depending on current UI context.
 * @param {number} delayMs
 */
function handlePostAddTaskBehavior(delayMs = 900) {
  const overlayVisible = OVERLAY && !OVERLAY.classList.contains('display-none');
  setTimeout(() => {
    if (overlayVisible) return closeOverlay();
    const msg = document.getElementById('addedToBoardMessage');
    msg?.classList.add('display-none');
    openBoardPage();
  }, delayMs);
}

/**
 * Relative redirect to Board.html, then updateBoard().
 */
function openBoardPage() {
  try {
    if (location.pathname.endsWith('addTask.html') || location.pathname.includes('addTask')) {
      location.href = location.pathname.replace(/addTask.*$/, 'board.html');
      return;
    }
  } catch (e) { /* ignore */ }
  if (typeof updateBoard === 'function') return updateBoard();
}

/**
 * Persists a validated task and refreshes the board UI.
 * @param {string} columnId
 */
function persistAndShowAddedTask(columnId) {
  pushTaskToDatabase(columnId)
    .then(async () => {
      await updateBoard();
      showAddedTaskNotification();
      handlePostAddTaskBehavior(900);
    })
    .catch((error) => {
      console.error('Error adding task:', error);
      alert('Task konnte nicht gespeichert werden. Bitte erneut versuchen.');
    });
}

/**
 * Adds a new task to the specified column.
 * @param {Event|null} event
 * @param {string} columnId
 * @returns {void}
 */
function addTask(event, columnId) {
  if (event) event.preventDefault();
  const taskData = validateAndSaveTaskData(columnId);
  if (!taskData) return;
  persistAndShowAddedTask(columnId);
}
