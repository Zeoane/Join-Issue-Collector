/**
 * Firebase Authentication – Login, Signup, Guest, Logout.
 */

/** @type {Record<string, { signup?: string, login?: string, default?: string }>} */
const AUTH_ERROR_MESSAGES = {
  "auth/email-already-in-use": {
    signup:
      "Diese E-Mail ist bereits registriert. Bitte melde dich an oder nutze eine andere Adresse.",
    login: "Diese E-Mail ist bereits registriert. Bitte melde dich an.",
  },
  "auth/invalid-email": {
    default: "Bitte gib eine gültige E-Mail-Adresse ein.",
  },
  "auth/weak-password": {
    signup: "Das Passwort ist zu schwach. Bitte mindestens 6 Zeichen verwenden.",
  },
  "auth/user-not-found": {
    login: "Es existiert kein Konto mit dieser E-Mail. Bitte registriere dich zuerst.",
  },
  "auth/wrong-password": {
    login: "E-Mail oder Passwort ist falsch. Bitte erneut versuchen.",
  },
  "auth/invalid-credential": {
    login: "E-Mail oder Passwort ist falsch. Bitte erneut versuchen.",
  },
  "auth/too-many-requests": {
    default: "Zu viele Versuche. Bitte warte kurz und versuche es erneut.",
  },
  "auth/network-request-failed": {
    default: "Keine Verbindung zu Firebase. Bitte Internetverbindung prüfen.",
  },
  "auth/operation-not-allowed": {
    signup:
      "E-Mail-Registrierung ist in Firebase noch nicht aktiviert. Bitte den Admin informieren.",
    login: "E-Mail-Anmeldung ist in Firebase noch nicht aktiviert. Bitte den Admin informieren.",
  },
  "firebase-not-configured": {
    default: "Firebase ist nicht konfiguriert. Bitte js/firebase-config.js prüfen.",
  },
};

/**
 * Clears local session data.
 * @returns {void}
 */
function clearSessionStorage() {
  window.USERKEY = null;
  localStorage.removeItem("loggedInUserKey");
  localStorage.removeItem("guestMode");
}

/**
 * @param {string} [code]
 * @param {"signup"|"login"} [flow="login"]
 * @returns {string}
 */
function getAuthErrorMessage(code, flow = "login") {
  const entry = code ? AUTH_ERROR_MESSAGES[code] : null;
  if (entry?.[flow]) return entry[flow];
  if (entry?.default) return entry.default;
  return flow === "signup"
    ? "Registrierung fehlgeschlagen. Bitte versuche es erneut."
    : "Anmeldung fehlgeschlagen. Bitte E-Mail und Passwort prüfen.";
}

/**
 * @param {"signup"|"login"} flow
 * @returns {{success:false,error:string,message:string}}
 */
function firebaseNotConfiguredResult(flow) {
  return {
    success: false,
    error: "firebase-not-configured",
    message: getAuthErrorMessage("firebase-not-configured", flow),
  };
}

/**
 * @param {unknown} err
 * @param {"signup"|"login"} flow
 * @returns {{success:false,error:string,message:string}}
 */
function authFailureResult(err, flow) {
  const error = err?.code || "auth-error";
  return { success: false, error, message: getAuthErrorMessage(error, flow) };
}

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
 * @returns {Promise<{success:boolean,error?:string,message?:string}>}
 */
async function signInWithEmail(email, password) {
  try {
    if (!window.firebaseAuth) return firebaseNotConfiguredResult("login");
    localStorage.removeItem("guestMode");
    const credential = await window.firebaseAuth.signInWithEmailAndPassword(email, password);
    syncSessionFromUser(credential.user);
    return { success: true };
  } catch (err) {
    console.error("Login-Fehler:", err);
    return authFailureResult(err, "login");
  }
}

/**
 * Persists a new user profile after Firebase signup.
 * @param {firebase.User} user
 * @param {string} name
 * @param {string} email
 */
async function persistSignedUpUser(user, name, email) {
  await putData(`users/${user.uid}`, {
    name,
    email,
    guest: false,
    color: getRandomColor(),
  });
  syncSessionFromUser(user);
}

/**
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{success:boolean,error?:string,message?:string}>}
 */
async function signUpWithEmail(name, email, password) {
  try {
    if (!window.firebaseAuth) return firebaseNotConfiguredResult("signup");
    localStorage.removeItem("guestMode");
    const credential = await window.firebaseAuth.createUserWithEmailAndPassword(email, password);
    await persistSignedUpUser(credential.user, name, email);
    return { success: true };
  } catch (err) {
    console.error("Signup-Fehler:", err);
    return authFailureResult(err, "signup");
  }
}

/**
 * @returns {Promise<string|null>} Guest UID
 */
async function signInAsGuest() {
  if (!window.firebaseAuth) throw new Error("Firebase nicht konfiguriert");
  const credential = await window.firebaseAuth.signInAnonymously();
  const uid = credential.user.uid;
  await putData(`users/${uid}`, {
    name: "Guest",
    email: "",
    guest: true,
    color: getRandomColor(),
  });
  localStorage.setItem("guestMode", "true");
  syncSessionFromUser(credential.user);
  return uid;
}

/**
 * Deletes guest user data when logging out as guest.
 */
async function deleteGuestDataIfNeeded() {
  const isGuest = localStorage.getItem("guestMode") === "true";
  const uid = window.USERKEY || localStorage.getItem("loggedInUserKey");
  if (!isGuest || !uid) return;
  try {
    await deleteData(`users/${uid}`);
  } catch (err) {
    console.error("Gast-Daten konnten nicht gelöscht werden:", err);
  }
}

/**
 * Signs the user out and clears guest data.
 * @returns {Promise<void>}
 */
async function signOutUser() {
  await deleteGuestDataIfNeeded();
  if (window.firebaseAuth) await window.firebaseAuth.signOut();
  localStorage.clear();
  window.USERKEY = null;
}

window.getAuthErrorMessage = getAuthErrorMessage;
window.clearSessionStorage = clearSessionStorage;
window.signInWithEmail = signInWithEmail;
window.signUpWithEmail = signUpWithEmail;
window.signInAsGuest = signInAsGuest;
window.signOutUser = signOutUser;
window.waitForAuthUser = waitForAuthUser;
