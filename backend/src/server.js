import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createApp } from "./app.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const port = Number(process.env.PORT) || 3001;
const app = createApp();

const server = app.listen(port, () => {
  console.log(`Join backend listening on http://localhost:${port}`);
  console.log(`n8n endpoint: POST http://localhost:${port}/internal/n8n/tasks`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
