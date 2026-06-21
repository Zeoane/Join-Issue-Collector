/**
 * Firebase Authentication – Login, Signup, Guest, Logout.
 */

/**
 * @returns {Promise<firebase.User|null>}
 */
async function waitForAuthUser() {
  if (window.firebaseAuth?.currentUser) {
    return window.firebaseAuth.currentUser;
  }
  return new Promise((resolve) => {
    const unsub = window.firebaseAuth.onAuthStateChanged((user) => {
      unsub();
      resolve(user);
    });
  });
}

/**
 * @param {firebase.User} user
 */
function syncSessionFromUser(user) {
  window.USERKEY = user.uid;
  localStorage.setItem("loggedInUserKey", user.uid);
}
window.syncSessionFromUser = syncSessionFromUser;

/**
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{success:boolean,error?:string}>}
 */
async function signInWithEmail(email, password) {
  try {
    if (!window.firebaseAuth) return { success: false, error: "firebase-not-configured" };
    localStorage.removeItem("guestMode");
    const credential = await window.firebaseAuth.signInWithEmailAndPassword(email, password);
    syncSessionFromUser(credential.user);
    return { success: true };
  } catch (err) {
    console.error("Login-Fehler:", err);
    return { success: false, error: err.code || "auth-error" };
  }
}

/**
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{success:boolean,error?:string}>}
 */
async function signUpWithEmail(name, email, password) {
  try {
    if (!window.firebaseAuth) return { success: false, error: "firebase-not-configured" };
    localStorage.removeItem("guestMode");
    const credential = await window.firebaseAuth.createUserWithEmailAndPassword(email, password);
    const uid = credential.user.uid;
    await putData(`users/${uid}`, { name, email, guest: false });
    syncSessionFromUser(credential.user);
    return { success: true };
  } catch (err) {
    console.error("Signup-Fehler:", err);
    return { success: false, error: err.code || "auth-error" };
  }
}

/**
 * @returns {Promise<string|null>} UID des Gastes
 */
async function signInAsGuest() {
  if (!window.firebaseAuth) throw new Error("Firebase nicht konfiguriert");
  const credential = await window.firebaseAuth.signInAnonymously();
  const uid = credential.user.uid;
  await putData(`users/${uid}`, {
    name: "Guest",
    email: "",
    guest: true,
  });
  localStorage.setItem("guestMode", "true");
  syncSessionFromUser(credential.user);
  return uid;
}

/**
 * Meldet den Benutzer ab und löscht Gast-Daten.
 * @returns {Promise<void>}
 */
async function signOutUser() {
  const isGuest = localStorage.getItem("guestMode") === "true";
  const uid = window.USERKEY || localStorage.getItem("loggedInUserKey");

  if (isGuest && uid) {
    try {
      await deleteData(`users/${uid}`);
    } catch (err) {
      console.error("Gast-Daten konnten nicht gelöscht werden:", err);
    }
  }

  if (window.firebaseAuth) {
    await window.firebaseAuth.signOut();
  }

  localStorage.clear();
  window.USERKEY = null;
}

window.signInWithEmail = signInWithEmail;
window.signUpWithEmail = signUpWithEmail;
window.signInAsGuest = signInAsGuest;
window.signOutUser = signOutUser;
window.waitForAuthUser = waitForAuthUser;
