import { getDatabase } from "./firebaseAdmin.js";
import { sendJson } from "./responseHelpers.js";

const DAILY_BOARD_TASK_LIMIT = 10;
const UTC_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * @param {number} nowMs
 * @returns {{ day: string, dayStartMs: number, nextDayStartMs: number }}
 */
function getUtcDayBounds(nowMs) {
  const day = new Date(nowMs).toISOString().slice(0, 10);
  const dayStartMs = Date.parse(`${day}T00:00:00.000Z`);
  return { day, dayStartMs, nextDayStartMs: dayStartMs + UTC_DAY_MS };
}

/**
 * Counts processed email entries for the current UTC day.
 * @param {Record<string, { processedAt?: unknown }>} processedEmails
 * @param {number} [nowMs=Date.now()]
 * @returns {{ day: string, usedToday: number }}
 */
export function countProcessedEmailsForUtcDay(processedEmails, nowMs = Date.now()) {
  const { day, dayStartMs, nextDayStartMs } = getUtcDayBounds(nowMs);
  const values = Object.values(processedEmails || {});
  const usedToday = values.reduce((count, entry) => {
    const processedAt = Number(entry?.processedAt);
    if (!Number.isFinite(processedAt)) return count;
    if (processedAt < dayStartMs || processedAt >= nextDayStartMs) return count;
    return count + 1;
  }, 0);
  return { day, usedToday };
}

/**
 * @param {string} demoUid
 * @param {number} [nowMs=Date.now()]
 * @returns {Promise<{ day: string, usedToday: number, dailyLimit: number, remainingToday: number }>}
 */
async function loadStakeholderDailyUsage(demoUid, nowMs = Date.now()) {
  const processedSnap = await getDatabase()
    .ref(`users/${demoUid}/processedEmails`)
    .get();
  const processedEmails = processedSnap.exists() ? processedSnap.val() : {};
  const { day, usedToday } = countProcessedEmailsForUtcDay(processedEmails, nowMs);
  return {
    day,
    usedToday,
    dailyLimit: DAILY_BOARD_TASK_LIMIT,
    remainingToday: Math.max(0, DAILY_BOARD_TASK_LIMIT - usedToday),
  };
}

/**
 * Public GET endpoint for stakeholder daily board-task usage.
 * @param {import("firebase-functions/v2/https").Request} req
 * @param {import("firebase-functions/v2/https").Response} res
 * @param {string} demoUid
 * @returns {Promise<void>}
 */
export async function handleStakeholderUsageRequest(req, res, demoUid) {
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }
  if (!demoUid) {
    sendJson(res, 503, { error: "DEMO_USER_UID is not configured." });
    return;
  }

  try {
    const usage = await loadStakeholderDailyUsage(demoUid);
    res.set("Cache-Control", "no-store, max-age=0");
    sendJson(res, 200, usage);
  } catch (error) {
    console.error("Failed to load stakeholder daily usage:", error);
    sendJson(res, 500, { error: "Unable to load stakeholder usage." });
  }
}
