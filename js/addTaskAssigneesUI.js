/**
 * Renders the assignee options list from contacts.
 * @param {Array<[string, {name:string}]>} contactEntries Contact entries to render.
 */
function renderContactOptions(contactEntries) {
  const assigneeOptions = document.getElementById("assigneeOptions");
  if (!assigneeOptions) return;
  const contactTemplates = contactEntries.map(([, contact]) => assigneeOptionTemplate(contact));
  assigneeOptions.innerHTML = contactTemplates.join("");
  setTimeout(() => markPreselectedAssignees(), 100);
}

/** Loads contacts and renders them into the overlay. */
async function loadAndRenderContacts() {
  try {
    const contactEntries = await fetchContactsData();
    renderContactOptions(contactEntries);
  } catch (error) {
    console.error("Error loading contacts:", error);
  }
}

/** Filters visible assignees by search text. */
function searchAssignee(text) {
  if (!text || !text.trim()) return loadAndRenderContacts();
  const opts = document.getElementById("assigneeOptions");
  const count = applyAssigneeFilter(opts?.querySelectorAll(".assignee-option") || [], text);
  checkNoResults(count, text);
}

/**
 * Applies filter to assignee option nodes and returns visible count.
 * @param {NodeListOf<Element>|Array<Element>} options Option nodes.
 * @param {string} text Filter text (case-insensitive).
 * @returns {number}
 */
function applyAssigneeFilter(options, text) {
  let visible = 0;
  const query = text.toLowerCase();
  options.forEach((option) => {
    const name = option.querySelector(".contact-name")?.textContent || "";
    const match = name.toLowerCase().includes(query);
    option.classList.toggle("display-none", !match);
    if (match) visible++;
  });
  return visible;
}

/** Injects a "no results" info when nothing matches. */
function checkNoResults(numberOfResults, text) {
  const assigneeOptions = document.getElementById("assigneeOptions");
  if (!assigneeOptions) return;
  assigneeOptions.querySelector(".no-results")?.remove();
  if (numberOfResults === 0 && text.trim()) {
    assigneeOptions.innerHTML += noSearchResultsTemplate();
  }
}

/** Toggles the assignee options dropdown visibility. */
function toggleAssigneeOptions() {
  const options = document.getElementById("assigneeOptions");
  options.classList.toggle("display-none");
  options.classList.toggle("active");
  if (options.classList.contains("active")) markPreselectedAssignees();
}

/** Marks already selected assignees in the options list. */
function markPreselectedAssignees() {
  const currentAssignees = getCurrentTaskAssignees();
  document
    .querySelectorAll(".assignee-option")
    .forEach((option) => markAssigneeOption(option, currentAssignees));
}

/**
 * Applies selected state to one assignee option.
 * @param {Element} option
 * @param {string[]} currentAssignees
 */
function markAssigneeOption(option, currentAssignees) {
  const parts = readAssigneeOptionParts(option);
  if (!parts) return;
  const isSelected = currentAssignees.includes(parts.contactNameElement.textContent);
  applyOptionSelectionState(option, parts.checkbox, parts.checkboxFilled, isSelected);
}

/**
 * Reads all required option elements for selection toggling.
 * @param {Element} option
 * @returns {{contactNameElement:Element,checkbox:Element,checkboxFilled:Element}|null}
 */
function readAssigneeOptionParts(option) {
  const contactNameElement = option.querySelector(".contact-name");
  const checkbox = option.querySelector(".checkbox");
  const checkboxFilled = option.querySelector(".checkbox-filled");
  if (!contactNameElement || !checkbox || !checkboxFilled) return null;
  return { contactNameElement, checkbox, checkboxFilled };
}

/**
 * Applies selected styling and toggles checkbox icons for an option row.
 * @param {Element} option The option row element.
 * @param {Element} checkbox Unchecked icon element.
 * @param {Element} checkboxFilled Checked icon element.
 * @param {boolean} isSelected Whether option is selected.
 */
function applyOptionSelectionState(option, checkbox, checkboxFilled, isSelected) {
  option.classList.toggle("selcted-assignee", isSelected);
  checkbox.classList.toggle("display-none", isSelected);
  checkboxFilled.classList.toggle("display-none", !isSelected);
}

/**
 * Returns the names of currently selected assignees in the overlay.
 * @returns {string[]}
 */
function getCurrentTaskAssignees() {
  const fromContainers = collectAssigneesFromContainers();
  if (fromContainers.length) return fromContainers;
  return collectAssigneesFromCheckboxes();
}

/**
 * Collects assignee names from known visual containers in the DOM.
 * @returns {string[]}
 */
function collectAssigneesFromContainers() {
  const selector = "#selectedAssignee,#editedAssignee,#selected-assignees,#selectedAssignees,.assignee-container .flexC,.assigned-to-wrapper .selected-assignees";
  const nodes = document.querySelectorAll(selector);
  for (const node of nodes) {
    const members = extractAssigneeNames(node);
    if (members.length) return members;
  }
  return [];
}

/**
 * Extracts assignee names from one container using fallback strategies.
 * @param {Element} node
 * @returns {string[]}
 */
function extractAssigneeNames(node) {
  const byMember = queryNames(node, ".member-name-text");
  if (byMember.length) return byMember;
  const byData = queryDataNames(node, ".contact-icon[data-name]");
  if (byData.length) return byData;
  return queryNames(node, ".contact-name");
}

/**
 * Extracts trimmed text content for matching selectors.
 * @param {Element} node
 * @param {string} selector
 * @returns {string[]}
 */
