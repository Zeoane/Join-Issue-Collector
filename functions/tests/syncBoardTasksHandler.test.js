import { describe, expect, it, vi, beforeEach } from "vitest";

const syncMissingTasksFromSource = vi.hoisted(() =>
  vi.fn(async () => ({
    synced: 2,
    totalSourceTasks: 5,
  }))
);

vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({
    verifyIdToken: vi.fn(async (token) => {
      if (token === "valid-token") return { uid: "mentorUid", firebase: { sign_in_provider: "password" } };
      if (token === "guest-token") return { uid: "guestUid", firebase: { sign_in_provider: "anonymous" } };
      throw new Error("invalid token");
    }),
  }),
}));

vi.mock("../src/taskRepository.js", () => ({
  syncMissingTasksFromSource,
}));

import { handleSyncBoardTasksRequest } from "../src/syncBoardTasksHandler.js";

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
  };
  return res;
}

describe("handleSyncBoardTasksRequest", () => {
  beforeEach(() => {
    syncMissingTasksFromSource.mockClear();
  });

  it("rejects unsupported methods", async () => {
    const res = createMockRes();
    await handleSyncBoardTasksRequest({ method: "GET", headers: {} }, res, "demoUid");
    expect(res.statusCode).toBe(405);
  });

  it("rejects missing auth token", async () => {
    const res = createMockRes();
    await handleSyncBoardTasksRequest({ method: "POST", headers: {} }, res, "demoUid");
    expect(res.statusCode).toBe(401);
  });

  it("syncs tasks for anonymous guest users", async () => {
    const res = createMockRes();
    await handleSyncBoardTasksRequest(
      { method: "POST", headers: { authorization: "Bearer guest-token" } },
      res,
      "demoUid"
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ synced: 2, totalSourceTasks: 5 });
    expect(syncMissingTasksFromSource).toHaveBeenCalledWith("guestUid", "demoUid");
  });

  it("syncs missing tasks for authenticated mentors", async () => {
    const res = createMockRes();
    await handleSyncBoardTasksRequest(
      { method: "POST", headers: { authorization: "Bearer valid-token" } },
      res,
      "demoUid"
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ synced: 2, totalSourceTasks: 5 });
    expect(syncMissingTasksFromSource).toHaveBeenCalledWith("mentorUid", "demoUid");
    expect(res.headers["Cache-Control"]).toBe("no-store, max-age=0");
  });
});
