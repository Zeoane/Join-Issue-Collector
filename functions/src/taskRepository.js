import { getDatabase } from "./firebaseAdmin.js";

/**
 * Stores a task under users/{uid}/tasks and returns its Firebase key.
 * @param {string} uid
 * @param {object} task
 * @returns {Promise<{ id: string, task: object }>}
 */
export async function createTaskForUser(uid, task) {
  const ref = getDatabase().ref(`users/${uid}/tasks`).push();
  await ref.set(task);
  return { id: ref.key, task };
}
