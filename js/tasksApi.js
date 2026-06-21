/**
 * Task API helpers: provide per-user task endpoints and seeding for new users.
 */

/**
 * @returns {string}
 */
function getUserTasksUrl() {
  return `${BASE_URL}users/${USERKEY}/tasks.json`;
}

/**
 * @param {string} id
 * @returns {string}
 */
function getUserTaskItemUrl(id) {
  return `${BASE_URL}users/${USERKEY}/tasks/${id}.json`;
}

/**
 * Seed up to 5 tasks for a new user from the global base tasks.
 */
async function seedUserTasksIfEmpty() {
  if (!USERKEY) return;
  try {
    const userData = await loadData(`users/${USERKEY}/tasks`);
    if (userData && Object.keys(userData).length > 0) return;

    const baseData = (await loadData("tasks")) || {};
    const entries = Object.entries(baseData);
    if (entries.length === 0) return;

    const toSeed = entries.slice(0, 5).map(([, task]) => task);
    await Promise.all(toSeed.map((task) => postData(`users/${USERKEY}/tasks`, task)));
  } catch (err) {
    console.error("Error seeding user tasks:", err);
  }
}

window.getUserTasksUrl = getUserTasksUrl;
window.getUserTaskItemUrl = getUserTaskItemUrl;
window.seedUserTasksIfEmpty = seedUserTasksIfEmpty;
