import { describe, it, expect } from "vitest";
import { sanitizeMessageId } from "../src/processedEmail.js";

describe("sanitizeMessageId", () => {
  it("strips angle brackets and unsafe RTDB characters", () => {
    expect(sanitizeMessageId("<abc@example.com>")).toBe("abc@example_com");
    expect(sanitizeMessageId("msg/with#bad.chars")).toBe("msg_with_bad_chars");
  });

  it("returns empty string for blank input", () => {
    expect(sanitizeMessageId("   ")).toBe("");
  });
});
