import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { handleN8nTaskRequest } from "./src/n8nTaskHandler.js";

const n8nSecret = defineSecret("N8N_API_SECRET");
const demoUserUid = defineSecret("DEMO_USER_UID");

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
