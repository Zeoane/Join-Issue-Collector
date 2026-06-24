/**
 * Join-Issue Collector – globale Konfiguration und gemeinsame UI-Funktionen.
 */

window.BASE_URL = "https://join-issue-collector-70cb7-default-rtdb.europe-west1.firebasedatabase.app/";
window.USERKEY = null;

/** @type {string} */
const BASE_URL = window.BASE_URL;

/**
 * @type {Array<{ name: string, email: string, phone: string, color: string }>}
 */
const demoContacts = [
  { name: "Anna Becker", email: "anna@example.com", phone: "123456789", color: "#FF7A00" },
  { name: "Tom Meier", email: "tom@example.com", phone: "987654321", color: "#FF5EB3" },
  { name: "Lisa Schmidt", email: "lisa@example.com", phone: "555123456", color: "#6E52FF" },
  { name: "Peter Braun", email: "peter@example.com", phone: "333222111", color: "#9327FF" },
  { name: "Nina Keller", email: "nina@example.com", phone: "444555666", color: "#00BEE8" },
  { name: "Max Fischer", email: "max@example.com", phone: "666777888", color: "#00BEE8" },
  { name: "Julia König", email: "julia@example.com", phone: "777888999", color: "#FF745E" },
  { name: "Leon Wagner", email: "leon@example.com", phone: "111222333", color: "#FFA35E" },
  { name: "Emma Roth", email: "emma@example.com", phone: "222333444", color: "#FC71FF" },
  { name: "Paul Weber", email: "paul@example.com", phone: "999000111", color: "#FC71FF" },
];

/**
 * Toggles the visibility of the profile menu.
 * @returns {void}
 */
function toggleMenu() {
  const menu = document.getElementById("menu");
  if (!menu) return;
  menu.classList.toggle("not-visible");

  document.body.onclick = !menu.classList.contains("not-visible")
    ? (e) => {
        const userProfile = document.getElementById("userProfile");
        if (
          !menu.contains(e.target) &&
          userProfile &&
          !userProfile.contains(e.target)
        ) {
          menu.classList.add("not-visible");
          document.body.onclick = null;
        }
      }
    : null;
}

/**
 * @returns {void}
 */
function linkesNavMenuVersion() {
  const page = window.location.pathname.split("/").pop().split(".")[0];
  const navMenu = document.getElementById("linkesNavMenu");
  if (!navMenu) return;

  if (page === "legal-notice-login" || page === "privacy-login") {
    navMenu.innerHTML = linkesNavLogin(page);
  } else {
    navMenu.innerHTML = linkesNav(page);
  }
}

/**
 * @returns {void}
 */
function showHideHelpAndUser() {
  const page = window.location.pathname.split("/").pop().split(".")[0];
  const helpLink = document.getElementById("helpLink");
  const userProfile = document.getElementById("userProfile");
  if (!helpLink || !userProfile) return;

  if (
    page === "legal-notice-login" ||
    page === "privacy-login" ||
    page === "privacy" ||
    page === "legal-notice"
  ) {
    helpLink.classList.add("displayNone");
    userProfile.classList.add("displayNone");
  } else if (page === "help") {
    helpLink.classList.add("displayNone");
    userProfile.classList.remove("displayNone");
  } else {
    helpLink.classList.remove("displayNone");
    userProfile.classList.remove("displayNone");
  }
}

/**
 * @returns {void}
 */
function addHeader() {
  const headerEl = document.getElementById("header");
  if (headerEl && typeof renderHeaderContent === "function") {
    headerEl.innerHTML = renderHeaderContent();
  }
}

/**
 * @returns {Promise<void>}
 */
async function init() {
  addHeader();
  linkesNavMenuVersion();
  showHideHelpAndUser();
  await setUserInitials();
}

/**
 * @returns {Promise<void>}
 */
async function setUserInitials() {
  const initialsEl = document.getElementById("userInitials");
  if (!initialsEl) return;

  if (!window.USERKEY && typeof waitForAuthUser === "function") {
    const authUser = await waitForAuthUser();
    if (authUser && typeof syncSessionFromUser === "function") {
      syncSessionFromUser(authUser);
    }
  }

  if (!window.USERKEY) {
    initialsEl.innerText = "?";
    return;
  }

  try {
    const user = await loadData(`users/${window.USERKEY}`);
    if (user?.name) {
      initialsEl.innerText = contactIconSpan(user.name);
    } else {
      initialsEl.innerText = "?";
    }
  } catch (error) {
    console.error("Fehler beim Laden der Userdaten:", error);
    initialsEl.innerText = "?";
  }
}

window.setUserInitials = setUserInitials;

window.addEventListener("join-auth-ready", (event) => {
  if (!event.detail?.user || !document.getElementById("userInitials")) return;
  if (typeof syncSessionFromUser === "function") {
    syncSessionFromUser(event.detail.user);
  }
  setUserInitials();
});

/**
 * @param {MouseEvent} [event]
 * @returns {Promise<void>}
 */
async function logout(event) {
  event?.preventDefault();
  try {
    if (typeof signOutUser === "function") {
      await signOutUser();
    } else {
      localStorage.clear();
      window.USERKEY = null;
    }
  } catch (err) {
    console.error("Logout fehlgeschlagen:", err);
  }
  window.location.href = "../../index.html";
}

window.toggleMenu = toggleMenu;
window.logout = logout;
window.init = init;
window.demoContacts = demoContacts;
