const COLUMN_LABELS = {
  triageColumn: "Triage",
  todoColumn: "To Do",
  inProgressColumn: "In Progress",
  awaitFeedbackColumn: "Await feedback",
  doneColumn: "Done",
};

/**
 * @param {unknown} value
 * @returns {string}
 */
function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * @param {unknown} beforeTask
 * @param {unknown} afterTask
 * @returns {boolean}
 */
export function shouldNotifyTaskMove(beforeTask, afterTask) {
  const before =
    beforeTask && typeof beforeTask === "object"
      ? /** @type {Record<string, unknown>} */ (beforeTask)
      : {};
  const after =
    afterTask && typeof afterTask === "object"
      ? /** @type {Record<string, unknown>} */ (afterTask)
      : {};

  const previousColumn = normalizeString(before.column);
  const nextColumn = normalizeString(after.column);
  const creatorEmail = normalizeString(after.creatorEmail);

  if (!previousColumn || !nextColumn) return false;
  if (previousColumn === nextColumn) return false;
  if (!creatorEmail) return false;

  return true;
}

/**
 * @param {unknown} beforeTask
 * @param {unknown} afterTask
 * @param {{ uid?: string, taskId?: string }} context
 * @returns {object}
 */
export function buildTaskMoveNotificationPayload(beforeTask, afterTask, context) {
  const before =
    beforeTask && typeof beforeTask === "object"
      ? /** @type {Record<string, unknown>} */ (beforeTask)
      : {};
  const after =
    afterTask && typeof afterTask === "object"
      ? /** @type {Record<string, unknown>} */ (afterTask)
      : {};

  const previousColumn = normalizeString(before.column);
  const newColumn = normalizeString(after.column);
  const movedAt =
    typeof after.movedAt === "number" && Number.isFinite(after.movedAt)
      ? after.movedAt
      : Date.now();

  return {
    eventType: "task.column.changed",
    uid: normalizeString(context.uid),
    taskId: normalizeString(context.taskId),
    title: normalizeString(after.title),
    creatorName: normalizeString(after.creatorName),
    creatorEmail: normalizeString(after.creatorEmail),
    previousColumn,
    previousColumnLabel: COLUMN_LABELS[previousColumn] || previousColumn,
    newColumn,
    newColumnLabel: COLUMN_LABELS[newColumn] || newColumn,
    movedAt,
  };
}

/**
 * @param {object} payload
 * @param {{
 *   webhookUrl?: string,
 *   webhookSecret?: string,
 *   fetchFn?: typeof fetch,
 * }} options
 * @returns {Promise<{ skipped: boolean, reason?: string, status?: number }>}
 */
export async function notifyTaskMoveViaN8n(payload, options = {}) {
  const webhookUrl = normalizeString(options.webhookUrl);
  const webhookSecret = normalizeString(options.webhookSecret);
  const fetchFn = options.fetchFn || fetch;

  if (!webhookUrl) {
    return { skipped: true, reason: "missing_webhook_url" };
  }

  const headers = { "content-type": "application/json" };
  if (webhookSecret) {
    headers["x-n8n-secret"] = webhookSecret;
  }

  const response = await fetchFn(webhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `Task move webhook failed with status ${response.status}${
        errorBody ? `: ${errorBody}` : ""
      }`
    );
  }

  return { skipped: false, status: response.status };
}
