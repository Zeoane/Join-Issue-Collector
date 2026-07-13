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
  if (typeof value !== "string") return fallback;
  const normalized = normalizeTaskText(value);
  return normalized ? normalized : fallback;
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
 * Normalizes task text fields to avoid hidden unicode mismatches.
 * @param {string} value
 * @returns {string}
 */
function normalizeTaskText(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .normalize("NFC")
    .trim();
}

/**
 * Normalizes assignee values to a deduplicated string array.
 * @param {unknown} input
 * @returns {string[]}
 */
function normalizeAssignees(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const normalized = [];
  for (const entry of input) {
    const value = normalizeTaskText(typeof entry === "string" ? entry : "");
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(value);
  }
  return normalized;
}

/**
 * Normalizes subtasks to { value, checked } entries.
 * @param {unknown} input
 * @returns {{ value: string, checked: boolean }[]}
 */
function normalizeSubtasks(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const normalized = [];
  for (const entry of input) {
    let value = "";
    let checked = false;
    if (typeof entry === "string") {
      value = normalizeTaskText(entry);
    } else if (entry && typeof entry === "object") {
      const candidate = /** @type {{ value?: unknown, checked?: unknown }} */ (entry);
      value = normalizeTaskText(
        typeof candidate.value === "string" ? candidate.value : ""
      );
      checked = candidate.checked === true;
    }
    if (!value || value.length < 3) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({ value, checked });
  }
  return normalized;
}

/**
 * Converts common inbound due-date formats to YYYY-MM-DD.
 * Accepted inputs:
 * - YYYY-MM-DD
 * - DD.MM.YYYY
 * - DD/MM/YYYY
 * @param {Record<string, unknown>} input
 * @returns {string}
 */
function resolveDueDate(input) {
  const raw = readStringField(input, "dueDate");
  if (!raw) return "";
  if (isIsoDate(raw)) return raw;

  const dotMatch = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dotMatch) {
    const [, dd, mm, yyyy] = dotMatch;
    const iso = `${yyyy}-${mm}-${dd}`;
    return isIsoDate(iso) ? iso : raw;
  }

  const slashMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashMatch) {
    const [, dd, mm, yyyy] = slashMatch;
    const iso = `${yyyy}-${mm}-${dd}`;
    return isIsoDate(iso) ? iso : raw;
  }

  return raw;
}

/**
 * @param {string} value
 * @returns {boolean}
 */
function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
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
    assignee: normalizeAssignees(input.assignee),
    subtasks: normalizeSubtasks(input.subtasks),
  };
  return {
    title,
    description,
    column,
    priority,
    creatorType: input.creatorType === "internal" ? "internal" : "external",
    category: readStringField(input, "category", "User Story"),
    dueDate: resolveDueDate(input),
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
