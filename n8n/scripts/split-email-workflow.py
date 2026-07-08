"""Splits the monolithic email workflow into 3 focused workflows."""
import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "workflows" / "Join-email-to-task-proposal.json"
OUT_INTAKE = ROOT / "workflows" / "Join-email-intake-normalize.json"
OUT_PARSE = ROOT / "workflows" / "Join-email-parse-payload.json"
OUT_PROCESS = ROOT / "workflows" / "Join-email-process-triage.json"

NORMALIZE_INCOMING_EMAIL_JS = """const incoming = $input.item.json;
const payload = incoming?.body && typeof incoming.body === 'object' ? incoming.body : incoming;

return [{
  json: {
    from: String(payload.from || '').trim(),
    subject: String(payload.subject || '').trim(),
    body: String(payload.body || '').trim(),
    messageId: String(payload.messageId || '').trim(),
    gmailId: String(payload.gmailId || '').trim(),
    emailSource: String(payload.emailSource || 'unknown').trim(),
  },
}];"""

PARSE_BUILD_PAYLOAD_JS = """const aiItem = $input.item.json;
const email = $('Normalize incoming email').item.json;

let aiText = aiItem.text ?? aiItem.response ?? aiItem.output ?? '';
if (typeof aiText !== 'string') aiText = JSON.stringify(aiText);
aiText = aiText.replace(/```json\\s*/gi, '').replace(/```\\s*/g, '').trim();

let parsed;
try {
  parsed = JSON.parse(aiText);
} catch (_) {
  parsed = {
    title: email.subject || 'Stakeholder request',
    description: email.body || '',
    category: 'User Story',
    priority: 'MidPriority',
    dueDate: '',
    creatorName: '',
  };
}

const validCategories = new Set(['User Story', 'Technical Task']);
const validPriorities = new Set(['HighPriority', 'MidPriority', 'LowPriority']);
const fromRaw = String(email.from || '');
const creatorEmail = fromRaw.match(/<([^>]+)>/)?.[1] || fromRaw.trim();

function parseFromDisplayName(fromValue) {
  const trimmed = String(fromValue || '').trim();
  const match = trimmed.match(/^([^<]+)</);
  if (!match) return '';
  const name = match[1].trim().replace(/^[\\"']|[\\"']$/g, '');
  return name && !name.includes('@') ? name : '';
}

function normalizeCreatorName(value) {
  const name = String(value || '').trim().replace(/\\s+/g, ' ');
  if (!name || name.includes('@') || /^(stakeholder|unknown|guest|n\\/a|na)$/i.test(name)) return '';
  return name;
}

const creatorName = normalizeCreatorName(parsed.creatorName) || parseFromDisplayName(fromRaw) || '';

return [{
  json: {
    title: String(parsed.title || email.subject || 'Stakeholder request').trim(),
    description: String(parsed.description || email.body || '').trim(),
    category: validCategories.has(parsed.category) ? parsed.category : 'User Story',
    priority: validPriorities.has(parsed.priority) ? parsed.priority : 'MidPriority',
    dueDate: typeof parsed.dueDate === 'string' ? parsed.dueDate.trim() : '',
    column: 'triageColumn',
    creatorName,
    creatorEmail,
    creatorType: 'external',
    aiGenerated: true,
    sourceMessageId: String(email.messageId || '').trim(),
    emailSource: String(email.emailSource || 'unknown').trim(),
    gmailId: String(email.gmailId || '').trim(),
  },
}];"""

