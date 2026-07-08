import { getDatabase } from "./firebaseAdmin.js";
import { sanitizeMessageId } from "./processedEmail.js";

/**
 * @param {string} uid
 * @param {string} sourceMessageId
 * @returns {Promise<{ duplicate: true, id: string, task: object } | null>}
 */
async function findExistingTaskForMessage(uid, sourceMessageId) {
  const key = sanitizeMessageId(sourceMessageId);
  if (!key) return null;
  const db = getDatabase();
  const processedSnap = await db.ref(`users/${uid}/processedEmails/${key}`).get();
  if (!processedSnap.exists()) return null;

  const { taskId } = processedSnap.val();
  const taskSnap = await db.ref(`users/${uid}/tasks/${taskId}`).get();

  return {
    duplicate: true,
    id: taskId,
    task: taskSnap.exists() ? taskSnap.val() : {},
  };
}

/**
 * Stores a task under users/{uid}/tasks and returns its Firebase key.
 * Skips creation when sourceMessageId was already processed.
 * @param {string} uid
 * @param {object} task
 * @param {string} [sourceMessageId]
 * @returns {Promise<{ duplicate: boolean, id: string | null, task: object }>}
 */
export async function createTaskForUser(uid, task, sourceMessageId = "") {
  const normalizedMessageId = sanitizeMessageId(sourceMessageId);
  if (normalizedMessageId) {
    const existing = await findExistingTaskForMessage(uid, sourceMessageId);
    if (existing) return existing;
  }

  const ref = getDatabase().ref(`users/${uid}/tasks`).push();
  await ref.set(task);

  if (normalizedMessageId) {
    await getDatabase()
      .ref(`users/${uid}/processedEmails/${normalizedMessageId}`)
      .set({
        taskId: ref.key,
        processedAt: Date.now(),
      });
  }

  return { duplicate: false, id: ref.key, task };
}
