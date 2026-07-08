/**
 * Fetches contacts for the current user from Firebase.
 * @returns {Promise<Array<[string, {name:string}]>>} Filtered entries with names
 */
async function ensureAuthReadyForAssignees() {
  if (window.firebaseAuth?.currentUser && window.USERKEY) return;
  const user = await waitForAuthUser();
  if (user) syncSessionFromUser(user);
  if (!window.USERKEY) throw new Error("Not authenticated");
}

/**
 * Loads and normalizes assignee contacts.
 * @returns {Promise<Array<[string, {name:string,email?:string,color?:string}]>>}
 */
async function fetchContactsData() {
  await ensureAuthReadyForAssignees();
  await ensureUserContactsIfEmpty();
  const [contactsData, ownUser] = await loadContactsWithOwner();
  await loadAllContactColors();
  const entries = filterNamedContacts(contactsData);
  prependOwnerIfMissing(entries, ownUser);
  return entries;
}

/**
 * Loads contacts map and own user profile.
 * @returns {Promise<[Object, Object]>}
 */
function loadContactsWithOwner() {
  return Promise.all([
    loadData(`users/${window.USERKEY}/contacts`),
    loadData(`users/${window.USERKEY}`),
  ]);
}

/**
 * Keeps only contact entries that contain a name.
 * @param {Object} contactsData
 * @returns {Array<[string, {name:string}]>}
 */
function filterNamedContacts(contactsData) {
  return Object.entries(contactsData || {}).filter(([, contact]) => contact?.name);
}

/**
 * Adds the own user as "__self__" entry when not present.
 * @param {Array<[string, {name:string}]>} entries
 * @param {{name?:string,email?:string,color?:string}} ownUser
 */
function prependOwnerIfMissing(entries, ownUser) {
  if (!ownerShouldBeAdded(entries, ownUser)) return;
  entries.unshift(["__self__", createOwnerContact(ownUser)]);
}

/**
 * Checks whether own user contact should be prepended.
 * @param {Array<[string, {name:string}]>} entries
 * @param {{name?:string}} ownUser
 * @returns {boolean}
 */
function ownerShouldBeAdded(entries, ownUser) {
  if (!ownUser?.name) return false;
  return !entries.some(([, contact]) => contact.name === ownUser.name);
}

/**
 * Builds normalized contact object for the own user.
 * @param {{name:string,email?:string,color?:string}} ownUser
 * @returns {{name:string,email:string,color:string}}
 */
function createOwnerContact(ownUser) {
  return {
    name: ownUser.name,
    email: ownUser.email || "",
    color: ownUser.color || "#2A3647",
  };
}
