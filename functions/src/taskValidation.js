import {
  AI_GENERATED_NOTICE,
  VALID_COLUMNS,
  VALID_PRIORITIES,
} from "./constants.js";

/**
 * Reads a trimmed string field from an n8n payload object.
 * @param {Record<string, unknown>} input
 * @param {string} key
 * @param {string} [fallback=""]
 * @returns {string}
 */
export function readStringField(input, key, fallback = "") {
  const value = input[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

/**
 * Validates the required task title from n8n input.
 * @param {Record<string, unknown>} input
 * @returns {{ ok: true, title: string } | { ok: false, error: string }}
 */
export function validateTitle(input) {
  const title = readStringField(input, "title");
  if (!title) {
    return { ok: false, error: "Field 'title' is required." };
  }
  return { ok: true, title };
}

/**
 * Resolves the target board column for a new n8n task.
 * @param {Record<string, unknown>} input
 * @returns {{ ok: true, column: string } | { ok: false, error: string }}
 */
export function resolveColumn(input) {
  const column = readStringField(input, "column", "triageColumn");
  if (!VALID_COLUMNS.has(column)) {
    return { ok: false, error: `Invalid column '${column}'.` };
  }
  return { ok: true, column };
}

/**
 * Resolves and validates task priority from n8n input.
 * @param {Record<string, unknown>} input
 * @returns {{ ok: true, priority: string } | { ok: false, error: string }}
 */
export function resolvePriority(input) {
  const priority = readStringField(input, "priority", "MidPriority");
  if (!VALID_PRIORITIES.has(priority)) {
    return { ok: false, error: `Invalid priority '${priority}'.` };
  }
  return { ok: true, priority };
}

/**
 * Builds the task description and appends the AI notice when needed.
 * @param {Record<string, unknown>} input
 * @returns {string}
 */
export function resolveDescription(input) {
  const aiGenerated = input.aiGenerated !== false;
  let description = readStringField(input, "description");
  if (aiGenerated && !description.includes(AI_GENERATED_NOTICE)) {
    description = description
      ? `${description}\n\n${AI_GENERATED_NOTICE}`
      : AI_GENERATED_NOTICE;
  }
  return description;
}

/**
 * Maps validated n8n fields to the Firebase task document shape.
 * @param {Record<string, unknown>} input
 * @param {string} title
 * @param {string} column
 * @param {string} priority
 * @param {string} description
 * @returns {object}
 */
export function buildTaskFromInput(input, title, column, priority, description) {
  const lists = {
    assignee: Array.isArray(input.assignee) ? input.assignee : [],
    subtasks: Array.isArray(input.subtasks) ? input.subtasks : [],
  };
  return {
    title,
    description,
    column,
    priority,
    creatorType: input.creatorType === "internal" ? "internal" : "external",
    category: readStringField(input, "category", "User Story"),
    dueDate: readStringField(input, "dueDate"),
    creatorEmail: readStringField(input, "creatorEmail"),
    creatorName: readStringField(input, "creatorName"),
    aiGenerated: input.aiGenerated !== false,
    movedAt: Date.now(),
    ...lists,
  };
}

/**
 * Combines validated n8n field results into a Firebase task object.
 * @param {Record<string, unknown>} input
 * @param {{ title: string, column: string, priority: string }} fields
 * @returns {object}
 */
export function compileValidatedTask(input, fields) {
  const description = resolveDescription(input);
  return buildTaskFromInput(
    input,
    fields.title,
    fields.column,
    fields.priority,
    description
  );
}

/**
 * Validates and normalizes an n8n task proposal payload.
 * @param {unknown} body
 * @returns {{ ok: true, task: object } | { ok: false, error: string }}
 */
export function validateN8nTaskPayload(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object." };
  }
  const input = /** @type {Record<string, unknown>} */ (body);
  const titleResult = validateTitle(input);
  if (!titleResult.ok) return titleResult;
  const columnResult = resolveColumn(input);
  if (!columnResult.ok) return columnResult;
  const priorityResult = resolvePriority(input);
  if (!priorityResult.ok) return priorityResult;
  const task = compileValidatedTask(input, {
    title: titleResult.title,
    column: columnResult.column,
    priority: priorityResult.priority,
  });
  return { ok: true, task };
}
