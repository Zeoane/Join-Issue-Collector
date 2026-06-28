import { readFileSync, existsSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import admin from "firebase-admin";

/** @type {import("firebase-admin").database.Database | null} */
let database = null;

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * Resolves the service account path relative to the backend folder.
 * @param {string|undefined} credPath
 * @returns {string}
 */
export function resolveCredentialsPath(credPath) {
  if (!credPath) return "";
  const normalized = credPath.replace(/^\.[\\/]/, "");
  return isAbsolute(credPath) ? credPath : resolve(backendRoot, normalized);
}

/**
 * Initializes Firebase Admin SDK for Realtime Database access.
 * @returns {import("firebase-admin").database.Database}
 */
export function getDatabase() {
  if (database) return database;
  const credPath = resolveCredentialsPath(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  const databaseURL = process.env.FIREBASE_DATABASE_URL;
  if (!credPath || !existsSync(credPath)) {
    throw new Error(
      "GOOGLE_APPLICATION_CREDENTIALS is missing or points to a non-existent file."
    );
  }
  if (!databaseURL) {
    throw new Error("FIREBASE_DATABASE_URL is not configured.");
  }
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(readFileSync(credPath, "utf8"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL,
    });
  }
  database = admin.database();
  return database;
}
