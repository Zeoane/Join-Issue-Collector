/**
 * Validates internal n8n requests via X-N8N-Secret or Authorization Bearer token.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export function requireN8nSecret(req, res, next) {
  const expected = normalizeSecretValue(process.env.N8N_API_SECRET);
  if (!expected) {
    res.status(503).json({ error: "N8N_API_SECRET is not configured on the server." });
    return;
  }

  const headerSecret = normalizeSecretValue(req.headers["x-n8n-secret"]);
  const authHeader = normalizeSecretValue(req.headers.authorization);
  const bearerSecret = extractBearerToken(authHeader);

  if (
    headerSecret === expected ||
    bearerSecret === expected ||
    authHeader === expected
  ) {
    next();
    return;
  }

  res.status(401).json({ error: "Unauthorized" });
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
