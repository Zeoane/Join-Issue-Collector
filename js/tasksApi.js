/**
 * Task API helpers: per-user task endpoints and seeding for new users.
 */

const BOARD_TASKS_SYNC_ENDPOINT = "/internal/sync-board-tasks";

/**
 * @returns {string} Relative DB path without .json (for authFetch).
 */
function getUserTasksUrl() {
  return `users/${window.USERKEY}/tasks`;
}

/**
 * @param {string} id
 * @returns {string} Relative DB path without .json (for authFetch).
 */
function getUserTaskItemUrl(id) {
  return `users/${window.USERKEY}/tasks/${id}`;
}

/**
 * Posts a board-tasks sync request with the given token.
 * @param {string} token
 * @returns {Promise<Response>}
 */
function postBoardTasksSync(token) {
  return fetch(BOARD_TASKS_SYNC_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
}

/**
 * Backfills missing tasks from the canonical demo board.
 * @returns {Promise<{ synced?: number, totalSourceTasks?: number }|null>}
 */
async function syncUserBoardTasks() {
  const user =
    window.firebaseAuth?.currentUser ||
    (typeof waitForAuthUser === "function" ? await waitForAuthUser() : null);
  if (!window.USERKEY || !user) return null;
  try {
    return await runBoardTasksSync(user);
  } catch (err) {
    console.warn("Board task sync error:", err);
    return null;
  }
}

/**
 * @param {firebase.User} user
 * @returns {Promise<{ synced?: number, totalSourceTasks?: number }|null>}
 */
async function runBoardTasksSync(user) {
  let token = await user.getIdToken();
  let response = await postBoardTasksSync(token);
  if (response.status === 401) {
    token = await user.getIdToken(true);
    response = await postBoardTasksSync(token);
  }
  if (!response.ok) {
    console.warn("Board task sync failed:", response.status);
    return null;
  }
  return response.json();
}

/**
 * Seeds up to 5 tasks for a new user from the global base tasks.
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
 * Seeds demo contacts when the user has none.
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
