/**
 * Gemeinsame Hilfsfunktionen für Join-Issue Collector.
 */

/**
 * Escaped HTML-Sonderzeichen gegen XSS.
 * @param {unknown} value
 * @returns {string}
 */
function escapeHtml(value) {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Escaped Strings für JS-Einzeil-Attribute (onclick etc.).
 * @param {unknown} value
 * @returns {string}
 */
function escapeJsString(value) {
  if (value == null) return "";
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
}

/**
 * @type {string[]}
 */
const predefinedColors = [
  "#FF7A00",
  "#9327FF",
  "#6E52FF",
  "#FC71FF",
  "#FFBB2B",
  "#1FD7C1",
  "#462F8A",
  "#FF4646",
  "#00BEE8",
];

/**
 * @returns {string}
 */
function getRandomColor() {
  const index = Math.floor(Math.random() * predefinedColors.length);
  return predefinedColors[index];
}

/**
 * Ensures the signed-in user has a profile color and persists it if missing.
 * @param {{name?:string,color?:string,[key:string]:unknown}|null|undefined} user
 * @returns {Promise<string>}
 */
async function ensureUserColor(user) {
  if (!user || !window.USERKEY) return user?.color || getRandomColor();
  if (user.color) return user.color;
  const color = getRandomColor();
  try {
    await putData(`users/${window.USERKEY}`, { ...user, color });
  } catch (error) {
    console.error("Failed to persist user color:", error);
  }
  return color;
}

/**
 * @param {string} name
 * @returns {string}
 */
function getInitials(name) {
  if (!name) return "";
  return name
    .split(" ")
    .map((word) => word[0]?.toUpperCase() || "")
    .join("")
    .substring(0, 2);
}

/**
 * @param {string} name
 * @returns {string}
 */
function contactIconSpan(name) {
  const splitedName = name.split(" ");
  if (splitedName.length >= 3) {
    return splitedName[0][0].toUpperCase() + splitedName[2][0].toUpperCase();
  }
  if (splitedName.length === 2) {
    return splitedName[0][0].toUpperCase() + splitedName[1][0].toUpperCase();
  }
  if (splitedName.length === 1) {
    return splitedName[0][0].toUpperCase();
  }
  return "";
}

/** @type {string} */
const AI_GENERATED_NOTICE = "This ticket was AI-generated.";

/**
 * @returns {boolean}
 */
function isGuestUser() {
  const user = window.firebaseAuth?.currentUser;
  if (!user) return false;
  return user.isAnonymous || localStorage.getItem("guestMode") === "true";
}

/**
 * Creator metadata for manually created board tasks.
 * @returns {{creatorEmail:string,creatorName:string,creatorType:"internal"|"external",aiGenerated:boolean}}
 */
function getTaskCreatorFields() {
  const user = window.firebaseAuth?.currentUser;
  if (!user) {
    return {
      creatorEmail: "",
      creatorName: "Unknown",
      creatorType: "internal",
      aiGenerated: false,
    };
  }
  if (isGuestUser()) {
    return {
      creatorEmail: "",
      creatorName: "Guest",
      creatorType: "internal",
      aiGenerated: false,
    };
  }
  return {
    creatorEmail: user.email || "",
    creatorName: "",
    creatorType: "internal",
    aiGenerated: false,
  };
}

/**
 * @param {Object|null|undefined} task
 * @returns {boolean}
 */
function taskHasCreator(task) {
  return Boolean(task?.creatorEmail || task?.creatorName || task?.creatorType);
}

/**
 * @param {"internal"|"external"|string|undefined} creatorType
 * @returns {string}
 */
function getCreatorTypeLabel(creatorType) {
  return creatorType === "external" ? "Stakeholder" : "Internal";
}

/**
 * Display name for task creator rows (never shows an email address).
 * @param {Object|null|undefined} task
 * @returns {string}
 */
function getCreatorPersonDisplayName(task) {
  if (!task) return "Unknown";
  if (task.creatorName) return task.creatorName;
  if (task.creatorType !== "external") {
    return isGuestUser() ? "Guest" : "Member";
  }
  return "Stakeholder";
}

/**
 * @param {Object|null|undefined} task
 * @returns {string}
 */
function getCreatorDisplayName(task) {
  return getCreatorPersonDisplayName(task);
}

/**
 * @param {Object|null|undefined} task
 * @returns {string}
 */
function getCreatorMemberDisplayName(task) {
  return getCreatorPersonDisplayName(task);
}

/**
 * @param {Object} taskData
 * @returns {Promise<Object>}
 */
async function resolveCreatorNameForSave(taskData) {
  if (taskData.creatorName || taskData.creatorType === "external") {
    return taskData;
  }
  try {
    const profile = await loadData(`users/${window.USERKEY}`);
    if (profile?.name) {
      return { ...taskData, creatorName: profile.name };
    }
  } catch (err) {
    console.error("Creator name could not be resolved:", err);
  }
  return taskData;
}

/**
 * @param {Object|null|undefined} task
 * @returns {boolean}
 */
function isInternalCreatorTask(task) {
  return task?.creatorType !== "external";
}

/**
 * @param {Object|null|undefined} task
 * @returns {boolean}
 */
function isAiGeneratedTask(task) {
  return task?.aiGenerated === true;
}

/**
 * @param {string} text
 * @returns {string}
 */
function stripAiGeneratedNotice(text) {
  if (!text) return "";
  return text
    .split("\n")
    .filter((line) => line.trim() !== AI_GENERATED_NOTICE)
    .join("\n")
    .trim();
}

/**
 * @param {Object|null|undefined} task
 * @returns {string}
 */
function getTaskDescriptionForDisplay(task) {
  const raw = task?.description || "";
  return isAiGeneratedTask(task) ? stripAiGeneratedNotice(raw) : raw;
}

window.escapeHtml = escapeHtml;
window.escapeJsString = escapeJsString;
window.predefinedColors = predefinedColors;
window.getRandomColor = getRandomColor;
window.ensureUserColor = ensureUserColor;
window.getInitials = getInitials;
window.contactIconSpan = contactIconSpan;
window.AI_GENERATED_NOTICE = AI_GENERATED_NOTICE;
window.getTaskCreatorFields = getTaskCreatorFields;
window.taskHasCreator = taskHasCreator;
window.getCreatorTypeLabel = getCreatorTypeLabel;
window.getCreatorPersonDisplayName = getCreatorPersonDisplayName;
window.getCreatorDisplayName = getCreatorDisplayName;
window.getCreatorMemberDisplayName = getCreatorMemberDisplayName;
window.resolveCreatorNameForSave = resolveCreatorNameForSave;
window.isInternalCreatorTask = isInternalCreatorTask;
window.isAiGeneratedTask = isAiGeneratedTask;
window.stripAiGeneratedNotice = stripAiGeneratedNotice;
window.getTaskDescriptionForDisplay = getTaskDescriptionForDisplay;
