import { describe, it, expect } from "vitest";
import { hasValidN8nSecret } from "../src/secretAuth.js";

describe("hasValidN8nSecret", () => {
  it("accepts trimmed X-N8N-Secret header", () => {
    const req = {
      headers: {
        "x-n8n-secret": "  test-secret  ",
      },
    };

    expect(hasValidN8nSecret(req, "test-secret")).toBe(true);
  });

  it("accepts lowercase bearer token and trimmed expected secret", () => {
    const req = {
      headers: {
        authorization: "bearer test-secret",
      },
    };

    expect(hasValidN8nSecret(req, "  test-secret  ")).toBe(true);
  });
});
