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
 * @returns {Promise<string[]>}
 */
async function listUserIds() {
  const usersSnap = await getDatabase().ref("users").get();
  if (!usersSnap.exists()) return [];
  const users = usersSnap.val();
  if (!users || typeof users !== "object") return [];

  return Object.entries(users)
    .filter(([uid, profile]) => {
      if (!uid || uid === "guests") return false;
      return profile && typeof profile === "object";
    })
    .map(([uid]) => uid);
}

/**
 * @param {string} sourceUid
 * @param {string} taskId
 * @param {object} task
 * @returns {Promise<void>}
 */
async function mirrorTaskToAllUsers(sourceUid, taskId, task) {
  const userIds = await listUserIds();
  await Promise.all(
    userIds
      .filter((uid) => uid !== sourceUid)
      .map((uid) => getDatabase().ref(`users/${uid}/tasks/${taskId}`).set(task))
  );
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

/**
 * Stores an n8n task under the source user and mirrors it to every user board.
 * Uses sourceMessageId de-duplication based on the source user key-space.
 * @param {string} sourceUid
 * @param {object} task
 * @param {string} [sourceMessageId]
 * @returns {Promise<{ duplicate: boolean, id: string | null, task: object }>}
 */
export async function createTaskForAllUsers(
  sourceUid,
  task,
  sourceMessageId = ""
) {
  const normalizedMessageId = sanitizeMessageId(sourceMessageId);
  if (normalizedMessageId) {
    const existing = await findExistingTaskForMessage(sourceUid, sourceMessageId);
    if (existing) {
      await mirrorTaskToAllUsers(sourceUid, existing.id, existing.task);
      return existing;
    }
  }

  const ref = getDatabase().ref(`users/${sourceUid}/tasks`).push();
  await ref.set(task);
  if (normalizedMessageId) {
    await getDatabase()
      .ref(`users/${sourceUid}/processedEmails/${normalizedMessageId}`)
      .set({
        taskId: ref.key,
        processedAt: Date.now(),
      });
  }

  if (ref.key) {
    await mirrorTaskToAllUsers(sourceUid, ref.key, task);
  }

  return { duplicate: false, id: ref.key, task };
}
