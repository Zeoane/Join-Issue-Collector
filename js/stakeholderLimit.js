const STAKEHOLDER_USAGE_ENDPOINT = "/public/stakeholder-usage";

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
 * @param {Element} element
 * @param {number} used
 * @param {number} limit
 */
function renderLimit(element, used, limit) {
  element.innerHTML = `<strong>${used}</strong> of <strong>${limit}</strong> requests used`;
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
    updateLimitLabels(usage.usedToday, usage.dailyLimit);
  } catch (error) {
    console.warn("Stakeholder usage could not be loaded:", error);
  }
}

void initStakeholderLimit();
