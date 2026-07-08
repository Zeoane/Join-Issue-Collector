import { describe, it, expect } from "vitest";
import {
  getMessageIdLookupKeys,
  sanitizeMessageId,
  sanitizeMessageIdLegacy,
} from "../src/processedEmail.js";

describe("sanitizeMessageId", () => {
  it("strips angle brackets and encodes unsafe RTDB characters", () => {
    expect(sanitizeMessageId("<abc@example.com>")).toBe("abc%40example%2Ecom");
    expect(sanitizeMessageId("msg/with#bad.chars")).toBe("msg%2Fwith%23bad%2Echars");
  });

  it("returns empty string for blank input", () => {
    expect(sanitizeMessageId("   ")).toBe("");
  });

  it("avoids collisions between dots and underscores", () => {
    expect(sanitizeMessageId("a.b@example.com")).not.toBe(
      sanitizeMessageId("a_b@example.com")
    );
  });
});

describe("message id lookup keys", () => {
  it("includes current and legacy variants for backwards compatibility", () => {
    expect(getMessageIdLookupKeys("a.b@example.com")).toEqual([
      "a%2Eb%40example%2Ecom",
      "a_b@example_com",
    ]);
    expect(sanitizeMessageIdLegacy("a.b@example.com")).toBe("a_b@example_com");
  });
});
