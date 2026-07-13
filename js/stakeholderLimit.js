const STAKEHOLDER_USAGE_ENDPOINT = "/public/stakeholder-usage";
const STAKEHOLDER_LIMIT_REACHED_URL = "./stakeholder-limit-reached.html";
const STAKEHOLDER_WELCOME_URL = "./stakeholder.html";

/**
 * @param {number} value
 * @returns {number}
 */
function toNonNegativeInt(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.floor(number));
}

/**
 * @returns {boolean}
 */
function isLimitReachedPage() {
  return document.body.classList.contains("stakeholder-page--limit-reached");
}

/**
 * @returns {boolean}
 */
function isStakeholderWelcomePage() {
  return document.body.classList.contains("stakeholder-page") && !isLimitReachedPage();
}

/**
 * @param {number} used
 * @param {number} limit
 * @returns {boolean}
 */
function isDailyLimitReached(used, limit) {
  return used >= limit;
}

/**
 * @param {Element} element
 * @param {number} used
 * @param {number} limit
 */
function renderLimit(element, used, limit) {
  element.innerHTML = `<strong>${used}</strong> of <strong>${limit}</strong> requests used`;
  element.classList.toggle("stakeholder-limit--reached", isDailyLimitReached(used, limit));
}

/**
 * @param {number} used
 * @param {number} limit
 * @returns {void}
 */
function updateLimitLabels(used, limit) {
  const labels = document.querySelectorAll(".stakeholder-limit");
  labels.forEach((label) => renderLimit(label, used, limit));
}

/**
 * @param {{ usedToday: number, dailyLimit: number }} usage
 * @returns {boolean}
 */
function redirectForUsageState(usage) {
  if (isStakeholderWelcomePage() && isDailyLimitReached(usage.usedToday, usage.dailyLimit)) {
    window.location.replace(STAKEHOLDER_LIMIT_REACHED_URL);
    return true;
  }

  if (isLimitReachedPage() && !isDailyLimitReached(usage.usedToday, usage.dailyLimit)) {
    window.location.replace(STAKEHOLDER_WELCOME_URL);
    return true;
  }

  return false;
}

/**
 * @returns {Promise<{ usedToday: number, dailyLimit: number }>}
 */
async function loadStakeholderUsage() {
  const response = await fetch(STAKEHOLDER_USAGE_ENDPOINT, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load stakeholder usage (${response.status})`);
  }
  const payload = await response.json();
  return {
    usedToday: toNonNegativeInt(payload?.usedToday),
    dailyLimit: toNonNegativeInt(payload?.dailyLimit || 10) || 10,
  };
}

async function initStakeholderLimit() {
  try {
    const usage = await loadStakeholderUsage();
    if (redirectForUsageState(usage)) return;
    updateLimitLabels(usage.usedToday, usage.dailyLimit);
  } catch (error) {
    console.warn("Stakeholder usage could not be loaded:", error);
  }
}

void initStakeholderLimit();
