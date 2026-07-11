import { onRequest } from "firebase-functions/v2/https";
import { onValueUpdated } from "firebase-functions/v2/database";
import { defineSecret } from "firebase-functions/params";
import { handleN8nTaskRequest } from "./src/n8nTaskHandler.js";
import { handleTaskColumnChange } from "./src/taskMoveTrigger.js";

const n8nSecret = defineSecret("N8N_API_SECRET");
const demoUserUid = defineSecret("DEMO_USER_UID");
const taskMovedWebhookUrl = defineSecret("N8N_TASK_MOVED_WEBHOOK_URL");

/**
 * Public HTTPS endpoint for n8n task proposals into board Triage.
 */
export const internalN8nTasks = onRequest(
  { secrets: [n8nSecret, demoUserUid], invoker: "public" },
  async (req, res) => {
    await handleN8nTaskRequest(
      req,
      res,
      n8nSecret.value(),
      demoUserUid.value()
    );
  }
);

/**
 * Realtime Database trigger for ticket moves between board columns.
 * Sends a webhook event to n8n so the creator can be notified by email.
 */
export const notifyTaskCreatorOnColumnChange = onValueUpdated(
  {
    ref: "/users/{uid}/tasks/{taskId}",
    secrets: [taskMovedWebhookUrl, n8nSecret],
  },
  async (event) => {
    await handleTaskColumnChange(event, {
      webhookUrl: taskMovedWebhookUrl.value(),
      webhookSecret: n8nSecret.value(),
      fetchFn: fetch,
    });
  }
);
