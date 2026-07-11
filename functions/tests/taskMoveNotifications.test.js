import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildTaskMoveNotificationPayload,
  notifyTaskMoveViaN8n,
  shouldNotifyTaskMove,
} from "../src/taskMoveNotifications.js";
import { handleTaskColumnChange } from "../src/taskMoveTrigger.js";

describe("task move notification guards", () => {
  it("returns true when column changed and creator email exists", () => {
    const result = shouldNotifyTaskMove(
      { column: "triageColumn" },
      { column: "todoColumn", creatorEmail: "stakeholder@example.com" }
    );

    expect(result).toBe(true);
  });

  it("returns false when column did not change", () => {
    const result = shouldNotifyTaskMove(
      { column: "triageColumn" },
      { column: "triageColumn", creatorEmail: "stakeholder@example.com" }
    );

    expect(result).toBe(false);
  });

  it("returns false when creator email is missing", () => {
    const result = shouldNotifyTaskMove(
      { column: "triageColumn" },
      { column: "todoColumn", creatorEmail: "" }
    );

    expect(result).toBe(false);
  });
});

describe("buildTaskMoveNotificationPayload", () => {
  it("maps column ids to readable labels", () => {
    const payload = buildTaskMoveNotificationPayload(
      { column: "triageColumn" },
      {
        column: "awaitFeedbackColumn",
        creatorEmail: "stakeholder@example.com",
        creatorName: "Erika Muster",
        title: "Bitte Daten exportieren",
      },
      { uid: "user-1", taskId: "task-9" }
    );

    expect(payload.previousColumnLabel).toBe("Triage");
    expect(payload.newColumnLabel).toBe("Await feedback");
    expect(payload.creatorEmail).toBe("stakeholder@example.com");
    expect(payload.taskId).toBe("task-9");
  });
});

describe("notifyTaskMoveViaN8n", () => {
  let fetchFn;

  beforeEach(() => {
    fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "",
    });
  });

  it("posts payload to webhook url with optional secret header", async () => {
    const result = await notifyTaskMoveViaN8n(
      { title: "Task moved" },
      {
        webhookUrl: "https://n8n.example.com/webhook/task-moved",
        webhookSecret: "top-secret",
        fetchFn,
      }
    );

    expect(result.skipped).toBe(false);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith(
      "https://n8n.example.com/webhook/task-moved",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-n8n-secret": "top-secret",
        }),
      })
    );
  });
});

describe("handleTaskColumnChange", () => {
  it("skips when change is irrelevant", async () => {
    const fetchFn = vi.fn();
    const result = await handleTaskColumnChange(
      {
        params: { uid: "user-1", taskId: "task-1" },
        data: {
          before: { val: () => ({ column: "triageColumn" }) },
          after: { val: () => ({ column: "triageColumn" }) },
        },
      },
      {
        webhookUrl: "https://n8n.example.com/webhook/task-moved",
        webhookSecret: "secret",
        fetchFn,
      }
    );

    expect(result.skipped).toBe(true);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
