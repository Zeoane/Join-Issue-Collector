/**
 * Validates internal n8n requests via X-N8N-Secret or Authorization Bearer token.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export function requireN8nSecret(req, res, next) {
  const expected = process.env.N8N_API_SECRET;
  if (!expected) {
    res.status(503).json({ error: "N8N_API_SECRET is not configured on the server." });
    return;
  }

  const headerSecret = req.headers["x-n8n-secret"];
  const authHeader = req.headers.authorization;
  const bearerSecret =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

  if (headerSecret === expected || bearerSecret === expected) {
    next();
    return;
  }

  res.status(401).json({ error: "Unauthorized" });
}
