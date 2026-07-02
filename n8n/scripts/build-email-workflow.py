"""Regenerates n8n/workflows/Join-email-to-task-proposal.json."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "workflows" / "Join-email-to-task-proposal.json"

NORMALIZE_GMAIL_JS = r"""const data = $input.item.json;

function formatAddress(entry) {
  if (!entry) return '';
  if (typeof entry === 'string') return entry;
  if (entry.text) return entry.text;
  if (entry.value) return entry.value;
  if (entry.address) {
    return entry.name ? `${entry.name} <${entry.address}>` : entry.address;
  }
  return '';
}

function extractFrom(item) {
  if (typeof item.from === 'string' && item.from) return item.from;
  if (item.from) return formatAddress(item.from);
  if (item.From) return formatAddress(item.From);
  const fromList = item.envelope?.from;
  if (Array.isArray(fromList) && fromList.length) return formatAddress(fromList[0]);
  if (item.headers?.from) {
    return Array.isArray(item.headers.from) ? item.headers.from[0] : item.headers.from;
  }
  return '';
}

function extractSubject(item) {
  return item.subject || item.Subject || item.envelope?.subject || item.headers?.subject?.[0] || item.headers?.subject || '';
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '')
    .trim();
}

function extractBody(item) {
  const candidates = [item.textPlain, item.text, item.textContent, item.textAsHtml, item.textHtml, item.htmlContent];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.includes('<') ? stripHtml(candidate) : candidate.trim();
    }
  }
  return item.snippet ? String(item.snippet).trim() : '';
}

function extractMessageId(item) {
  const header = item.headers?.['message-id'];
  if (Array.isArray(header) && header[0]) return String(header[0]).trim();
  if (typeof header === 'string' && header.trim()) return header.trim();
  return String(item.id || item.messageId || '').trim();
}

return [{
  json: {
    from: extractFrom(data),
    subject: String(extractSubject(data)).trim(),
    body: extractBody(data),
    messageId: extractMessageId(data),
    gmailId: data.id || '',
    emailSource: 'gmail',
  },
}];"""

NORMALIZE_IMAP_JS = NORMALIZE_GMAIL_JS.replace(
    "return String(item.id || item.messageId || '').trim();",
    "if (item.metadata?.['message-id']) return String(item.metadata['message-id']).trim();\n"
    "  const uid = item.attributes?.uid || item.uid;\n"
    "  return uid ? `imap-${uid}` : '';",
).replace("emailSource: 'gmail'", "emailSource: 'imap'").replace(
    "gmailId: data.id || ''", "gmailId: ''"
)

BUILD_PAYLOAD_JS = r"""const aiItem = $input.item.json;
const sourceNames = ['Normalize scheduled email', 'Normalize IMAP email', 'Sample stakeholder email'];

let email = null;
for (const name of sourceNames) {
  try {
    const candidate = $(name).item.json;
    if (candidate?.from) {
      email = candidate;
      break;
    }
  } catch (_) {}
}

if (!email) {
  throw new Error('No stakeholder email context found.');
}

