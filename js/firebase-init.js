/**
 * Initialisiert Firebase App, Auth und Database (Compat SDK).
 */
(function initFirebase() {
  const config = window.FIREBASE_CONFIG;
  if (!config?.apiKey) {
    console.warn(
      "JOIN: Firebase apiKey fehlt in js/firebase-config.js – Auth und DB-Zugriff funktionieren nicht."
    );
    return;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(config);
  }

  window.firebaseAuth = firebase.auth();
  window.firebaseDb = firebase.database();

  window.firebaseAuth.onAuthStateChanged((user) => {
    if (user) {
      window.USERKEY = user.uid;
      localStorage.setItem("loggedInUserKey", user.uid);
      if (user.isAnonymous) {
        localStorage.setItem("guestMode", "true");
      }
    }
    window.dispatchEvent(new CustomEvent("join-auth-ready", { detail: { user } }));
  });
})();
