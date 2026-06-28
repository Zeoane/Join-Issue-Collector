import express from "express";
import { internalRoutes } from "./routes/internalRoutes.js";

export function createApp() {
  const app = express();

  app.use(express.json({ limit: "256kb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/internal/n8n", internalRoutes);

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use((err, _req, res, _next) => {
    console.error("Backend error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    });
  });

  return app;
}