let aiText = aiItem.text ?? aiItem.response ?? aiItem.output ?? '';
if (typeof aiText !== 'string') aiText = JSON.stringify(aiText);
aiText = aiText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

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
  const name = match[1].trim().replace(/^["']|["']$/g, '');
  return name && !name.includes('@') ? name : '';
}

function normalizeCreatorName(value) {
  const name = String(value || '').trim().replace(/\s+/g, ' ');
  if (!name || name.includes('@') || /^(stakeholder|unknown|guest|n\/a|na)$/i.test(name)) return '';
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

EVALUATE_JS = r"""const http = $input.item.json;
const payload = $('Build Join payload').item.json;
const statusCode = Number(http.statusCode || 0);
let body = http.body ?? http;
if (typeof body === 'string') {
  try { body = JSON.parse(body || '{}'); } catch (_) { body = {}; }
}
const ok = statusCode === 201 || (statusCode === 200 && body?.duplicate === true);

return [{
  json: {
    ok,
    statusCode,
    duplicate: Boolean(body?.duplicate),
    sourceMessageId: payload.sourceMessageId || '',
    gmailId: payload.gmailId || '',
    emailSource: payload.emailSource || 'unknown',
  },
}];"""

PREPARE_ARCHIVE_JS = r"""const ctx = $input.item.json;
const gmailId = String(ctx.gmailId || '').trim();
const searchRfcId = String(ctx.sourceMessageId || '').replace(/^<|>$/g, '').trim();
return [{
  json: {
    ...ctx,
    archiveGmailId: gmailId,
    searchRfcId,
    useDirectId: Boolean(gmailId),
  },
}];"""

PICK_ARCHIVE_JS = r"""const ctx = $('Resolve Gmail label IDs').item.json;
const found = $input.item.json;
const archiveGmailId = String(found.id || '').trim();
if (!archiveGmailId) {
  return [{ json: { ...ctx, archiveSkipped: true, skipReason: 'Gmail message not found for archive' } }];
}
return [{ json: { ...ctx, archiveGmailId, archiveSkipped: false } }];
"""

PICK_ERROR_JS = PICK_ARCHIVE_JS.replace(
    "Resolve Gmail label IDs", "Resolve Gmail label IDs (error)"
).replace("Prepare success archive", "Prepare error archive")

RESOLVE_LABELS_JS = r"""const sourceNode = 'SOURCE_NODE';
const ctx = $(sourceNode).item.json;
const labels = $input.all().map((item) => item.json);

function findLabelId(...names) {
  for (const wanted of names) {
    const hit = labels.find(
      (label) => String(label.name || '').trim().toLowerCase() === wanted.toLowerCase()
    );
    if (hit?.id) return hit.id;
  }
  return '';
}

const erledigtLabelId = findLabelId('Erledigt', 'erledigt');
const zuBearbeitenLabelId = findLabelId('zu bearbeiten', 'Zu bearbeiten');

return [{
  json: {
    ...ctx,
    erledigtLabelId,
    zuBearbeitenLabelId,
    labelsResolved: Boolean(erledigtLabelId && zuBearbeitenLabelId),
  },
}];"""

RESOLVE_LABELS_OK_JS = RESOLVE_LABELS_JS.replace("SOURCE_NODE", "Prepare success archive")
RESOLVE_LABELS_ERR_JS = RESOLVE_LABELS_JS.replace("SOURCE_NODE", "Prepare error archive")

IF_LABEL_OK = {
    "conditions": {
        "options": {
            "caseSensitive": True,
            "leftValue": "",
            "typeValidation": "strict",
            "version": 2,
        },
        "conditions": [
            {
                "id": "erledigt-label",
                "leftValue": "={{ $json.erledigtLabelId }}",
                "rightValue": "",
                "operator": {"type": "string", "operation": "notEmpty"},
            }
        ],
        "combinator": "and",
    },
    "options": {},
}

IF_OK = {
    "conditions": {
        "options": {
            "caseSensitive": True,
            "leftValue": "",
            "typeValidation": "strict",
            "version": 2,
        },
        "conditions": [
            {
                "id": "ok-check",
                "leftValue": "={{ $json.ok }}",
                "rightValue": True,
                "operator": {"type": "boolean", "operation": "true"},
            }
        ],
        "combinator": "and",
    },
    "options": {},
}

IF_DIRECT = {
    "conditions": {
        "options": {
            "caseSensitive": True,
            "leftValue": "",
            "typeValidation": "strict",
            "version": 2,
        },
        "conditions": [
            {
                "id": "direct-id",
                "leftValue": "={{ $json.useDirectId }}",
                "rightValue": True,
                "operator": {"type": "boolean", "operation": "true"},
            }
        ],
        "combinator": "and",
    },
    "options": {},
}

IF_NOT_MANUAL = {
    "conditions": {
        "options": {
            "caseSensitive": True,
            "leftValue": "",
            "typeValidation": "strict",
            "version": 2,
        },
        "conditions": [
            {
                "id": "not-manual",
                "leftValue": "={{ $json.emailSource }}",
                "rightValue": "manual",
                "operator": {"type": "string", "operation": "notEquals"},
            }
        ],
        "combinator": "and",
    },
    "options": {},
}

IF_CAN_ARCHIVE = {
    "conditions": {
        "options": {
            "caseSensitive": True,
            "leftValue": "",
            "typeValidation": "strict",
            "version": 2,
        },
        "conditions": [
            {
                "id": "has-id",
                "leftValue": "={{ $json.archiveSkipped }}",
                "rightValue": True,
                "operator": {"type": "boolean", "operation": "false"},
            }
        ],
        "combinator": "and",
    },
    "options": {},
}

GMAIL_ARCHIVE_MSG_ID = "={{ $('Resolve Gmail label IDs').item.json.archiveGmailId || $('Pick Gmail ID for archive').item.json.archiveGmailId }}"
GMAIL_ERLEDIGT_LABEL = "={{ [$('Resolve Gmail label IDs').item.json.erledigtLabelId].filter(Boolean) }}"
GMAIL_ZB_MSG_ID = "={{ $('Resolve Gmail label IDs (error)').item.json.archiveGmailId || $('Pick Gmail ID for error').item.json.archiveGmailId }}"
GMAIL_ZB_LABEL = "={{ [$('Resolve Gmail label IDs (error)').item.json.zuBearbeitenLabelId].filter(Boolean) }}"
GMAIL_CRED = {"gmailOAuth2": {"id": "GMAIL_CREDENTIAL_ID", "name": "Gmail account"}}
IMAP_CRED = {"imap": {"id": "IMAP_CREDENTIAL_ID", "name": "IMAP account"}}
OPENAI_CRED = {"openAiApi": {"id": "OPENAI_CREDENTIAL_ID", "name": "OpenAI account"}}
HTTP_CRED = {"httpHeaderAuth": {"id": "HTTP_HEADER_AUTH_ID", "name": "Header Auth account"}}

AI_PROMPT = (
    "=You parse stakeholder emails into Kanban ticket fields for Join-Issue Collector.\n\n"
    "Return ONLY valid JSON with these keys:\n"
    "- title (string, max 80 chars)\n"
    "- description (string)\n"
    '- category: exactly "User Story" or "Technical Task"\n'
    '- priority: exactly "HighPriority", "MidPriority", or "LowPriority"\n'
    '- dueDate: "YYYY-MM-DD" or empty string\n'
    '- creatorName (string: first and last name from the email signature at the end of the body, '
    'or from the sender display name; never an email address; never the word "Stakeholder")\n\n'
    "Email from: {{ $json.from }}\n"
    "Subject: {{ $json.subject }}\n"
    "Body:\n{{ $json.body }}"
)

workflow = {
    "name": "Join-email-to-task-proposal",
    "nodes": [
        {
            "parameters": {
                "postProcessAction": "read",
                "options": {"customEmailConfig": '["UNSEEN"]', "forceReconnect": 15},
            },
            "id": "n-imap-trigger",
            "name": "Email Trigger (IMAP)",
            "type": "n8n-nodes-base.emailReadImap",
            "typeVersion": 2,
            "position": [0, 0],
            "credentials": IMAP_CRED,
            "notes": "Realtime IMAP. Marks UNSEEN mail as read after trigger.",
        },
        {
            "parameters": {"rule": {"interval": [{"field": "minutes", "minutesInterval": 5}]}},
            "id": "n-schedule",
            "name": "Schedule Trigger (every 5 min)",
            "type": "n8n-nodes-base.scheduleTrigger",
            "typeVersion": 1.2,
            "position": [0, 208],
            "notes": "Polls unread Gmail inbox every 5 minutes.",
        },
        {
            "parameters": {},
            "id": "n-manual",
            "name": "When clicking 'Execute workflow'",
            "type": "n8n-nodes-base.manualTrigger",
            "typeVersion": 1,
            "position": [0, 416],
            "notes": "Manual test without real email.",
        },
        {
            "parameters": {
                "resource": "message",
                "operation": "getAll",
                "returnAll": False,
                "limit": 10,
                "filters": {"readStatus": "unread", "labelIds": ["INBOX"]},
                "options": {"simplify": False},
            },
            "id": "n-fetch-gmail",
            "name": "Fetch unread emails (Gmail)",
            "type": "n8n-nodes-base.gmail",
            "typeVersion": 2.1,
            "position": [240, 208],
            "credentials": GMAIL_CRED,
        },
        {
            "parameters": {"jsCode": NORMALIZE_GMAIL_JS},
            "id": "n-norm-gmail",
            "name": "Normalize scheduled email",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [480, 208],
        },
        {
            "parameters": {"jsCode": NORMALIZE_IMAP_JS},
            "id": "n-norm-imap",
            "name": "Normalize IMAP email",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [480, 0],
        },
        {
            "parameters": {
                "assignments": {
                    "assignments": [
                        {"id": "s-from", "name": "from", "value": "Max Mustermann <test@example.com>", "type": "string"},
                        {"id": "s-subject", "name": "subject", "value": "Test Dark Mode", "type": "string"},
                        {
                            "id": "s-body",
                            "name": "body",
                            "value": "Bitte Dark Mode bis Ende August testen.\n\nMit freundlichen Grüßen\nMax Mustermann",
                            "type": "string",
                        },
                        {"id": "s-msgid", "name": "messageId", "value": "<manual-test-001@join-collector.local>", "type": "string"},
                        {"id": "s-source", "name": "emailSource", "value": "manual", "type": "string"},
                        {"id": "s-gmail", "name": "gmailId", "value": "", "type": "string"},
                    ]
                },
                "options": {},
            },
            "id": "n-sample",
            "name": "Sample stakeholder email",
            "type": "n8n-nodes-base.set",
            "typeVersion": 3.4,
            "position": [240, 416],
            "notes": "Sample data for manual test path.",
        },
        {
            "parameters": {"promptType": "define", "text": AI_PROMPT},
            "id": "n-ai-parse",
            "name": "Parse ticket with AI",
            "type": "@n8n/n8n-nodes-langchain.chainLlm",
            "typeVersion": 1.5,
            "position": [760, 208],
        },
        {
            "parameters": {
                "model": {"__rl": True, "mode": "list", "value": "gpt-4o-mini"},
                "options": {"temperature": 0.2},
            },
            "id": "n-openai",
            "name": "OpenAI Chat Model",
            "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
            "typeVersion": 1.2,
            "position": [760, 432],
            "credentials": OPENAI_CRED,
        },
        {
            "parameters": {"jsCode": BUILD_PAYLOAD_JS},
            "id": "n-build",
            "name": "Build Join payload",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [1000, 208],
        },
        {
            "parameters": {
                "method": "POST",
                "url": "https://join-issue-collector-70cb7.web.app/internal/n8n/tasks",
                "authentication": "genericCredentialType",
                "genericAuthType": "httpHeaderAuth",
                "sendHeaders": True,
                "headerParameters": {"parameters": [{"name": "Content-Type", "value": "application/json"}]},
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": "={{ JSON.stringify($json) }}",
                "options": {"response": {"response": {"fullResponse": True, "neverError": True}}},
            },
            "id": "n-create",
            "name": "Create task in Triage",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [1240, 208],
            "credentials": HTTP_CRED,
            "notes": "POST to Firebase via Hosting rewrite. Needs Header Auth credential.",
        },
        {
            "parameters": {"jsCode": EVALUATE_JS},
            "id": "n-eval",
            "name": "Evaluate create result",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [1480, 208],
        },
        {
            "parameters": IF_OK,
            "id": "n-if-ok",
            "name": "IF task created",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2.2,
            "position": [1720, 208],
        },
        {
            "parameters": {"jsCode": PREPARE_ARCHIVE_JS},
            "id": "n-prep-ok",
            "name": "Prepare success archive",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [1960, 80],
        },
        {
            "parameters": IF_NOT_MANUAL,
            "id": "n-if-not-manual-ok",
            "name": "IF not manual test",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2.2,
            "position": [2200, 80],
            "notes": "Skips Gmail archive for manual test runs.",
        },
        {
            "parameters": {"resource": "label", "operation": "getAll", "returnAll": True},
            "id": "n-get-labels-ok",
            "name": "Get Gmail labels",
            "type": "n8n-nodes-base.gmail",
            "typeVersion": 2.1,
            "position": [2440, 80],
            "credentials": GMAIL_CRED,
            "notes": "Loads label IDs for Erledigt / zu bearbeiten.",
        },
        {
            "parameters": {"jsCode": RESOLVE_LABELS_OK_JS},
            "id": "n-resolve-labels-ok",
            "name": "Resolve Gmail label IDs",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [2680, 80],
        },
        {
            "parameters": IF_DIRECT,
            "id": "n-if-direct",
            "name": "IF direct Gmail ID",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2.2,
            "position": [2920, 80],
        },
        {
            "parameters": {"resource": "message", "operation": "markAsRead", "messageId": GMAIL_ARCHIVE_MSG_ID},
            "id": "n-mark-read",
            "name": "Mark Gmail read",
            "type": "n8n-nodes-base.gmail",
            "typeVersion": 2.1,
            "position": [3160, -16],
            "credentials": GMAIL_CRED,
        },
        {
            "parameters": IF_LABEL_OK,
            "id": "n-if-label-ok",
            "name": "IF Erledigt label found",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2.2,
            "position": [3400, -16],
        },
        {
            "parameters": {
                "resource": "message",
                "operation": "addLabels",
                "messageId": GMAIL_ARCHIVE_MSG_ID,
                "labelIds": GMAIL_ERLEDIGT_LABEL,
            },
            "id": "n-add-erledigt",
            "name": "Add Erledigt label",
            "type": "n8n-nodes-base.gmail",
            "typeVersion": 2.1,
            "position": [3640, -16],
            "credentials": GMAIL_CRED,
            "notes": "Requires Gmail label: Erledigt",
        },
        {
            "parameters": {
                "resource": "message",
                "operation": "removeLabels",
                "messageId": GMAIL_ARCHIVE_MSG_ID,
                "labelIds": ["INBOX", "UNREAD"],
            },
            "id": "n-rm-inbox",
            "name": "Remove from Inbox",
            "type": "n8n-nodes-base.gmail",
            "typeVersion": 2.1,
            "position": [3880, -16],
            "credentials": GMAIL_CRED,
        },
        {
            "parameters": {
                "resource": "message",
                "operation": "getAll",
                "returnAll": False,
                "limit": 1,
                "filters": {"q": "=rfc822msgid:{{ $json.searchRfcId }}"},
                "options": {"simplify": False},
            },
            "id": "n-find-rfc",
            "name": "Find Gmail by RFC ID",
            "type": "n8n-nodes-base.gmail",
            "typeVersion": 2.1,
            "position": [3160, 176],
            "credentials": GMAIL_CRED,
            "continueOnFail": True,
        },
        {
            "parameters": {"jsCode": PICK_ARCHIVE_JS},
            "id": "n-pick-rfc",
            "name": "Pick Gmail ID for archive",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [3400, 176],
        },
        {
            "parameters": IF_CAN_ARCHIVE,
            "id": "n-if-can-archive",
            "name": "IF archive ID found",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2.2,
            "position": [3640, 176],
        },
        {
            "parameters": {"jsCode": PREPARE_ARCHIVE_JS},
            "id": "n-prep-err",
            "name": "Prepare error archive",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [1960, 336],
        },
        {
            "parameters": IF_NOT_MANUAL,
            "id": "n-if-not-manual-err",
            "name": "IF not manual test (error)",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2.2,
            "position": [2200, 336],
        },
        {
            "parameters": {"resource": "label", "operation": "getAll", "returnAll": True},
            "id": "n-get-labels-err",
            "name": "Get Gmail labels (error)",
            "type": "n8n-nodes-base.gmail",
            "typeVersion": 2.1,
            "position": [2440, 336],
            "credentials": GMAIL_CRED,
        },
        {
            "parameters": {"jsCode": RESOLVE_LABELS_ERR_JS},
            "id": "n-resolve-labels-err",
            "name": "Resolve Gmail label IDs (error)",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [2680, 336],
        },
        {
            "parameters": IF_DIRECT,
            "id": "n-if-direct-err",
            "name": "IF direct Gmail ID (error)",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2.2,
            "position": [2920, 336],
        },
        {
            "parameters": {
                "resource": "message",
                "operation": "addLabels",
                "messageId": GMAIL_ZB_MSG_ID,
                "labelIds": GMAIL_ZB_LABEL,
            },
            "id": "n-add-zb",
            "name": "Add zu bearbeiten label",
            "type": "n8n-nodes-base.gmail",
            "typeVersion": 2.1,
            "position": [3160, 336],
            "credentials": GMAIL_CRED,
            "notes": "Requires Gmail label: zu bearbeiten",
        },
        {
            "parameters": {
                "resource": "message",
                "operation": "getAll",
                "returnAll": False,
                "limit": 1,
                "filters": {"q": "=rfc822msgid:{{ $json.searchRfcId }}"},
                "options": {"simplify": False},
            },
            "id": "n-find-rfc-err",
            "name": "Find Gmail by RFC ID (error)",
            "type": "n8n-nodes-base.gmail",
            "typeVersion": 2.1,
            "position": [3160, 496],
            "credentials": GMAIL_CRED,
            "continueOnFail": True,
        },
        {
            "parameters": {"jsCode": PICK_ERROR_JS},
            "id": "n-pick-rfc-err",
            "name": "Pick Gmail ID for error",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [3400, 496],
        },
    ],
    "pinData": {},
    "connections": {
        "Email Trigger (IMAP)": {"main": [[{"node": "Normalize IMAP email", "type": "main", "index": 0}]]},
        "Schedule Trigger (every 5 min)": {"main": [[{"node": "Fetch unread emails (Gmail)", "type": "main", "index": 0}]]},
        "When clicking 'Execute workflow'": {"main": [[{"node": "Sample stakeholder email", "type": "main", "index": 0}]]},
        "Fetch unread emails (Gmail)": {"main": [[{"node": "Normalize scheduled email", "type": "main", "index": 0}]]},
        "Normalize scheduled email": {"main": [[{"node": "Parse ticket with AI", "type": "main", "index": 0}]]},
        "Normalize IMAP email": {"main": [[{"node": "Parse ticket with AI", "type": "main", "index": 0}]]},
        "Sample stakeholder email": {"main": [[{"node": "Parse ticket with AI", "type": "main", "index": 0}]]},
        "OpenAI Chat Model": {"ai_languageModel": [[{"node": "Parse ticket with AI", "type": "ai_languageModel", "index": 0}]]},
        "Parse ticket with AI": {"main": [[{"node": "Build Join payload", "type": "main", "index": 0}]]},
        "Build Join payload": {"main": [[{"node": "Create task in Triage", "type": "main", "index": 0}]]},
        "Create task in Triage": {"main": [[{"node": "Evaluate create result", "type": "main", "index": 0}]]},
        "Evaluate create result": {"main": [[{"node": "IF task created", "type": "main", "index": 0}]]},
        "IF task created": {
            "main": [
                [{"node": "Prepare success archive", "type": "main", "index": 0}],
                [{"node": "Prepare error archive", "type": "main", "index": 0}],
            ]
        },
        "Prepare success archive": {"main": [[{"node": "IF not manual test", "type": "main", "index": 0}]]},
        "IF not manual test": {
            "main": [[{"node": "Get Gmail labels", "type": "main", "index": 0}], []]
        },
        "Get Gmail labels": {"main": [[{"node": "Resolve Gmail label IDs", "type": "main", "index": 0}]]},
        "Resolve Gmail label IDs": {"main": [[{"node": "IF direct Gmail ID", "type": "main", "index": 0}]]},
        "IF direct Gmail ID": {
            "main": [
                [{"node": "Mark Gmail read", "type": "main", "index": 0}],
                [{"node": "Find Gmail by RFC ID", "type": "main", "index": 0}],
            ]
        },
        "Mark Gmail read": {"main": [[{"node": "Add Erledigt label", "type": "main", "index": 0}]]},
        "Add Erledigt label": {"main": [[{"node": "Remove from Inbox", "type": "main", "index": 0}]]},
        "Find Gmail by RFC ID": {"main": [[{"node": "Pick Gmail ID for archive", "type": "main", "index": 0}]]},
        "Pick Gmail ID for archive": {"main": [[{"node": "IF archive ID found", "type": "main", "index": 0}]]},
        "IF archive ID found": {"main": [[{"node": "Mark Gmail read", "type": "main", "index": 0}], []]},
        "Prepare error archive": {"main": [[{"node": "IF not manual test (error)", "type": "main", "index": 0}]]},
        "IF not manual test (error)": {
            "main": [[{"node": "Get Gmail labels (error)", "type": "main", "index": 0}], []]
        },
        "Get Gmail labels (error)": {
            "main": [[{"node": "Resolve Gmail label IDs (error)", "type": "main", "index": 0}]]
        },
        "Resolve Gmail label IDs (error)": {
            "main": [[{"node": "IF direct Gmail ID (error)", "type": "main", "index": 0}]]
        },
        "IF direct Gmail ID (error)": {
            "main": [
                [{"node": "Add zu bearbeiten label", "type": "main", "index": 0}],
                [{"node": "Find Gmail by RFC ID (error)", "type": "main", "index": 0}],
            ]
        },
        "Find Gmail by RFC ID (error)": {"main": [[{"node": "Pick Gmail ID for error", "type": "main", "index": 0}]]},
        "Pick Gmail ID for error": {"main": [[{"node": "Add zu bearbeiten label", "type": "main", "index": 0}]]},
    },
    "active": False,
    "settings": {"executionOrder": "v1", "binaryMode": "separate", "availableInMCP": False},
    "meta": {"templateCredsSetupCompleted": True},
    "tags": [],
}

OUT.write_text(json.dumps(workflow, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"Wrote {OUT} ({len(workflow['nodes'])} nodes)")
