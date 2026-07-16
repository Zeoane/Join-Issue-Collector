import admin from "firebase-admin";

/**
 * Ensures the Firebase Admin SDK is initialized (required before getAuth()).
 * @returns {void}
 */
export function ensureFirebaseAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
}

/**
 * Returns the initialized Firebase Realtime Database client.
 * @returns {import("firebase-admin").database.Database}
 */
export function getDatabase() {
  ensureFirebaseAdmin();
  return admin.database();
}
