import { getAuth } from "firebase-admin/auth";
import { ensureFirebaseAdmin } from "./firebaseAdmin.js";
import { sendJson } from "./responseHelpers.js";
import { syncMissingTasksFromSource } from "./taskRepository.js";

/**
 * Verifies a Firebase ID token from the Authorization header.
 * @param {import("firebase-functions/v2/https").Request} req
 * @returns {Promise<string|null>}
 */
async function verifyRequestUid(req) {
  const header = String(req.headers.authorization || "");
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) return null;

  try {
    ensureFirebaseAdmin();
    const decoded = await getAuth().verifyIdToken(match[1]);
    return decoded.uid || null;
  } catch (error) {
    console.error("Board sync auth failed:", error);
    return null;
  }
}

/**
 * Authenticated POST endpoint that backfills missing board tasks for members and guests.
 * @param {import("firebase-functions/v2/https").Request} req
 * @param {import("firebase-functions/v2/https").Response} res
 * @param {string} sourceUid
 * @returns {Promise<void>}
 */
export async function handleSyncBoardTasksRequest(req, res, sourceUid) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }
  if (!sourceUid) {
    sendJson(res, 503, { error: "DEMO_USER_UID is not configured." });
    return;
  }

  const targetUid = await verifyRequestUid(req);
  if (!targetUid) {
    sendJson(res, 401, { error: "Unauthorized" });
    return;
  }

  try {
    const result = await syncMissingTasksFromSource(targetUid, sourceUid);
    res.set("Cache-Control", "no-store, max-age=0");
    sendJson(res, 200, result);
  } catch (error) {
    console.error("Failed to sync board tasks:", error);
    sendJson(res, 500, { error: "Unable to sync board tasks." });
  }
}
