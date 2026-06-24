/**
 * Task API helpers: provide per-user task endpoints and seeding for new users.
 */

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
window.seedUserTasksIfEmpty = seedUserTasksIfEmpty;
window.ensureUserContactsIfEmpty = ensureUserContactsIfEmpty;
