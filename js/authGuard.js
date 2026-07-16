/**
 * Central auth guard for protected pages.
 */

/**
 * Fast check: valid only if Firebase already has a user.
 * @param {string} [redirectUrl="../../index.html"]
 * @returns {boolean}
 */
function protectPageAccess(redirectUrl = "../../index.html") {
  if (window.firebaseAuth?.currentUser) {
    syncSessionFromUser(window.firebaseAuth.currentUser);
    return true;
  }
  if (window.firebaseAuth) return false;
  const userKey = window.USERKEY || localStorage.getItem("loggedInUserKey");
  if (userKey) return true;
  window.location.href = redirectUrl;
  return false;
}

/**
 * Waits for Firebase Auth and redirects if not signed in.
 * @param {string} [redirectUrl="../../index.html"]
 * @returns {Promise<boolean>}
 */
function ensureAuthenticated(redirectUrl = "../../index.html") {
  if (!window.firebaseAuth) {
    clearSessionStorage();
    window.location.href = redirectUrl;
    return Promise.resolve(false);
  }
  return waitForAuthUser().then((user) => {
    if (!user) {
      clearSessionStorage();
      window.location.href = redirectUrl;
      return false;
    }
    syncSessionFromUser(user);
    return true;
  });
}

window.protectPageAccess = protectPageAccess;
window.ensureAuthenticated = ensureAuthenticated;

/**
 * Auto-guard: pages with data-auth="required" are protected.
 */
(function autoGuardProtectedPages() {
  const body = document.body;
  if (!body || body.dataset.auth !== "required") return;
  const redirect = body.dataset.authRedirect || "../../index.html";
  ensureAuthenticated(redirect);
})();
