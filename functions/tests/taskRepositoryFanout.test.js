import { beforeEach, describe, expect, it, vi } from "vitest";

let pushCounter = 0;
/** @type {Record<string, unknown>} */
let dbState = {};

/**
 * @param {string} path
 * @returns {string[]}
 */
function toSegments(path) {
  return String(path || "")
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean);
}

/**
 * @param {Record<string, unknown>} root
 * @param {string} path
 * @returns {unknown}
 */
function getAtPath(root, path) {
  const segments = toSegments(path);
  /** @type {unknown} */
  let cursor = root;
  for (const segment of segments) {
    if (!cursor || typeof cursor !== "object") return undefined;
    cursor = /** @type {Record<string, unknown>} */ (cursor)[segment];
  }
  return cursor;
}

/**
 * @param {Record<string, unknown>} root
 * @param {string} path
 * @param {unknown} value
 */
function setAtPath(root, path, value) {
  const segments = toSegments(path);
  if (segments.length === 0) return;
  /** @type {Record<string, unknown>} */
  let cursor = root;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const key = segments[i];
    if (!cursor[key] || typeof cursor[key] !== "object") {
      cursor[key] = {};
    }
    cursor = /** @type {Record<string, unknown>} */ (cursor[key]);
  }
  cursor[segments[segments.length - 1]] = value;
}

vi.mock("../src/firebaseAdmin.js", () => ({
  getDatabase: () => ({
    ref(path) {
      return {
        push() {
          pushCounter += 1;
          const key = `task-${pushCounter}`;
          return {
            key,
            async set(value) {
              setAtPath(dbState, `${path}/${key}`, value);
            },
          };
        },
        async get() {
          const value = getAtPath(dbState, path);
          return {
            exists: () => value !== undefined,
            val: () => value ?? null,
          };
        },
        async set(value) {
          setAtPath(dbState, path, value);
        },
      };
    },
  }),
}));

import { createTaskForAllUsers } from "../src/taskRepository.js";

describe("createTaskForAllUsers", () => {
  beforeEach(() => {
    pushCounter = 0;
    dbState = {
      users: {
        demoUid: { name: "Demo", guest: false },
        anotherUid: { name: "Another", guest: false },
        guests: {},
      },
    };
  });

  it("creates task for every existing user UID", async () => {
    const result = await createTaskForAllUsers(
      "demoUid",
      { title: "Inbound Ticket", column: "triageColumn" },
      "message-1"
    );

    expect(result.duplicate).toBe(false);
    expect(result.id).toBe("task-1");
    expect(getAtPath(dbState, "/users/demoUid/tasks/task-1")).toMatchObject({
      title: "Inbound Ticket",
    });
    expect(getAtPath(dbState, "/users/anotherUid/tasks/task-1")).toMatchObject({
      title: "Inbound Ticket",
    });
  });

  it("reuses duplicate id and still mirrors to other users", async () => {
    setAtPath(dbState, "/users/demoUid/tasks/existing-42", {
      title: "Already there",
      column: "triageColumn",
    });
    setAtPath(dbState, "/users/demoUid/processedEmails/message-2", {
      taskId: "existing-42",
      processedAt: 1700000000000,
    });

    const result = await createTaskForAllUsers(
      "demoUid",
      { title: "Ignored duplicate payload", column: "triageColumn" },
      "message-2"
    );

    expect(result.duplicate).toBe(true);
    expect(result.id).toBe("existing-42");
    expect(getAtPath(dbState, "/users/anotherUid/tasks/existing-42")).toMatchObject({
      title: "Already there",
    });
  });
});
