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
  const subject =
    item.subject ||
    item.Subject ||
    item.envelope?.subject ||
    item.headers?.subject?.[0] ||
    item.headers?.subject ||
    '';
  return normalizeEmailText(subject);
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

function decodeHtmlEntities(value) {
  function fromCodePointOrRaw(raw, codePoint) {
    if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return raw;
    try { return String.fromCodePoint(codePoint); } catch (_) { return raw; }
  }
  const named = {
    nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
    Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', auml: 'ä', ouml: 'ö', uuml: 'ü', szlig: 'ß',
  };
  return String(value || '')
    .replace(/&#(\d+);/g, (raw, dec) => fromCodePointOrRaw(raw, Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (raw, hex) => fromCodePointOrRaw(raw, parseInt(hex, 16)))
    .replace(/&([a-zA-Z]+);/g, (match, key) => named[key] ?? match);
}

function decodeMimeWords(value) {
  return String(value || '').replace(/=\?([^?]+)\?([bqBQ])\?([^?]*)\?=/g, (_, charset, encoding, content) => {
    try {
      let bytes;
      if (String(encoding).toUpperCase() === 'B') {
        bytes = Buffer.from(content, 'base64');
      } else {
        const qp = content
          .replace(/_/g, ' ')
          .replace(/=([0-9A-F]{2})/gi, (__unused, hex) => String.fromCharCode(parseInt(hex, 16)));
        bytes = Buffer.from(qp, 'latin1');
      }
      const label = String(charset || 'utf-8').toLowerCase();
      const latin = label.includes('iso-8859-1') || label.includes('latin1') || label.includes('windows-1252');
      return bytes.toString(latin ? 'latin1' : 'utf8');
    } catch (_) {
      return content;
    }
  });
}

function looksQuotedPrintable(value) {
  const text = String(value || '');
  if (/=\r?\n/.test(text)) return true;
  const matches = text.match(/=[0-9A-F]{2}/gi);
  return Array.isArray(matches) && matches.length >= 2;
}

function decodeQuotedPrintable(value) {
  const input = String(value || '');
  if (!looksQuotedPrintable(input)) return input;
  const unfolded = input.replace(/=\r?\n/g, '');
  return unfolded.replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function repairMojibake(value) {
  const input = String(value || '');
  if (!/[ÃÂâ][\x80-\xBF]/.test(input)) return input;
  try {
    const repaired = Buffer.from(input, 'latin1').toString('utf8');
    return repaired.includes('�') ? input : repaired;
  } catch (_) {
    return input;
  }
}

function normalizeEmailText(value) {
  let text = decodeMimeWords(value);
  text = decodeQuotedPrintable(text);
  text = repairMojibake(text);
  text = decodeHtmlEntities(text);
  return String(text || '').replace(/\r/g, '').trim();
}

function extractBody(item) {
  const candidates = [item.textPlain, item.text, item.textContent, item.textAsHtml, item.textHtml, item.htmlContent];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      const raw = candidate.includes('<') ? stripHtml(candidate) : candidate.trim();
      return normalizeEmailText(raw);
    }
  }
  return item.snippet ? normalizeEmailText(item.snippet) : '';
}

function extractMessageId(item) {
  const header = item.headers?.['message-id'];
  if (Array.isArray(header) && header[0]) return String(header[0]).trim();
  if (typeof header === 'string' && header.trim()) return header.trim();
  return String(item.id || item.messageId || '').trim();
}

