import { getDatabase } from "../config/firebaseAdmin.js";

/**
 * Persists a normalized task under users/{uid}/tasks.
 * @param {string} uid
 * @param {object} task
 * @returns {Promise<{ id: string, task: object }>}
 */
export async function createTaskForUser(uid, task) {
  const db = getDatabase();
  const ref = db.ref(`users/${uid}/tasks`).push();
  await ref.set(task);
  return { id: ref.key, task };
}
