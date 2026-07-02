import { describe, it, expect, vi, beforeEach } from "vitest";

const processedEmails = new Map();
const tasks = new Map();

vi.mock("../src/firebaseAdmin.js", () => ({
  getDatabase: () => ({
    ref(path) {
      return {
        push() {
          const id = `task-${tasks.size + 1}`;
          return {
            key: id,
            async set(value) {
              tasks.set(id, value);
            },
          };
        },
        async get() {
          if (path.includes("/processedEmails/")) {
            const key = path.split("/processedEmails/")[1];
            const value = processedEmails.get(key);
            return {
              exists: () => value !== undefined,
              val: () => value,
            };
          }
          if (path.includes("/tasks/")) {
            const id = path.split("/tasks/")[1];
            const value = tasks.get(id);
            return {
              exists: () => value !== undefined,
              val: () => value,
            };
          }
          return { exists: () => false, val: () => null };
        },
        async set(value) {
          if (path.includes("/processedEmails/")) {
            const key = path.split("/processedEmails/")[1];
            processedEmails.set(key, value);
          }
        },
      };
    },
  }),
}));

import { createTaskForUser } from "../src/taskRepository.js";

describe("createTaskForUser", () => {
  beforeEach(() => {
    processedEmails.clear();
    tasks.clear();
  });

  it("creates a new task when sourceMessageId is new", async () => {
    const result = await createTaskForUser(
      "demo-user",
      { title: "First" },
      "<abc@example.com>"
    );

    expect(result.duplicate).toBe(false);
    expect(result.id).toBe("task-1");
  });

  it("returns duplicate when sourceMessageId was already processed", async () => {
    await createTaskForUser("demo-user", { title: "First" }, "<abc@example.com>");
    const result = await createTaskForUser(
      "demo-user",
      { title: "Duplicate" },
      "<abc@example.com>"
    );

    expect(result.duplicate).toBe(true);
    expect(result.id).toBe("task-1");
    expect(result.task.title).toBe("First");
  });
});
