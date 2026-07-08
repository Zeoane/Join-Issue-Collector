/**
 * Checks whether the request includes the expected n8n shared secret.
 * @param {import("firebase-functions/v2/https").Request} req
 * @param {string} expected
 * @returns {boolean}
 */
export function hasValidN8nSecret(req, expected) {
  const expectedSecret = normalizeSecretValue(expected);
  if (!expectedSecret) return false;

  const headerSecret = normalizeSecretValue(req.headers["x-n8n-secret"]);
  const authorization = normalizeSecretValue(req.headers.authorization);
  const bearer = extractBearerToken(authorization);

  return (
    headerSecret === expectedSecret ||
    bearer === expectedSecret ||
    authorization === expectedSecret
  );
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function normalizeSecretValue(value) {
  if (Array.isArray(value)) return normalizeSecretValue(value[0]);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * @param {string} authorization
 * @returns {string}
 */
function extractBearerToken(authorization) {
  const match = authorization.match(/^bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}
