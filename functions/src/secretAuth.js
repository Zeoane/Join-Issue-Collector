/**
 * Checks whether the request includes the expected n8n shared secret.
 * @param {import("firebase-functions/v2/https").Request} req
 * @param {string} expected
 * @returns {boolean}
 */
export function hasValidN8nSecret(req, expected) {
  if (!expected) return false;
  const headerSecret = req.headers["x-n8n-secret"];
  const authHeader = req.headers.authorization;
  const bearer =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : "";
  return headerSecret === expected || bearer === expected;
}