function queryNames(node, selector) {
  return Array.from(node.querySelectorAll(selector))
    .map((element) => element.textContent.trim())
    .filter(Boolean);
}

/**
 * Extracts trimmed dataset.name values for matching selectors.
 * @param {Element} node
 * @param {string} selector
 * @returns {string[]}
 */
function queryDataNames(node, selector) {
  return Array.from(node.querySelectorAll(selector))
    .map((element) => element.dataset.name?.trim())
    .filter(Boolean);
}

/**
 * Collects assignee names from checked checkbox inputs.
 * @returns {string[]}
 */
function collectAssigneesFromCheckboxes() {
  const selector = '#assigneeOptions input[type="checkbox"]:checked,#assigned-to-options input[type="checkbox"]:checked';
  const boxes = document.querySelectorAll(selector);
  if (!boxes.length) return [];
  return Array.from(boxes).map((checkbox) => getAssigneeNameFromCheckbox(checkbox)).filter(Boolean);
}

/**
 * Resolves assignee name for one checked checkbox row.
 * @param {HTMLInputElement} checkbox
 * @returns {string}
 */
function getAssigneeNameFromCheckbox(checkbox) {
  const row = checkbox.closest("li") || checkbox.parentElement;
  const fromLabel = row?.querySelector(".contact-name")?.textContent.trim();
  return (fromLabel || checkbox.dataset?.email || checkbox.value || "").trim();
}

/**
 * Toggles selected styling and checkbox icons for an option row.
 * @param {HTMLElement} item The option row element.
 */
function highligtSlected(item) {
  const checkbox = item.querySelector(".checkbox");
  const checkboxFilled = item.querySelector(".checkbox-filled");
  item.classList.toggle("selcted-assignee");
  checkbox.classList.toggle("display-none");
  checkboxFilled.classList.toggle("display-none");
}

/**
 * Selects or deselects an assignee and updates selected icons list.
 * @param {HTMLElement|string} assignee
 */
function selectAssignee(assignee) {
  const assigneeName = resolveAssigneeName(assignee);
  toggleAssigneeIcon(assigneeName);
  highligtSlected(assignee);
}

/**
 * Resolves assignee name from option element or direct string.
 * @param {HTMLElement|string} assignee
 * @returns {string}
 */
function resolveAssigneeName(assignee) {
  if (typeof assignee === "string") return assignee;
  return assignee.querySelector(".contact-name")?.textContent || "";
}

/**
 * Toggles the presence of an assignee icon in the selection area.
 * @param {string} assigneeName Full name of the assignee.
 */
function toggleAssigneeIcon(assigneeName) {
  const container = getAssigneeContainer();
  const removed = removeAssigneeFromContainer(container, assigneeName);
  addToSelectedAssignee(assigneeName, !removed);
}

/**
 * Returns the active assignee container, preferring edit overlay.
 * @returns {HTMLElement|null}
 */
function getAssigneeContainer() {
  return document.getElementById("editedAssignee") || document.getElementById("selectedAssignee");
}

/**
 * Removes an assignee icon from the container if present.
 * @param {HTMLElement} container
 * @param {string} assigneeName
 * @returns {boolean}
 */
function removeAssigneeFromContainer(container, assigneeName) {
  let removed = false;
  container.querySelectorAll(".contact-icon:not(.extra-count)").forEach((span) => {
    if (span.dataset.name !== assigneeName) return;
    span.remove();
    removed = true;
  });
  return removed;
}

/**
 * Adds an assignee icon if toggled on and updates overflow display.
 * @param {string} assigneeName
 * @param {boolean} found Whether the name was not removed.
 */
function addToSelectedAssignee(assigneeName, found) {
  const selectedAssignee = getAssigneeContainer();
  if (found) {
    selectedAssignee.classList.remove("display-none");
    selectedAssignee.innerHTML += contactIconSpanTemplate(assigneeName);
  }
  updateAssigneeDisplay(selectedAssignee);
}

/**
 * Manages visible icons and extra-count badge in selection area.
 * @param {HTMLElement} container
 */
function updateAssigneeDisplay(container) {
  const maxVisible = 5;
  const allSpans = getAssigneeIconSpans(container);
  removeExtraCountBadge(container);
  setVisibleAssigneeIcons(allSpans, maxVisible);
  addExtraCountBadgeIfNeeded(container, allSpans.length, maxVisible);
}

/**
 * Returns all assignee icon spans except overflow badge.
 * @param {HTMLElement} container
 * @returns {NodeListOf<Element>}
 */
function getAssigneeIconSpans(container) {
  return container.querySelectorAll(".contact-icon:not(.extra-count)");
}

/**
 * Removes existing overflow badge from assignee container.
 * @param {HTMLElement} container
 */
function removeExtraCountBadge(container) {
  container.querySelector(".contact-icon.extra-count")?.remove();
}

/**
 * Shows up to maxVisible icons and hides the rest.
 * @param {NodeListOf<Element>} allSpans
 * @param {number} maxVisible
 */
function setVisibleAssigneeIcons(allSpans, maxVisible) {
  allSpans.forEach((span, index) => {
    span.style.display = index < maxVisible ? "" : "none";
  });
}

/**
 * Adds overflow badge when number of icons exceeds maxVisible.
 * @param {HTMLElement} container
 * @param {number} spanCount
 * @param {number} maxVisible
 */
function addExtraCountBadgeIfNeeded(container, spanCount, maxVisible) {
  if (spanCount <= maxVisible) return;
  container.innerHTML += extraCountSpanTemplate(spanCount - maxVisible);
}
