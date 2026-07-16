/**
 * Main entry: fetch and process all assignable people.
 * @param {string} userKey
 * @returns {Promise<Array<object>>}
 */
async function getAssignablePeople(userKey) {
  if (!userKey) { console.error("UserKey required"); return []; }
  try {
    const [allUsersData, personalContactsData, ownUser] = await fetchPeopleData(userKey);
    const peopleMap = new Map();
    processUsersInMap(peopleMap, allUsersData);
    addOwnUserToPeopleMap(peopleMap, ownUser);
    processContactsInMap(peopleMap, personalContactsData);
    return finalizePeopleList(peopleMap);
  } catch (e) {
    console.error("Error loading assignable people:", e);
    return [];
  }
}

/**
 * Fetches global users, personal contacts, and own user in parallel.
 * @param {string} userKey
 * @returns {Promise<[object, object, object]>}
 */
async function fetchPeopleData(userKey) {
  return await Promise.all([
    loadData('users'),
    loadData(`users/${userKey}/contacts`),
    loadData(`users/${userKey}`)
  ]);
}

/**
 * Adds the signed-in user to the people map.
 * @param {Map<string, object>} peopleMap
 * @param {object|null|undefined} ownUser
 */
function addOwnUserToPeopleMap(peopleMap, ownUser) {
  if (!ownUser) return;
  const eml = (ownUser.email || "").trim().toLowerCase();
  const key = eml || (ownUser.name || "").trim().toLowerCase();
  if (!key) return;
  peopleMap.set(key, {
    name: ownUser.name || extractNameFromEmail(eml),
    email: eml,
    color: ownUser.color || getRandomColor()
  });
}

/**
 * Adds global users to the people map.
 * @param {Map<string, object>} peopleMap
 * @param {object} allUsersData
 */
function processUsersInMap(peopleMap, allUsersData) {
  if (!allUsersData) return;
  Object.values(allUsersData).forEach(user => {
    const eml = (user?.email || "").trim().toLowerCase();
    if (!eml) return;
    peopleMap.set(eml, {
      name: extractNameFromEmail(eml),
      email: eml,
      color: user.color || getRandomColor()
    });
  });
}

/**
 * Upserts a single contact into the people map.
 * @param {Map<string, object>} peopleMap
 * @param {object} contact
 */
function upsertContactInMap(peopleMap, contact) {
  const name = (contact?.name || "").trim();
  const email = (contact?.email || "").trim().toLowerCase();
  const key = (email || name).toLowerCase();
  if (!key) return;
  const existing = peopleMap.get(key) || {};
  peopleMap.set(key, {
    name: name || extractNameFromEmail(email),
    email: email,
    phone: contact.phone || "",
    color: contact.color || existing.color || getRandomColor()
  });
}

/**
 * Adds or updates personal contacts in the people map.
 * @param {Map<string, object>} peopleMap
 * @param {object} personalContactsData
 */
function processContactsInMap(peopleMap, personalContactsData) {
  if (!personalContactsData) return;
  Object.values(personalContactsData).forEach((contact) => {
    upsertContactInMap(peopleMap, contact);
  });
}

/**
 * Converts the people map into a sorted array.
 * @param {Map<string, object>} peopleMap
 * @returns {Array<object>}
 */
function finalizePeopleList(peopleMap) {
  const finalList = Array.from(peopleMap.values());
  finalList.sort((a, b) => a.name.localeCompare(b.name));
  return finalList;
}

/**
 * Extracts and formats a name from an email address.
 * @param {string} email
 * @returns {string}
 */