PROCESS_EVALUATE_JS = """function nodeNameVariants(base) {
  const names = [base];
  for (let i = 1; i <= 9; i++) {
    names.push(`${base}${i}`);
    names.push(`${base} ${i}`);
  }
  return names;
}

function readNodeJson(bases, predicate = () => true) {
  for (const base of bases) {
    for (const name of nodeNameVariants(base)) {
      try {
        const linked = $(name).item.json;
        if (linked && predicate(linked)) return linked;
      } catch (_) {}
      try {
        const all = $(name).all();
        if (!Array.isArray(all)) continue;
        for (const item of all) {
          const json = item?.json || item;
          if (json && predicate(json)) return json;
        }
      } catch (_) {}
    }
  }
  return null;
}

const http = $input.item.json;
const payload = readNodeJson(
  ['Normalize process payload', 'Apply auto email cap (max 10)', 'When Executed by Another Workflow'],
  (candidate) => Boolean(candidate?.title || candidate?.creatorEmail || candidate?.sourceMessageId || candidate?.gmailId)
) || {};
const statusCode = Number(http.statusCode || 0);
let body = http.body ?? http;
if (typeof body === 'string') {
  try { body = JSON.parse(body || '{}'); } catch (_) { body = {}; }
}
const createdId =
  typeof body?.id === 'string' && body.id.trim() ? body.id.trim() : '';
const ok =
  statusCode === 201 ||
  (statusCode === 200 && (body?.duplicate === true || Boolean(createdId)));
const fallbackTask = body?.task && typeof body.task === 'object' ? body.task : {};

return [{
  json: {
    ok,
    statusCode,
    duplicate: Boolean(body?.duplicate),
    createdId,
    title: payload.title || fallbackTask.title || '',
    creatorName: payload.creatorName || fallbackTask.creatorName || '',
    creatorEmail: payload.creatorEmail || fallbackTask.creatorEmail || '',
    sourceMessageId: payload.sourceMessageId || fallbackTask.sourceMessageId || '',
    gmailId: payload.gmailId || fallbackTask.gmailId || '',
    emailSource: payload.emailSource || fallbackTask.emailSource || 'unknown',
  },
}];"""

NORMALIZE_PROCESS_PAYLOAD_JS = """const incoming = $input.item.json;
const payload = incoming?.body && typeof incoming.body === 'object' ? incoming.body : incoming;
if (!payload || typeof payload !== 'object') {
  throw new Error('Process workflow expected a JSON payload body.');
}
return [{ json: payload }];"""

PARSE_WORKFLOW_SELECTOR = {
    "__rl": True,
    "mode": "list",
    "value": "Join-email-parse-payload",
    "cachedResultName": "Join-email-parse-payload",
}

PROCESS_WORKFLOW_SELECTOR = {
    "__rl": True,
    "mode": "list",
    "value": "Join-email-process-triage",
    "cachedResultName": "Join-email-process-triage",
}

PARSE_NODE_NAMES = {
    "Parse ticket with AI",
    "OpenAI Chat Model",
    "Build Join payload",
}

PROCESS_NODE_NAMES = {
    "Apply auto email cap (max 10)",
    "IF within auto cap",
    "Create task in Triage",
    "Evaluate create result",
    "IF task created",
    "Prepare success archive",
    "IF not manual test",
    "Send success response",
    "Get Gmail labels",
    "Resolve Gmail label IDs",
    "IF Erledigt label found",
    "IF direct Gmail ID",
    "Mark Gmail read",
    "Add Erledigt label",
    "Remove from Inbox",
    "Find Gmail by RFC ID",
    "Pick Gmail ID for archive",
    "IF archive ID found",
    "Prepare error archive",
    "IF not manual test (error)",
    "IF cap reached",
    "Send cap reached response",
    "Send processing error response",
    "Get Gmail labels (error)",
    "Resolve Gmail label IDs (error)",
    "IF zu bearbeiten label found",
    "IF direct Gmail ID (error)",
    "Add zu bearbeiten label",
    "Find Gmail by RFC ID (error)",
    "Pick Gmail ID for error",
}

INTAKE_NODE_NAMES = {
    "Email Trigger (IMAP)",
    "Schedule Trigger (every 5 min)",
    "When clicking 'Execute workflow'",
    "Fetch unread emails (Gmail)",
    "Normalize scheduled email",
    "Normalize IMAP email",
    "Sample stakeholder email",
}


def clone_node(node):
    return copy.deepcopy(node)


def build_node_index(workflow):
    return {node["name"]: node for node in workflow["nodes"]}


def clone_selected_nodes(node_index, names):
    return [clone_node(node_index[name]) for name in names]


