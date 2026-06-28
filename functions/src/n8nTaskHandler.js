import { ensureAuthorized, rejectUnlessPost } from "./authGuards.js";
import { processN8nTaskBody } from "./n8nTaskProcessor.js";

/**
 * Handles POST requests from n8n and creates tasks in Firebase.
 * @param {import("firebase-functions/v2/https").Request} req
 * @param {import("firebase-functions/v2/https").Response} res
 * @param {string} secret
 * @param {string} demoUid
 */
export async function handleN8nTaskRequest(req, res, secret, demoUid) {
  if (!rejectUnlessPost(req, res)) return;
  if (!ensureAuthorized(req, res, secret, demoUid)) return;
  await processN8nTaskBody(req, res, demoUid);
}
