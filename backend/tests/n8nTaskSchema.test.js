import { describe, it, expect } from "vitest";
import {
  validateN8nTaskPayload,
  AI_GENERATED_NOTICE,
} from "../src/schemas/n8nTaskSchema.js";

describe("validateN8nTaskPayload", () => {
  it("requires a title", () => {
    const result = validateN8nTaskPayload({});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("title");
  });

  it("defaults to triageColumn and external creator", () => {
    const result = validateN8nTaskPayload({
      title: "Email request",
      creatorEmail: "stakeholder@example.com",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.task.column).toBe("triageColumn");
      expect(result.task.creatorType).toBe("external");
      expect(result.task.aiGenerated).toBe(true);
      expect(result.task.description).toContain(AI_GENERATED_NOTICE);
    }
  });

  it("rejects invalid priority", () => {
    const result = validateN8nTaskPayload({
      title: "Test",
      priority: "Critical",
    });
    expect(result.ok).toBe(false);
  });
});