def clone_filtered_connections(connections, selected_names):
    result = {}
    for src, outputs in connections.items():
        if src not in selected_names:
            continue
        cloned_outputs = {}
        for output_type, branches in outputs.items():
            new_branches = []
            for branch in branches:
                new_branch = [copy.deepcopy(link) for link in branch if link.get("node") in selected_names]
                if new_branch:
                    new_branches.append(new_branch)
            if new_branches:
                cloned_outputs[output_type] = new_branches
        if cloned_outputs:
            result[src] = cloned_outputs
    return result


def set_node_code(nodes, node_name, code):
    for node in nodes:
        if node["name"] == node_name:
            node["parameters"]["jsCode"] = code
            return
    raise KeyError(f"Node '{node_name}' not found")


def replace_in_node_code(nodes, node_name, old, new):
    for node in nodes:
        if node["name"] != node_name:
            continue
        code = node["parameters"].get("jsCode", "")
        node["parameters"]["jsCode"] = code.replace(old, new)
        return
    raise KeyError(f"Node '{node_name}' not found")


def make_execute_workflow_trigger_node(node_id, position):
    return {
        "parameters": {"inputSource": "passthrough"},
        "id": node_id,
        "name": "When Executed by Another Workflow",
        "type": "n8n-nodes-base.executeWorkflowTrigger",
        "typeVersion": 1.2,
        "position": position,
    }


def make_execute_subworkflow_node(node_id, name, workflow_selector, position, wait_for_completion=True):
    return {
        "parameters": {
            "source": "database",
            "workflowId": copy.deepcopy(workflow_selector),
            "workflowInputs": {
                "value": {},
                "schema": [],
                "mappingMode": "defineBelow",
                "matchingColumns": [],
                "attemptToConvertTypes": False,
                "convertFieldsToString": False,
            },
            "mode": "once",
            "options": {"waitForSubWorkflow": wait_for_completion},
        },
        "id": node_id,
        "name": name,
        "type": "n8n-nodes-base.executeWorkflow",
        "typeVersion": 1.3,
        "position": position,
    }


def make_code_node(node_id, name, code, position):
    return {
        "parameters": {"jsCode": code},
        "id": node_id,
        "name": name,
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": position,
    }


def make_if_title_present_node(node_id, name, position):
    return {
        "parameters": {
            "conditions": {
                "options": {
                    "caseSensitive": True,
                    "leftValue": "",
                    "typeValidation": "strict",
                    "version": 2,
                },
                "conditions": [
                    {
                        "id": "title-present",
                        "leftValue": "={{ $json.title }}",
                        "rightValue": "",
                        "operator": {"type": "string", "operation": "notEmpty"},
                    }
                ],
                "combinator": "and",
            },
            "options": {},
        },
        "id": node_id,
        "name": name,
        "type": "n8n-nodes-base.if",
        "typeVersion": 2.2,
        "position": position,
    }


def base_workflow(name):
    return {
        "name": name,
        "nodes": [],
        "pinData": {},
        "connections": {},
        "active": False,
        "settings": {"executionOrder": "v1", "binaryMode": "separate", "availableInMCP": False},
        "meta": {"templateCredsSetupCompleted": True},
        "tags": [],
    }


