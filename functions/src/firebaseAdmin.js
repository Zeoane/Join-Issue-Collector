import admin from "firebase-admin";

/**
 * Returns the initialized Firebase Realtime Database client.
 * @returns {import("firebase-admin").database.Database}
 */
export function getDatabase() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  return admin.database();
}
