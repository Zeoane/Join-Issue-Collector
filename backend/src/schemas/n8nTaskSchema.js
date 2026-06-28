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
      assignee: Array.isArray(input.assignee) ? input.assignee : [],
      subtasks: Array.isArray(input.subtasks) ? input.subtasks : [],
      movedAt: Date.now(),
    },
  };
}