def build_parse_workflow(mono):
    node_index = build_node_index(mono)
    workflow = base_workflow("Join-email-parse-payload")
    workflow["nodes"] = clone_selected_nodes(node_index, PARSE_NODE_NAMES)
    set_node_code(workflow["nodes"], "Build Join payload", PARSE_BUILD_PAYLOAD_JS)
    trigger = make_execute_workflow_trigger_node("split-parse-trigger", [320, 224])
    normalize = make_code_node(
        "split-parse-normalize",
        "Normalize incoming email",
        NORMALIZE_INCOMING_EMAIL_JS,
        [560, 224],
    )
    for node in workflow["nodes"]:
        if node["name"] == "Parse ticket with AI":
            node["position"] = [800, 224]
        if node["name"] == "Build Join payload":
            node["position"] = [1040, 224]
        if node["name"] == "OpenAI Chat Model":
            node["position"] = [800, 432]
    workflow["nodes"] = [trigger, normalize] + workflow["nodes"]
    workflow["connections"] = {
        "When Executed by Another Workflow": {
            "main": [[{"node": "Normalize incoming email", "type": "main", "index": 0}]]
        },
        "Normalize incoming email": {"main": [[{"node": "Parse ticket with AI", "type": "main", "index": 0}]]},
        "Parse ticket with AI": {"main": [[{"node": "Build Join payload", "type": "main", "index": 0}]]},
        "OpenAI Chat Model": {
            "ai_languageModel": [[{"node": "Parse ticket with AI", "type": "ai_languageModel", "index": 0}]]
        },
    }
    return workflow


def build_process_workflow(mono):
    node_index = build_node_index(mono)
    workflow = base_workflow("Join-email-process-triage")
    selected_nodes = clone_selected_nodes(node_index, PROCESS_NODE_NAMES)
    set_node_code(selected_nodes, "Evaluate create result", PROCESS_EVALUATE_JS)
    trigger = make_execute_workflow_trigger_node("split-process-trigger", [280, 304])
    normalize = make_code_node(
        "split-process-normalize",
        "Normalize process payload",
        NORMALIZE_PROCESS_PAYLOAD_JS,
        [520, 304],
    )
    for node in selected_nodes:
        node["position"][0] += 120
    workflow["nodes"] = [trigger, normalize] + selected_nodes
    workflow["connections"] = clone_filtered_connections(mono["connections"], PROCESS_NODE_NAMES)
    workflow["connections"]["When Executed by Another Workflow"] = {
        "main": [[{"node": "Normalize process payload", "type": "main", "index": 0}]]
    }
    workflow["connections"]["Normalize process payload"] = {
        "main": [[{"node": "Apply auto email cap (max 10)", "type": "main", "index": 0}]]
    }
    return workflow


def build_intake_workflow(mono):
    node_index = build_node_index(mono)
    workflow = base_workflow("Join-email-intake-normalize")
    selected_nodes = clone_selected_nodes(node_index, INTAKE_NODE_NAMES)
    call_parse = make_execute_subworkflow_node(
        "split-intake-call-parse",
        "Call parse workflow",
        PARSE_WORKFLOW_SELECTOR,
        [960, 208],
    )
    if_title = make_if_title_present_node(
        "split-intake-if-title",
        "IF parsed payload valid",
        [1200, 208],
    )
    call_process = make_execute_subworkflow_node(
        "split-intake-call-process",
        "Call process workflow",
        PROCESS_WORKFLOW_SELECTOR,
        [1440, 208],
        wait_for_completion=True,
    )
    workflow["nodes"] = selected_nodes + [call_parse, if_title, call_process]
    workflow["connections"] = clone_filtered_connections(mono["connections"], INTAKE_NODE_NAMES)
    for source in ["Normalize scheduled email", "Normalize IMAP email", "Sample stakeholder email"]:
        workflow["connections"][source] = {
            "main": [[{"node": "Call parse workflow", "type": "main", "index": 0}]]
        }
    workflow["connections"]["Call parse workflow"] = {
        "main": [[{"node": "IF parsed payload valid", "type": "main", "index": 0}]]
    }
    workflow["connections"]["IF parsed payload valid"] = {
        "main": [[{"node": "Call process workflow", "type": "main", "index": 0}], []]
    }
    return workflow


def write_workflow(path, workflow):
    path.write_text(json.dumps(workflow, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {path.name} ({len(workflow['nodes'])} nodes)")


def main():
    mono = json.loads(SOURCE.read_text(encoding="utf-8"))
    intake = build_intake_workflow(mono)
    parse = build_parse_workflow(mono)
    process = build_process_workflow(mono)
    write_workflow(OUT_INTAKE, intake)
    write_workflow(OUT_PARSE, parse)
    write_workflow(OUT_PROCESS, process)


if __name__ == "__main__":
    main()
