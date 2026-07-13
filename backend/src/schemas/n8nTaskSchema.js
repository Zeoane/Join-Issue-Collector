const VALID_COLUMNS = new Set([
  "triageColumn",
  "todoColumn",
  "inProgressColumn",
  "awaitFeedbackColumn",
  "doneColumn",
]);

const VALID_PRIORITIES = new Set(["HighPriority", "MidPriority", "LowPriority"]);

export const AI_GENERATED_NOTICE = "This ticket was AI-generated.";

/**
 * @param {unknown} input
 * @returns {string[]}
 */
function normalizeAssignees(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const normalized = [];
  for (const entry of input) {
    if (typeof entry !== "string") continue;
    const value = entry.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(value);
  }
  return normalized;
}

/**
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
      value = entry.trim();
    } else if (entry && typeof entry === "object") {
      const candidate = /** @type {{ value?: unknown, checked?: unknown }} */ (entry);
      value = typeof candidate.value === "string" ? candidate.value.trim() : "";
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
 * Validates and normalizes an n8n task proposal payload.
 * @param {unknown} body
 * @returns {{ ok: true, task: object } | { ok: false, error: string }}
 */
export function validateN8nTaskPayload(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const input = /** @type {Record<string, unknown>} */ (body);
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) {
    return { ok: false, error: "Field 'title' is required." };
  }

  const column =
    typeof input.column === "string" && input.column.trim()
      ? input.column.trim()
      : "triageColumn";
  if (!VALID_COLUMNS.has(column)) {
    return { ok: false, error: `Invalid column '${column}'.` };
  }

  const priority =
    typeof input.priority === "string" && input.priority.trim()
      ? input.priority.trim()
      : "MidPriority";
  if (!VALID_PRIORITIES.has(priority)) {
    return { ok: false, error: `Invalid priority '${priority}'.` };
  }

  const aiGenerated = input.aiGenerated !== false;
  let description = typeof input.description === "string" ? input.description.trim() : "";
  if (aiGenerated && !description.includes(AI_GENERATED_NOTICE)) {
    description = description
      ? `${description}\n\n${AI_GENERATED_NOTICE}`
      : AI_GENERATED_NOTICE;
  }

  const creatorEmail =
    typeof input.creatorEmail === "string" ? input.creatorEmail.trim() : "";

  return {
    ok: true,
    task: {
      title,
      description,
      category:
        typeof input.category === "string" && input.category.trim()
          ? input.category.trim()
          : "User Story",
      priority,
      dueDate: typeof input.dueDate === "string" ? input.dueDate.trim() : "",
      column,
      creatorEmail,
      creatorName:
        typeof input.creatorName === "string" ? input.creatorName.trim() : "",
      creatorType:
        input.creatorType === "internal" ? "internal" : "external",
      aiGenerated,
      assignee: normalizeAssignees(input.assignee),
      subtasks: normalizeSubtasks(input.subtasks),
      movedAt: Date.now(),
    },
  };
}
