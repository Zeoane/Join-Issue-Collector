import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

vi.mock("../src/services/n8nTaskService.js", () => ({
  createTaskForUser: vi.fn(async (_uid, task) => ({
    id: "task-123",
    task,
  })),
}));

describe("POST /internal/n8n/tasks", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.N8N_API_SECRET = "test-secret";
    process.env.DEMO_USER_UID = "demo-user-uid";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  it("returns 401 without secret", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/internal/n8n/tasks")
      .send({ title: "Test" });
    expect(res.status).toBe(401);
  });

  it("creates a task with valid secret and payload", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/internal/n8n/tasks")
      .set("X-N8N-Secret", "test-secret")
      .send({
        title: "Test ticket from n8n",
        creatorEmail: "stakeholder@example.com",
        column: "triageColumn",
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe("task-123");
    expect(res.body.task.title).toBe("Test ticket from n8n");
  });
});