function extractNameFromEmail(email) {
  if (!email) return "Unknown";
  return email
    .split("@")[0]
    .replace(/[._]/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Builds the own-contact card element.
 * @param {{name:string,email?:string}} contact
 * @returns {{card: HTMLElement, initials: string}}
 */
function buildOwnContactCardElement(contact) {
  const initials = getInitials(contact.name);
  const card = document.createElement("div");
  card.className = "contactCard";
  card.setAttribute("data-key", "ownContact");
  card.innerHTML = getOwnContactCardHtml(contact, initials);
  return { card, initials };
}

/**
 * Wires click behavior for the own-contact card.
 * @param {HTMLElement} card
 * @param {{name:string,email?:string,phone?:string}} contact
 */
function wireOwnCardClick(card, contact) {
  card.addEventListener("click", () => {
    editingOwnContact = true;
    deactivateAllContactCards();
    activateContactCard(card);
    document.getElementById("contactsDetails").classList.add("showDetails");
    showOwnContactCardDetails(contact);
  });
}

/**
 * Creates a contact list card element.
 * @param {string} key
 * @param {{name:string,email?:string,color?:string}} contact
 * @returns {HTMLElement}
 */
function createContactCardElement(key, contact) {
  const initials = getInitials(contact.name);
  const card = document.createElement("div");
  card.className = "contactCard";
  card.setAttribute("data-key", key);
  card.innerHTML = getContendCardHtml(contact, initials, contact.color);
  return card;
}

/**
 * Applies mobile setup when showing contact details.
 * @param {string} key
 */
function applyMobileDetailsSetup(key) {
  const container = document.querySelector(".contactsContainer");
  container.style.display = "flex";
  showcontactCardDetails(key);
  const btn = document.getElementById("mobileAddBtn");
  btn.setAttribute("onclick", "toggleMobileMenu()");
  document.getElementById("mobileBtnIcon").src = "../img/more_vert.png";
}

/**
 * Deletes a contact from Firebase and updates the UI.
 * @param {string} key
 * @param {boolean} [closeOverlay=false]
 */
async function deleteContact(key, closeOverlay = false) {
  await deleteData(`${getContactsBasePath()}/${key}`);
  invalidateContactColorsCache?.();
  document.getElementById("contactsDetails").innerHTML = "";
  document.getElementById("contactsDetails").classList.remove("showDetails");
  await loadDataAfterSave();
  if (closeOverlay) toggleOverlay();
  closeMobileDetails();
  showSuccessOverlay("Contact deleted!");
}

/**
 * Reloads contacts from Firebase and re-renders the list.
 */
async function loadDataAfterSave() {
  const newContacts = await loadData(getContactsBasePath());
  contactsData = newContacts || {};
  renderContacts(contactsData);
}

/**
 * Mobile edit handler.
 */
function handleEditMobile() {
  if (editingOwnContact === true) {
    loadData(`users/${window.USERKEY}`).then((ownContact) => {
      editOwnContact(ownContact);
    });
    toggleMobileMenu();
    return;
  }
  if (activeContactKey) {
    editContact(activeContactKey);
    toggleMobileMenu();
  }
}

/**
 * Mobile delete handler.
 */
function handleDeleteMobile() {
  if (activeContactKey) {
    deleteContact(activeContactKey);
    toggleMobileMenu();
  }
  closeMobileDetails();
}

/**
 * Prefills edit form fields.
 * @param {{name:string,email?:string,phone?:string}} contact
 * @param {string} key
 */
function prefillFormWithContactData(contact, key) {
  document.getElementById("contactKey").value = key;
  document.getElementById("name").value = contact.name;
  document.getElementById("email").value = contact.email;
  document.getElementById("phone").value = contact.phone;
}

/**
 * Renders the edit avatar with initials.
 * @param {{name:string,color?:string}} contact
 */
function renderEditAvatar(contact) {
  const initials = getInitials(contact.name);
  const color = contact.color;
  const avatarContainer = document.getElementById("editAvatarContainer");
  avatarContainer.innerHTML = `
    <div class="BigContactCircle" style="background-color: ${color};">
      ${initials}
    </div>
  `;
}

/**
 * Adjusts UI for own-contact details on mobile.
 */
function showOwnContactDetailsMobile() {
  const container = document.querySelector(".contactsContainer");
  container.style.display = "flex";
  const btn = document.getElementById("mobileAddBtn");
  btn.setAttribute("onclick", "toggleMobileMenu()");
  document.getElementById("mobileBtnIcon").src = "../img/more_vert.png";
}

/**
 * Toggles the mobile menu overlay.
 */
function toggleMobileMenu() {
  const menu = document.getElementById("menuOverlay");
  menu.classList.toggle("open");
}

/**
 * Closes mobile details and resets the FAB.
 */
function closeMobileDetails() {
  const container = document.querySelector(".contactsContainer");
  if (window.matchMedia("(max-width: 899px)").matches && container) {
    container.style.display = "none";
  }
  deactivateAllContactCards();
  const btn = document.getElementById("mobileAddBtn");
  btn.setAttribute("onclick", "openNewContactForm()");
  document.getElementById("mobileBtnIcon").src = "../img/person_add.png";
}

/**
 * Creates a single contact list card with click handling.
 * @param {string} key
 * @param {{name:string,email?:string,color?:string}} contact
 * @returns {HTMLElement}
 */
function createContactCard(key, contact) {
  const card = createContactCardElement(key, contact);
  card.addEventListener("click", () => {
    activeContactKey = key;
    deactivateAllContactCards();
    activateContactCard(card);
    if (window.innerWidth < 799) applyMobileDetailsSetup(key);
    else showcontactCardDetails(key);
  });
  return card;
}
