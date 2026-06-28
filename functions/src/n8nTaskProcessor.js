import { createTaskForUser } from "./taskRepository.js";
import { sendJson } from "./responseHelpers.js";
import { validateN8nTaskPayload } from "./taskValidation.js";

/**
 * Persists a validated n8n payload as a triage task for the demo user.
 * @param {import("firebase-functions/v2/https").Request} req
 * @param {import("firebase-functions/v2/https").Response} res
 * @param {string} demoUid
 */
export async function processN8nTaskBody(req, res, demoUid) {
  const validation = validateN8nTaskPayload(req.body);
  if (!validation.ok) {
    sendJson(res, 400, { error: validation.error });
    return;
  }
  try {
    const result = await createTaskForUser(demoUid, validation.task);
    sendJson(res, 201, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    sendJson(res, 500, { error: message });
  }
}
