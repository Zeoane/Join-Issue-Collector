import { describe, it, expect } from "vitest";
import { validateN8nTaskPayload } from "../src/taskValidation.js";
import { AI_GENERATED_NOTICE } from "../src/constants.js";

describe("validateN8nTaskPayload", () => {
  it("requires a title", () => {
    const result = validateN8nTaskPayload({});
    expect(result.ok).toBe(false);
  });

  it("defaults to triage and adds AI notice", () => {
    const result = validateN8nTaskPayload({
      title: "Email request",
      creatorEmail: "stakeholder@example.com",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.task.column).toBe("triageColumn");
      expect(result.task.description).toContain(AI_GENERATED_NOTICE);
    }
  });

  it("preserves umlauts and normalizes german due date", () => {
    const result = validateN8nTaskPayload({
      title: "Überprüfung Österreicher Straße",
      description: "Änderung für Ümlaute nötig",
      dueDate: "15.07.2026",
      creatorName: "G. L.",
      creatorEmail: "ellie@example.com",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.task.title).toBe("Überprüfung Österreicher Straße");
      expect(result.task.description).toContain("Änderung für Ümlaute nötig");
      expect(result.task.dueDate).toBe("2026-07-15");
    }
  });
});
