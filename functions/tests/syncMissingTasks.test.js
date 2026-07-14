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

import { syncMissingTasksFromSource } from "../src/taskRepository.js";

describe("syncMissingTasksFromSource", () => {
  beforeEach(() => {
    pushCounter = 0;
    dbState = {
      users: {
        demoUid: {
          tasks: {
            "task-1": { title: "Old task", column: "triageColumn" },
            "task-2": { title: "Another task", column: "todoColumn" },
          },
        },
        mentorUid: {
          tasks: {
            "task-1": { title: "Old task", column: "doneColumn" },
          },
        },
      },
    };
  });

  it("copies only missing task ids from the source board", async () => {
    const result = await syncMissingTasksFromSource("mentorUid", "demoUid");

    expect(result).toEqual({ synced: 1, totalSourceTasks: 2 });
    expect(getAtPath(dbState, "/users/mentorUid/tasks/task-1")).toMatchObject({
      title: "Old task",
      column: "doneColumn",
    });
    expect(getAtPath(dbState, "/users/mentorUid/tasks/task-2")).toMatchObject({
      title: "Another task",
      column: "todoColumn",
    });
  });

  it("returns zero when source and target are the same user", async () => {
    const result = await syncMissingTasksFromSource("demoUid", "demoUid");
    expect(result).toEqual({ synced: 0, totalSourceTasks: 0 });
  });
});
