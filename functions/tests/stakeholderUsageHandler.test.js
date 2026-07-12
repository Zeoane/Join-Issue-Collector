import { describe, expect, it } from "vitest";
import { countProcessedEmailsForUtcDay } from "../src/stakeholderUsageHandler.js";

describe("countProcessedEmailsForUtcDay", () => {
  it("counts only entries within the current UTC day", () => {
    const nowMs = Date.UTC(2026, 6, 12, 10, 0, 0); // 2026-07-12
    const processedEmails = {
      early: { processedAt: Date.UTC(2026, 6, 12, 0, 0, 0) },
      noon: { processedAt: Date.UTC(2026, 6, 12, 12, 15, 0) },
      prevDay: { processedAt: Date.UTC(2026, 6, 11, 23, 59, 59) },
      nextDay: { processedAt: Date.UTC(2026, 6, 13, 0, 0, 0) },
    };

    const result = countProcessedEmailsForUtcDay(processedEmails, nowMs);
    expect(result.day).toBe("2026-07-12");
    expect(result.usedToday).toBe(2);
  });

  it("ignores entries without valid numeric timestamps", () => {
    const nowMs = Date.UTC(2026, 6, 12, 10, 0, 0);
    const processedEmails = {
      valid: { processedAt: Date.UTC(2026, 6, 12, 8, 0, 0) },
      missing: {},
      text: { processedAt: "not-a-number" },
      nanValue: { processedAt: Number.NaN },
    };

    const result = countProcessedEmailsForUtcDay(processedEmails, nowMs);
    expect(result.usedToday).toBe(1);
  });
});
