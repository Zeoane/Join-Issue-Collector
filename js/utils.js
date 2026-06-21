/**
 * Gemeinsame Hilfsfunktionen für JOIN.
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

window.escapeHtml = escapeHtml;
window.escapeJsString = escapeJsString;
window.predefinedColors = predefinedColors;
window.getRandomColor = getRandomColor;
window.getInitials = getInitials;
window.contactIconSpan = contactIconSpan;