return [{
  json: {
    from: normalizeEmailText(extractFrom(data)),
    subject: extractSubject(data),
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

NODE_LOOKUP_HELPER = r"""function nodeNameVariants(base) {
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
        const json = $(name).item.json;
        if (json && predicate(json)) return json;
      } catch (_) {}
    }
  }
  return null;
}
"""

BUILD_PAYLOAD_JS = NODE_LOOKUP_HELPER + r"""const aiItem = $input.item.json;
const email = readNodeJson(
  [
    'Normalize scheduled email',
    'Normalize IMAP email',
    'Sample stakeholder email',
    'Format for OpenAI chat',
  ],
  (candidate) => Boolean(candidate?.from || candidate?.subject || candidate?.body)
);

if (!email) {
  throw new Error(
    'No stakeholder email context found. Expected output from Normalize scheduled email, Normalize IMAP email, or Sample stakeholder email.'
  );
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

EVALUATE_JS = NODE_LOOKUP_HELPER + r"""const http = $input.item.json;
const payload = readNodeJson(['Build Join payload'], (candidate) => Boolean(candidate?.title));
if (!payload) {
  throw new Error('Build Join payload output not found.');
}
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

return [{
  json: {
    ok,
    statusCode,
    duplicate: Boolean(body?.duplicate),
    createdId,
    title: payload.title || '',
    creatorName: payload.creatorName || '',
    creatorEmail: payload.creatorEmail || '',
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

AUTO_CAP_JS = r"""const CAP = 10;
const items = $input.all();
const today = new Date().toISOString().slice(0, 10);
const hasStaticDataApi = typeof $getWorkflowStaticData === 'function';

let processedToday = 0;
let staticData = null;

if (hasStaticDataApi) {
  staticData = $getWorkflowStaticData('global');
  if (staticData.autoCapDate !== today) {
    staticData.autoCapDate = today;
    staticData.autoCapCount = 0;
  }
  if (!Number.isInteger(staticData.autoCapCount) || staticData.autoCapCount < 0) {
    staticData.autoCapCount = 0;
  }
  processedToday = staticData.autoCapCount;
}

return items.map((item, index) => {
  const source = String(item.json.emailSource || '').trim().toLowerCase();
  const isManual = source === 'manual';
  let skipTaskCreation = false;
  let skipReason = '';

  if (!isManual) {
    if (processedToday >= CAP) {
      skipTaskCreation = true;
      skipReason = 'AUTO_EMAIL_CAP_REACHED';
    } else {
      processedToday += 1;
      if (staticData) staticData.autoCapCount = processedToday;
    }
  }

  // Fallback: if static storage is unavailable, cap applies per batch only.
  if (!hasStaticDataApi && !isManual) {
    skipTaskCreation = index >= CAP;
    skipReason = skipTaskCreation ? 'AUTO_EMAIL_CAP_REACHED' : '';
  }

  return {
    json: {
      ...item.json,
      autoCap: CAP,
      autoCapDate: today,
      autoProcessedToday: processedToday,
      batchIndex: index + 1,
      batchCount: items.length,
      skipTaskCreation,
      skipReason,
      capBypassedForManual: isManual,
      capMode: hasStaticDataApi ? 'daily' : 'batch-fallback',
    },
  };
});"""

PICK_ARCHIVE_JS = NODE_LOOKUP_HELPER + r"""const ctx = readNodeJson(['Resolve Gmail label IDs'], () => true);
if (!ctx) {
  throw new Error('Resolve Gmail label IDs output not found.');
}
const found = $input.item.json;
const archiveGmailId = String(found.id || '').trim();
if (!archiveGmailId) {
  return [{ json: { ...ctx, archiveSkipped: true, skipReason: 'Gmail message not found for archive' } }];
}
return [{ json: { ...ctx, archiveGmailId, archiveSkipped: false } }];
"""

PICK_ERROR_JS = PICK_ARCHIVE_JS.replace(
    "Resolve Gmail label IDs", "Resolve Gmail label IDs (error)"
)

RESOLVE_LABELS_JS = NODE_LOOKUP_HELPER + r"""const ctx = readNodeJson(['SOURCE_BASE'], () => true);
if (!ctx) {
  throw new Error('SOURCE_BASE output not found.');
}
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

RESOLVE_LABELS_OK_JS = (
    RESOLVE_LABELS_JS.replace("SOURCE_BASE", "Prepare success archive").replace(
        "labelsResolved: Boolean(erledigtLabelId && zuBearbeitenLabelId),",
        "labelsResolved: Boolean(erledigtLabelId),",
    )
)
RESOLVE_LABELS_ERR_JS = (
    RESOLVE_LABELS_JS.replace("SOURCE_BASE", "Prepare error archive").replace(
        "labelsResolved: Boolean(erledigtLabelId && zuBearbeitenLabelId),",
        "labelsResolved: Boolean(zuBearbeitenLabelId),",
    )
)

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
                "leftValue": "={{ $('Resolve Gmail label IDs').item.json.erledigtLabelId }}",
                "rightValue": "",
                "operator": {"type": "string", "operation": "notEmpty"},
            }
        ],
        "combinator": "and",
    },
    "options": {},
}

IF_LABEL_ERR = {
    "conditions": {
        "options": {
            "caseSensitive": True,
            "leftValue": "",
            "typeValidation": "strict",
            "version": 2,
        },
        "conditions": [
            {
                "id": "zb-label",
                "leftValue": "={{ $('Resolve Gmail label IDs (error)').item.json.zuBearbeitenLabelId }}",
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

IF_WITHIN_AUTO_CAP = {
    "conditions": {
        "options": {
            "caseSensitive": True,
            "leftValue": "",
            "typeValidation": "strict",
            "version": 2,
        },
        "conditions": [
            {
                "id": "within-cap",
                "leftValue": "={{ $json.skipTaskCreation }}",
                "rightValue": True,
                "operator": {"type": "boolean", "operation": "false"},
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

IF_CAP_REACHED = {
    "conditions": {
        "options": {
            "caseSensitive": True,
            "leftValue": "",
            "typeValidation": "strict",
            "version": 2,
        },
        "conditions": [
            {
                "id": "cap-reached",
                "leftValue": "={{ $json.skipReason }}",
                "rightValue": "AUTO_EMAIL_CAP_REACHED",
                "operator": {"type": "string", "operation": "equals"},
            }
        ],
        "combinator": "and",
    },
    "options": {},
}

MAIL_TO_STAKEHOLDER = "={{ $json.creatorEmail }}"
MAIL_SUBJECT_SUCCESS = "={{ 'Bestaetigung: Ticket in Triage angelegt - ' + ($json.title || 'Anfrage') }}"
MAIL_MESSAGE_SUCCESS = (
    "={{ 'Hallo ' + ($json.creatorName || 'Stakeholder') + ',\\n\\n'"
    " + 'vielen Dank fuer Ihre Nachricht. Ihr Ticket wurde erfolgreich im Join Task Board "
    "(Spalte Triage) angelegt.\\n\\n'"
    " + 'Betreff: ' + ($json.title || 'Anfrage') + '\\n\\n'"
    " + 'Viele Gruesse\\nJoin Team' }}"
)
MAIL_SUBJECT_CAP = "={{ 'Hinweis: Tageslimit fuer automatische Ticket-Erstellung erreicht' }}"
MAIL_MESSAGE_CAP = (
    "={{ 'Hallo ' + ($json.creatorName || 'Stakeholder') + ',\\n\\n'"
    " + 'wir haben Ihre E-Mail erhalten. Das Tageslimit fuer die automatische Ticket-Erstellung "
    "ist heute bereits erreicht.\\n'"
    " + 'Ihr Anliegen wird vom Team manuell geprueft und ins Task Board uebertragen.\\n\\n'"
    " + 'Viele Gruesse\\nJoin Team' }}"
)
MAIL_SUBJECT_ERROR = "={{ 'Hinweis: E-Mail erhalten - manuelle Rueckmeldung folgt' }}"
MAIL_MESSAGE_ERROR = (
    "={{ 'Hallo ' + ($json.creatorName || 'Stakeholder') + ',\\n\\n'"
    " + 'wir haben Ihre E-Mail erhalten. Bei der automatischen Verarbeitung ist ein Fehler aufgetreten.\\n'"
    " + 'Das Team kuemmert sich zeitnah manuell um Ihr Anliegen.\\n\\n'"
    " + 'Viele Gruesse\\nJoin Team' }}"
)

GMAIL_ARCHIVE_MSG_ID = (
    "={{ $('Resolve Gmail label IDs').item.json.archiveGmailId "
    "|| $('Pick Gmail ID for archive').item.json.archiveGmailId "
    "|| $('Prepare success archive').item.json.archiveGmailId }}"
)
GMAIL_ERLEDIGT_LABEL = "={{ $('Resolve Gmail label IDs').item.json.erledigtLabelId }}"
GMAIL_RFC_QUERY_OK = (
    "=rfc822msgid:{{ $('Resolve Gmail label IDs').item.json.searchRfcId }}"
)
GMAIL_ZB_MSG_ID = (
    "={{ $('Resolve Gmail label IDs (error)').item.json.archiveGmailId "
    "|| $('Pick Gmail ID for error').item.json.archiveGmailId "
    "|| $('Prepare error archive').item.json.archiveGmailId }}"
)
GMAIL_ZB_LABEL = "={{ $('Resolve Gmail label IDs (error)').item.json.zuBearbeitenLabelId }}"
GMAIL_RFC_QUERY_ERR = (
    "=rfc822msgid:{{ $('Resolve Gmail label IDs (error)').item.json.searchRfcId }}"
)
GMAIL_NODE_VERSION = 2.1
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
                "returnAll": True,
                "filters": {"readStatus": "unread", "labelIds": ["INBOX"]},
                "options": {"simplify": False},
            },
            "id": "n-fetch-gmail",
            "name": "Fetch unread emails (Gmail)",
            "type": "n8n-nodes-base.gmail",
            "typeVersion": GMAIL_NODE_VERSION,
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
            "parameters": {"mode": "runOnceForAllItems", "jsCode": AUTO_CAP_JS},
            "id": "n-cap-limit",
            "name": "Apply auto email cap (max 10)",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [1240, 320],
            "notes": "Daily cap for automated processing: after 10 emails per day, skip task creation and route to manual labeling path.",
        },
        {
            "parameters": IF_WITHIN_AUTO_CAP,
            "id": "n-if-cap",
            "name": "IF within auto cap",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2.2,
            "position": [1480, 320],
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
            "parameters": {
                "resource": "message",
                "operation": "send",
                "sendTo": MAIL_TO_STAKEHOLDER,
                "subject": MAIL_SUBJECT_SUCCESS,
                "emailType": "text",
                "message": MAIL_MESSAGE_SUCCESS,
                "options": {"appendAttribution": False},
            },
            "id": "n-mail-success",
            "name": "Send success response",
            "type": "n8n-nodes-base.gmail",
            "typeVersion": GMAIL_NODE_VERSION,
            "position": [2440, -16],
            "credentials": GMAIL_CRED,
            "continueOnFail": True,
            "notes": "Confirmation email to stakeholder when task was created successfully.",
        },
        {
            "parameters": {"resource": "label", "operation": "getAll", "returnAll": True},
            "id": "n-get-labels-ok",
            "name": "Get Gmail labels",
            "type": "n8n-nodes-base.gmail",
            "typeVersion": GMAIL_NODE_VERSION,
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
            "notes": "Maps Gmail label names Erledigt / zu bearbeiten to Label_… IDs.",
        },
        {
            "parameters": IF_LABEL_OK,
            "id": "n-if-label-ok",
            "name": "IF Erledigt label found",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2.2,
            "position": [2920, 80],
            "notes": "Stops archive if Gmail label Erledigt is missing.",
        },
        {
            "parameters": IF_DIRECT,
            "id": "n-if-direct",
            "name": "IF direct Gmail ID",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2.2,
            "position": [3160, 80],
        },
        {
            "parameters": {"resource": "message", "operation": "markAsRead", "messageId": GMAIL_ARCHIVE_MSG_ID},
            "id": "n-mark-read",
            "name": "Mark Gmail read",
            "type": "n8n-nodes-base.gmail",
            "typeVersion": GMAIL_NODE_VERSION,
            "position": [3400, -16],
            "credentials": GMAIL_CRED,
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
            "typeVersion": GMAIL_NODE_VERSION,
            "position": [3640, -16],
            "credentials": GMAIL_CRED,
            "notes": "Uses Label_… ID from Resolve Gmail label IDs (not display name Erledigt).",
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
            "typeVersion": GMAIL_NODE_VERSION,
            "position": [3880, -16],
            "credentials": GMAIL_CRED,
        },
        {
            "parameters": {
                "resource": "message",
                "operation": "getAll",
                "returnAll": False,
                "limit": 1,
                "filters": {"q": GMAIL_RFC_QUERY_OK},
                "options": {"simplify": False},
            },
            "id": "n-find-rfc",
            "name": "Find Gmail by RFC ID",
            "type": "n8n-nodes-base.gmail",
            "typeVersion": GMAIL_NODE_VERSION,
            "position": [3400, 176],
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
            "parameters": IF_CAP_REACHED,
            "id": "n-if-cap-reached",
            "name": "IF cap reached",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2.2,
            "position": [2440, 336],
            "notes": "Distinguishes daily limit response from generic processing errors.",
        },
        {
            "parameters": {
                "resource": "message",
                "operation": "send",
                "sendTo": MAIL_TO_STAKEHOLDER,
                "subject": MAIL_SUBJECT_CAP,
                "emailType": "text",
                "message": MAIL_MESSAGE_CAP,
                "options": {"appendAttribution": False},
            },
            "id": "n-mail-cap",
            "name": "Send cap reached response",
            "type": "n8n-nodes-base.gmail",
            "typeVersion": GMAIL_NODE_VERSION,
            "position": [2680, 272],
            "credentials": GMAIL_CRED,
            "continueOnFail": True,
            "notes": "Automatic response when daily auto-processing limit is reached.",
        },
        {
            "parameters": {
                "resource": "message",
                "operation": "send",
                "sendTo": MAIL_TO_STAKEHOLDER,
                "subject": MAIL_SUBJECT_ERROR,
                "emailType": "text",
                "message": MAIL_MESSAGE_ERROR,
                "options": {"appendAttribution": False},
            },
            "id": "n-mail-error",
            "name": "Send processing error response",
            "type": "n8n-nodes-base.gmail",
            "typeVersion": GMAIL_NODE_VERSION,
            "position": [2680, 400],
            "credentials": GMAIL_CRED,
            "continueOnFail": True,
            "notes": "Automatic response when processing failed for other reasons.",
        },
        {
            "parameters": {"resource": "label", "operation": "getAll", "returnAll": True},
            "id": "n-get-labels-err",
            "name": "Get Gmail labels (error)",
            "type": "n8n-nodes-base.gmail",
            "typeVersion": GMAIL_NODE_VERSION,
            "position": [2920, 336],
            "credentials": GMAIL_CRED,
        },
        {
            "parameters": {"jsCode": RESOLVE_LABELS_ERR_JS},
            "id": "n-resolve-labels-err",
            "name": "Resolve Gmail label IDs (error)",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [2680, 336],
            "notes": "Maps Gmail label zu bearbeiten to Label_… ID.",
        },
        {
            "parameters": IF_LABEL_ERR,
            "id": "n-if-label-err",
            "name": "IF zu bearbeiten label found",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2.2,
            "position": [2920, 336],
            "notes": "Stops error archive if Gmail label zu bearbeiten is missing.",
        },
        {
            "parameters": IF_DIRECT,
            "id": "n-if-direct-err",
            "name": "IF direct Gmail ID (error)",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2.2,
            "position": [3160, 336],
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
            "typeVersion": GMAIL_NODE_VERSION,
            "position": [3400, 336],
            "credentials": GMAIL_CRED,
            "notes": "Uses Label_… ID from Resolve Gmail label IDs (error).",
        },
        {
            "parameters": {
                "resource": "message",
                "operation": "getAll",
                "returnAll": False,
                "limit": 1,
                "filters": {"q": GMAIL_RFC_QUERY_ERR},
                "options": {"simplify": False},
            },
            "id": "n-find-rfc-err",
            "name": "Find Gmail by RFC ID (error)",
            "type": "n8n-nodes-base.gmail",
            "typeVersion": GMAIL_NODE_VERSION,
            "position": [3400, 496],
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
        "Build Join payload": {"main": [[{"node": "Apply auto email cap (max 10)", "type": "main", "index": 0}]]},
        "Apply auto email cap (max 10)": {"main": [[{"node": "IF within auto cap", "type": "main", "index": 0}]]},
        "IF within auto cap": {
            "main": [
                [{"node": "Create task in Triage", "type": "main", "index": 0}],
                [{"node": "Prepare error archive", "type": "main", "index": 0}],
            ]
        },
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
            "main": [[{"node": "Send success response", "type": "main", "index": 0}], []]
        },
        "Send success response": {"main": [[{"node": "Get Gmail labels", "type": "main", "index": 0}]]},
        "Get Gmail labels": {"main": [[{"node": "Resolve Gmail label IDs", "type": "main", "index": 0}]]},
        "Resolve Gmail label IDs": {"main": [[{"node": "IF Erledigt label found", "type": "main", "index": 0}]]},
        "IF Erledigt label found": {
            "main": [[{"node": "IF direct Gmail ID", "type": "main", "index": 0}], []]
        },
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
            "main": [[{"node": "IF cap reached", "type": "main", "index": 0}], []]
        },
        "IF cap reached": {
            "main": [
                [{"node": "Send cap reached response", "type": "main", "index": 0}],
                [{"node": "Send processing error response", "type": "main", "index": 0}],
            ]
        },
        "Send cap reached response": {
            "main": [[{"node": "Get Gmail labels (error)", "type": "main", "index": 0}]]
        },
        "Send processing error response": {
            "main": [[{"node": "Get Gmail labels (error)", "type": "main", "index": 0}]]
        },
        "Get Gmail labels (error)": {
            "main": [[{"node": "Resolve Gmail label IDs (error)", "type": "main", "index": 0}]]
        },
        "Resolve Gmail label IDs (error)": {
            "main": [[{"node": "IF zu bearbeiten label found", "type": "main", "index": 0}]]
        },
        "IF zu bearbeiten label found": {
            "main": [[{"node": "IF direct Gmail ID (error)", "type": "main", "index": 0}], []]
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
