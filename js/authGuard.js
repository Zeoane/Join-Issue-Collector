/**
 * Zentraler Auth-Guard für geschützte Seiten.
 */

/**
 * Prüft synchron, ob ein Session-Key vorhanden ist (Schnell-Check).
 * @param {string} [redirectUrl="../../index.html"]
 * @returns {boolean}
 */
function protectPageAccess(redirectUrl = "../../index.html") {
  const userKey = window.USERKEY || localStorage.getItem("loggedInUserKey");
  if (!userKey) {
    window.location.href = redirectUrl;
    return false;
  }
  return true;
}

/**
 * Wartet auf Firebase Auth und leitet um, wenn nicht angemeldet.
 * @param {string} [redirectUrl="../../index.html"]
 * @returns {Promise<boolean>}
 */
function ensureAuthenticated(redirectUrl = "../../index.html") {
  if (!window.firebaseAuth) {
    return Promise.resolve(protectPageAccess(redirectUrl));
  }

  return waitForAuthUser().then((user) => {
    if (!user) {
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
 * Auto-Guard: Seiten mit data-auth="required" werden geschützt.
 */
(function autoGuardProtectedPages() {
  const body = document.body;
  if (!body || body.dataset.auth !== "required") return;

  const redirect = body.dataset.authRedirect || "../../index.html";

  if (!protectPageAccess(redirect)) return;

  if (window.firebaseAuth) {
    ensureAuthenticated(redirect);
  }
})();
