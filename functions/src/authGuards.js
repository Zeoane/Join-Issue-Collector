import { hasValidN8nSecret } from "./secretAuth.js";
import { sendJson } from "./responseHelpers.js";

/**
 * Verifies configured secret and request authorization header.
 * @param {import("firebase-functions/v2/https").Request} req
 * @param {import("firebase-functions/v2/https").Response} res
 * @param {string} secret
 * @returns {boolean}
 */
export function checkSecret(req, res, secret) {
  if (!secret) {
    sendJson(res, 503, { error: "N8N_API_SECRET is not configured." });
    return false;
  }
  if (!hasValidN8nSecret(req, secret)) {
    sendJson(res, 401, { error: "Unauthorized" });
    return false;
  }
  return true;
}

/**
 * Ensures n8n secret, auth header, and demo UID are present.
 * @param {import("firebase-functions/v2/https").Request} req
 * @param {import("firebase-functions/v2/https").Response} res
 * @param {string} secret
 * @param {string} demoUid
 * @returns {boolean}
 */
export function ensureAuthorized(req, res, secret, demoUid) {
  if (!checkSecret(req, res, secret)) return false;
  if (!demoUid) {
    sendJson(res, 503, { error: "DEMO_USER_UID is not configured." });
    return false;
  }
  return true;
}

/**
 * Rejects unsupported HTTP methods for the n8n task endpoint.
 * @param {import("firebase-functions/v2/https").Request} req
 * @param {import("firebase-functions/v2/https").Response} res
 * @returns {boolean}
 */
export function rejectUnlessPost(req, res) {
  if (req.method === "POST") return true;
  sendJson(res, 405, { error: "Method not allowed" });
  return false;
}
