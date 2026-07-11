import {
  buildTaskMoveNotificationPayload,
  notifyTaskMoveViaN8n,
  shouldNotifyTaskMove,
} from "./taskMoveNotifications.js";

/**
 * Sends an n8n webhook event when a task column changes.
 * @param {{
 *   params?: { uid?: string, taskId?: string },
 *   data?: { before?: { val: () => unknown }, after?: { val: () => unknown } },
 * }} event
 * @param {{
 *   webhookUrl?: string,
 *   webhookSecret?: string,
 *   fetchFn?: typeof fetch,
 * }} options
 * @returns {Promise<{ skipped: boolean, reason?: string, status?: number }>}
 */
export async function handleTaskColumnChange(event, options = {}) {
  const beforeTask = event?.data?.before?.val?.() || null;
  const afterTask = event?.data?.after?.val?.() || null;

  if (!shouldNotifyTaskMove(beforeTask, afterTask)) {
    return { skipped: true, reason: "no_relevant_column_change" };
  }

  const payload = buildTaskMoveNotificationPayload(beforeTask, afterTask, {
    uid: event?.params?.uid,
    taskId: event?.params?.taskId,
  });

  return notifyTaskMoveViaN8n(payload, options);
}
