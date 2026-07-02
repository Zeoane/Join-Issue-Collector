import { Router } from "express";
import { requireN8nSecret } from "../middleware/requireN8nSecret.js";
import { validateN8nTaskPayload } from "../schemas/n8nTaskSchema.js";
import { createTaskForUser } from "../services/n8nTaskService.js";

export const internalRoutes = Router();

internalRoutes.use(requireN8nSecret);

internalRoutes.get("/health", (_req, res) => {
  res.json({ ok: true, service: "join-issue-collector-internal" });
});

internalRoutes.post("/tasks", async (req, res, next) => {
  try {
    const targetUid = process.env.DEMO_USER_UID;
    if (!targetUid) {
      res.status(503).json({
        error: "DEMO_USER_UID is not configured on the server.",
      });
      return;
    }

    const validation = validateN8nTaskPayload(req.body);
    if (!validation.ok) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const sourceMessageId =
      typeof req.body?.sourceMessageId === "string"
        ? req.body.sourceMessageId.trim()
        : "";

    const result = await createTaskForUser(
      targetUid,
      validation.task,
      sourceMessageId
    );

    if (result.duplicate) {
      res.status(200).json({
        duplicate: true,
        id: result.id,
        task: result.task,
      });
      return;
    }

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});
