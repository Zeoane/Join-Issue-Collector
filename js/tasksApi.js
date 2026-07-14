/**
 * Task API helpers: provide per-user task endpoints and seeding for new users.
 */

const BOARD_TASKS_SYNC_ENDPOINT = "/internal/sync-board-tasks";

/**
 * @returns {string} Relativer DB-Pfad ohne .json (für authFetch).
 */
function getUserTasksUrl() {
  return `users/${window.USERKEY}/tasks`;
}

/**
 * @param {string} id
 * @returns {string} Relativer DB-Pfad ohne .json (für authFetch).
 */
function getUserTaskItemUrl(id) {
  return `users/${window.USERKEY}/tasks/${id}`;
}

/**
 * Backfills missing tasks from the canonical demo board for members and guests.
 * @returns {Promise<{ synced?: number, totalSourceTasks?: number }|null>}
 */
async function syncUserBoardTasks() {
  if (!window.USERKEY || !window.firebaseAuth?.currentUser) return null;

  try {
    const token = await window.firebaseAuth.currentUser.getIdToken();
    const response = await fetch(BOARD_TASKS_SYNC_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Board task sync failed:", response.status);
      return null;
    }

    return response.json();
  } catch (err) {
    console.error("Board task sync error:", err);
    return null;
  }
}

/**
 * Seed up to 5 tasks for a new user from the global base tasks.
 */
async function seedUserTasksIfEmpty() {
  if (!window.USERKEY) return;
  try {
    const userData = await loadData(`users/${window.USERKEY}/tasks`);
    if (userData && Object.keys(userData).length > 0) return;

    const baseData = (await loadData("tasks")) || {};
    const entries = Object.entries(baseData);
    if (entries.length === 0) return;

    const toSeed = entries.slice(0, 5).map(([, task]) => task);
    await Promise.all(toSeed.map((task) => postData(`users/${window.USERKEY}/tasks`, task)));
  } catch (err) {
    console.error("Error seeding user tasks:", err);
  }
}

/**
 * Legt Demo-Kontakte an, wenn der User noch keine hat.
 */
async function ensureUserContactsIfEmpty() {
  if (!window.USERKEY) return;
  try {
    const data = await loadData(`users/${window.USERKEY}/contacts`);
    if (data && Object.keys(data).length > 0) return;
    if (!window.demoContacts?.length) return;

    await Promise.all(
      window.demoContacts.map((contact) =>
        postData(`users/${window.USERKEY}/contacts`, contact)
      )
    );
  } catch (err) {
    console.error("Error seeding user contacts:", err);
  }
}

window.getUserTasksUrl = getUserTasksUrl;
window.getUserTaskItemUrl = getUserTaskItemUrl;
window.syncUserBoardTasks = syncUserBoardTasks;
window.seedUserTasksIfEmpty = seedUserTasksIfEmpty;
window.ensureUserContactsIfEmpty = ensureUserContactsIfEmpty;
