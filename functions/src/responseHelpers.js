/**
 * Sends a JSON HTTP response with the given status code.
 * @param {import("firebase-functions/v2/https").Response} res
 * @param {number} status
 * @param {object} payload
 */
export function sendJson(res, status, payload) {
  res.status(status).json(payload);
}
