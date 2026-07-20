"""Regenerates n8n/workflows/Join-email-to-task-proposal.json.

Condensed exercise layout (cost + maintainability):
1. Shared Gmail archive branch (success/cap/error)
2. Cached Gmail label IDs in workflow static data
3. Archive only when a direct gmailId exists (no RFC lookup)
4. Set/expression nodes instead of heavy Code where practical
5. One stakeholder feedback Gmail send (subject/body by outcome)
6. Single early IF not manual before feedback/archive
7. One Gmail API modify call (add target label + remove INBOX/UNREAD)
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "workflows" / "Join-email-to-task-proposal.json"

# IMAP/sample field mapping + UTF-8 / mojibake repair for German umlauts.
PREPARE_EMAIL_JS = r"""const data = $input.item.json;

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
  return String(
    item.subject || item.Subject || item.envelope?.subject ||
    item.headers?.subject?.[0] || item.headers?.subject || ''
  ).trim();
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
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
  // UTF-8 misread as Latin-1/Windows-1252 (e.g. "Ã¼" → "ü", "Ã¤" → "ä").
  if (!/[ÃÂâ][\x80-\xBF]/.test(input)) return input;
  try {
    const repaired = Buffer.from(input, 'latin1').toString('utf8');
    return repaired.includes('\uFFFD') ? input : repaired;
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
  for (const candidate of [
    item.body, item.textPlain, item.text, item.textContent,
    item.textAsHtml, item.textHtml, item.htmlContent, item.html,
  ]) {
    if (typeof candidate === 'string' && candidate.trim()) {
      const raw = candidate.includes('<') ? stripHtml(candidate) : candidate.trim();
      const normalized = normalizeEmailText(raw);
      if (normalized) return normalized;
    }
  }
  return item.snippet ? normalizeEmailText(item.snippet) : '';
}

function extractMessageId(item) {
  const header = item.headers?.['message-id'] || item.messageId;
  if (Array.isArray(header) && header[0]) return String(header[0]).trim();
  if (typeof header === 'string' && header.trim()) return header.trim();
  if (item.metadata?.['message-id']) return String(item.metadata['message-id']).trim();
  const uid = item.attributes?.uid || item.uid;
  return uid ? `imap-${uid}` : String(item.id || '').trim();
}

const from = normalizeEmailText(extractFrom(data));
const subject = normalizeEmailText(extractSubject(data));
const body = extractBody(data);
const creatorEmail = from.match(/<([^>]+)>/)?.[1] || from.trim();
const nameMatch = from.match(/^([^<]+)</);
const creatorNameRaw = nameMatch
  ? nameMatch[1].trim().replace(/^["']|["']$/g, '')
  : '';
const creatorName = normalizeEmailText(creatorNameRaw);

return [{
  json: {
    from,
    subject,
    body,
    messageId: extractMessageId(data),
    sourceMessageId: extractMessageId(data),
    gmailId: String(data.gmailId || '').trim(),
    emailSource: String(data.emailSource || 'imap').trim() || 'imap',
    title: subject || 'Stakeholder request',
    creatorName: creatorName && !creatorName.includes('@') ? creatorName : '',
    creatorEmail,
  },
}];"""

AUTO_CAP_JS = r"""const AUTO_CAP = 10;
const items = $input.all();
const today = new Date().toISOString().slice(0, 10);
const hasStaticDataApi = typeof $getWorkflowStaticData === 'function';
let autoProcessedToday = 0;
let staticData = null;
let autoBatchProcessed = 0;

if (hasStaticDataApi) {
  staticData = $getWorkflowStaticData('global');
  if (staticData.capDate !== today) {
    staticData.capDate = today;
    staticData.autoCapCount = 0;
  }
  if (!Number.isInteger(staticData.autoCapCount) || staticData.autoCapCount < 0) {
    staticData.autoCapCount = 0;
  }
  autoProcessedToday = staticData.autoCapCount;
}

return items.map((item, index) => {
  const source = String(item.json.emailSource || '').trim().toLowerCase();
  const isManual = source === 'manual';
  let skipTaskCreation = false;
  let skipReason = '';

  if (!isManual) {
    if (hasStaticDataApi) {
      if (autoProcessedToday >= AUTO_CAP) {
        skipTaskCreation = true;
        skipReason = 'AUTO_EMAIL_CAP_REACHED';
      } else {
        autoProcessedToday += 1;
        staticData.autoCapCount = autoProcessedToday;
      }
    } else if (autoBatchProcessed >= AUTO_CAP) {
      skipTaskCreation = true;
      skipReason = 'AUTO_EMAIL_CAP_REACHED';
    } else {
      autoBatchProcessed += 1;
      autoProcessedToday = autoBatchProcessed;
    }
  }

  return {
    json: {
      ...item.json,
      autoCap: AUTO_CAP,
      autoCapDate: today,
      autoProcessedToday,
      batchIndex: index + 1,
      batchCount: items.length,
      skipTaskCreation,
      skipReason,
      capBypassedForManual: isManual,
    },
  };
});"""

CHECK_LABEL_CACHE_JS = r"""function readOutcomeContext() {
  const bases = [
    'IF not manual test',
    'Set outcome success',
    'Set outcome error',
    'Set outcome cap',
  ];
  for (const name of bases) {
    try {
      const json = $(name).item.json;
      if (json && (json.outcome || json.archiveLabelName || json.gmailId || json.creatorEmail)) {
        return json;
      }
    } catch (_) {}
  }
  return $input.item.json;
}

const ctx = readOutcomeContext();
const hasStaticDataApi = typeof $getWorkflowStaticData === 'function';
const staticData = hasStaticDataApi ? $getWorkflowStaticData('global') : {};
const cache = staticData.labelCache && typeof staticData.labelCache === 'object'
  ? staticData.labelCache
  : {};
const emailDoneLabelId = String(cache['email done'] || '').trim();
const needsReviewLabelId = String(cache['needs review'] || '').trim();
const cacheHit = Boolean(emailDoneLabelId && needsReviewLabelId);
const archiveLabelName = String(ctx.archiveLabelName || 'needs review').trim().toLowerCase();
const targetLabelId = archiveLabelName === 'email done' ? emailDoneLabelId : needsReviewLabelId;

return [{
  json: {
    ...ctx,
    emailDoneLabelId,
    needsReviewLabelId,
    targetLabelId,
    cacheHit,
    archiveLabelName,
  },
}];"""

STORE_LABEL_CACHE_JS = r"""const ctx = $('Check label cache').item.json;
const labels = $input.all().map((item) => item.json);
const hasStaticDataApi = typeof $getWorkflowStaticData === 'function';
const staticData = hasStaticDataApi ? $getWorkflowStaticData('global') : { labelCache: {} };
if (!staticData.labelCache || typeof staticData.labelCache !== 'object') {
  staticData.labelCache = {};
}

function findLabelId(...names) {
  for (const wanted of names) {
    const hit = labels.find(
      (label) => String(label.name || '').trim().toLowerCase() === wanted.toLowerCase()
    );
    if (hit?.id) return String(hit.id);
  }
  return '';
}

const emailDoneLabelId = findLabelId('email done', 'Email done', 'Email Done');
const needsReviewLabelId = findLabelId('needs review', 'Needs review', 'Needs Review');
if (emailDoneLabelId) staticData.labelCache['email done'] = emailDoneLabelId;
if (needsReviewLabelId) staticData.labelCache['needs review'] = needsReviewLabelId;

const archiveLabelName = String(ctx.archiveLabelName || 'needs review').trim().toLowerCase();
const targetLabelId = archiveLabelName === 'email done' ? emailDoneLabelId : needsReviewLabelId;

return [{
  json: {
    ...ctx,
    emailDoneLabelId,
    needsReviewLabelId,
    targetLabelId,
    cacheHit: Boolean(emailDoneLabelId && needsReviewLabelId),
    labelsFromCache: false,
  },
}];"""

GMAIL_CRED = {"gmailOAuth2": {"id": "15U509ehBEzJwEV9", "name": "Gmail account 3"}}
IMAP_CRED = {"imap": {"id": "v6fJz0hh1XAMh9uB", "name": "IMAP account 3"}}
OPENAI_CRED = {"openAiApi": {"id": "qXmdRSJivefpurUF", "name": "OpenAI account 2"}}
HTTP_CRED = {"httpHeaderAuth": {"id": "HjH4uC7k7UHF6k0F", "name": "Header Auth account"}}
GMAIL_NODE_VERSION = 2.1

AI_PROMPT = (
    "=You parse stakeholder emails into Kanban ticket fields for Join-Issue Collector.\n\n"
    "Two email styles are common:\n"
    "1) Create Request template with labels Description: / Subtask: / Enddate:\n"
    "2) Free-form email with optional Subtasks list and a deadline line like 'bis 27.7.26'.\n\n"
    "Rules:\n"
    "- title: short summary, max 80 chars\n"
    "- description: request text without subtasks, deadlines, greeting/signature\n"
    "- subtasks: only explicit Subtask/Subtasks list items; else []\n"
    "- dueDate: YYYY-MM-DD or empty string\n"
    '- category: "User Story" or "Technical Task"\n'
    '- priority: "HighPriority", "MidPriority", or "LowPriority"\n'
    "- creatorName: person name from signature/display name; never an email\n"
    "- Ignore signatures and footers.\n\n"
    "Email from: {{ $json.from }}\n"
    "Subject: {{ $json.subject }}\n"
    "Body:\n{{ $json.body }}"
)

TICKET_JSON_EXAMPLE = json.dumps(
    {
        "title": "Dark Mode testen",
        "description": "Bitte Dark Mode bis Ende August testen.",
        "category": "User Story",
        "priority": "MidPriority",
        "dueDate": "2026-08-31",
        "subtasks": ["Kontrast pruefen", "Mobile Ansicht testen"],
        "creatorName": "Max Mustermann",
    },
    ensure_ascii=False,
    indent=2,
)

# Expressions for condensed Set / Gmail nodes
BUILD_TITLE = (
    "={{ String($json.output?.title || $json.title || "
    "$('Prepare email context').item.json.subject || 'Stakeholder request').trim() }}"
)
BUILD_DESCRIPTION = (
    "={{ String($json.output?.description || $json.description || "
    "$('Prepare email context').item.json.body || '').trim() }}"
)
BUILD_CATEGORY = (
    "={{ ['User Story','Technical Task'].includes($json.output?.category) "
    "? $json.output.category : 'User Story' }}"
)
BUILD_PRIORITY = (
    "={{ ['HighPriority','MidPriority','LowPriority'].includes($json.output?.priority) "
    "? $json.output.priority : 'MidPriority' }}"
)
BUILD_DUEDATE = (
    "={{ String($json.output?.dueDate || '').trim() "
    ".replace(/^(undefined|null|n\\/a|na)$/i, '') }}"
)
BUILD_CREATOR_NAME = (
    "={{ (() => { const ai = String($json.output?.creatorName || '').trim(); "
    "const fallback = String($('Prepare email context').item.json.creatorName || '').trim(); "
    "const name = ai || fallback; "
    "return (!name || name.includes('@') || /^(stakeholder|unknown|guest)$/i.test(name)) "
    "? '' : name; })() }}"
)
BUILD_SUBTASKS = (
    "={{ (() => { const raw = $json.output?.subtasks; "
    "if (!Array.isArray(raw)) return []; "
    "const seen = new Set(); const out = []; "
    "for (const entry of raw) { "
    "let value = typeof entry === 'string' ? entry : (entry?.value || ''); "
    "value = String(value).replace(/\\s+/g, ' ').trim(); "
    "if (value.length < 3) continue; "
    "const key = value.toLowerCase(); if (seen.has(key)) continue; "
    "seen.add(key); out.push({ value, checked: false }); } "
    "return out; })() }}"
)

EVAL_OK = (
    "={{ Number($json.statusCode) === 201 || "
    "(Number($json.statusCode) === 200 && "
    "($json.body?.duplicate === true || Boolean($json.body?.id))) }}"
)

FEEDBACK_SUBJECT = (
    "={{ $json.outcome === 'success' "
    "? ('Bestaetigung: Ticket in Triage angelegt - ' + ($json.title || 'Anfrage')) "
    ": ($json.outcome === 'cap' "
    "? 'Hinweis: Tageslimit fuer automatische Ticket-Erstellung erreicht' "
    ": 'Hinweis: E-Mail erhalten - manuelle Rueckmeldung folgt') }}"
)
FEEDBACK_MESSAGE = (
    "={{ 'Hallo ' + ($json.creatorName || 'Stakeholder') + ',\\n\\n' + ("
    "$json.outcome === 'success' "
    "? ('vielen Dank fuer Ihre Nachricht. Ihr Ticket wurde erfolgreich im Join Task Board "
    "(Spalte Triage) angelegt.\\n\\nBetreff: ' + ($json.title || 'Anfrage') + '\\n\\n') "
    ": ($json.outcome === 'cap' "
    "? 'wir haben Ihre E-Mail erhalten. Das Tageslimit fuer die automatische Ticket-Erstellung "
    "(max. 10) ist heute bereits erreicht.\\nIhr Anliegen wird vom Team manuell geprueft "
    "und ins Task Board uebertragen.\\n\\n' "
    ": 'wir haben Ihre E-Mail erhalten. Bei der automatischen Verarbeitung ist ein Fehler "
    "aufgetreten.\\nDas Team kuemmert sich zeitnah manuell um Ihr Anliegen.\\n\\n')"
    ") + 'Viele Gruesse\\nJoin Team' }}"
)

GMAIL_MODIFY_URL = (
    "=https://gmail.googleapis.com/gmail/v1/users/me/messages/"
    "{{ $json.gmailId }}/modify"
)
GMAIL_MODIFY_BODY = (
    "={{ JSON.stringify({ "
    "addLabelIds: [$json.targetLabelId], "
    "removeLabelIds: ['INBOX', 'UNREAD'] "
    "}) }}"
)


def if_string_not_empty(left, condition_id):
    return {
        "conditions": {
            "options": {
                "caseSensitive": True,
                "leftValue": "",
                "typeValidation": "strict",
                "version": 2,
            },
            "conditions": [
                {
                    "id": condition_id,
                    "leftValue": left,
                    "rightValue": "",
                    "operator": {"type": "string", "operation": "notEmpty"},
                }
            ],
            "combinator": "and",
        },
        "options": {},
    }


def if_bool(left, operation, condition_id):
    return {
        "conditions": {
            "options": {
                "caseSensitive": True,
                "leftValue": "",
                "typeValidation": "strict",
                "version": 2,
            },
            "conditions": [
                {
                    "id": condition_id,
                    "leftValue": left,
                    "rightValue": True,
                    "operator": {"type": "boolean", "operation": operation},
                }
            ],
            "combinator": "and",
        },
        "options": {},
    }


IF_WITHIN_CAP = if_bool("={{ $json.skipTaskCreation }}", "false", "within-cap")
IF_TASK_OK = if_bool("={{ $json.ok }}", "true", "ok-check")
IF_CACHE_HIT = if_bool("={{ $json.cacheHit }}", "true", "cache-hit")
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
                "id": "has-gmail-id",
                "leftValue": "={{ $json.gmailId }}",
                "rightValue": "",
                "operator": {"type": "string", "operation": "notEmpty"},
            },
            {
                "id": "has-target-label",
                "leftValue": "={{ $json.targetLabelId }}",
                "rightValue": "",
                "operator": {"type": "string", "operation": "notEmpty"},
            },
        ],
        "combinator": "and",
    },
    "options": {},
}
IF_CREATOR_EMAIL = if_string_not_empty("={{ $json.creatorEmail }}", "creator-email-present")


def set_assignments(pairs):
    return {
        "assignments": {
            "assignments": [
                {
                    "id": f"a-{i}",
                    "name": name,
                    "value": value,
                    "type": typ,
                }
                for i, (name, value, typ) in enumerate(pairs)
            ]
        },
        "options": {},
    }


workflow = {
    "name": "Join-email-to-task-proposal",
    "nodes": [
        # --- Task moved branch ---
        {
            "parameters": {
                "httpMethod": "POST",
                "path": "join-task-moved",
                "options": {},
            },
            "id": "e2fb1760-ba66-4fcb-8710-e1d6d866879a",
            "name": "Webhook task moved",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 2,
            "position": [0, 780],
            "webhookId": "1b7b72a6-4cdc-43ca-8f0b-7725c34835e0",
            "notes": "Receives task column-change events from Firebase.",
        },
        {
            "parameters": set_assignments(
                [
                    (
                        "title",
                        "={{ String($json.body?.title || $json.title || 'Ticket').trim() }}",
                        "string",
                    ),
                    (
                        "creatorName",
                        "={{ String($json.body?.creatorName || $json.creatorName || '').trim() }}",
                        "string",
                    ),
                    (
                        "creatorEmail",
                        "={{ String($json.body?.creatorEmail || $json.creatorEmail || '').trim() }}",
                        "string",
                    ),
                    (
                        "previousColumnLabel",
                        "={{ String($json.body?.previousColumnLabel || $json.body?.previousColumn || $json.previousColumnLabel || $json.previousColumn || 'Unbekannt').trim() }}",
                        "string",
                    ),
                    (
                        "newColumnLabel",
                        "={{ String($json.body?.newColumnLabel || $json.body?.newColumn || $json.newColumnLabel || $json.newColumn || 'Unbekannt').trim() }}",
                        "string",
                    ),
                    (
                        "movedAtIso",
                        "={{ (() => { const raw = Number($json.body?.movedAt || $json.movedAt || 0); return Number.isFinite(raw) && raw > 0 ? new Date(raw).toISOString() : ''; })() }}",
                        "string",
                    ),
                ]
            ),
            "id": "n-task-moved-set",
            "name": "Set task moved fields",
            "type": "n8n-nodes-base.set",
            "typeVersion": 3.4,
            "position": [240, 780],
        },
        {
            "parameters": IF_CREATOR_EMAIL,
            "id": "778a64ff-aa44-45b6-acb8-1fc5049be299",
            "name": "IF creator email available",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2.2,
            "position": [480, 780],
        },
        {
            "parameters": {
                "sendTo": "={{ $json.creatorEmail }}",
                "subject": "={{ 'Update zu Ihrem Ticket: ' + ($json.title || 'Ticket') }}",
                "emailType": "text",
                "message": (
                    "={{ 'Hallo ' + ($json.creatorName || 'Stakeholder') + ',\\n\\n'"
                    " + 'Ihr Ticket wurde im Join Task Board in eine neue Spalte verschoben.\\n\\n'"
                    " + 'Ticket: ' + ($json.title || 'Ticket') + '\\n'"
                    " + 'Von: ' + ($json.previousColumnLabel || 'Unbekannt') + '\\n'"
                    " + 'Nach: ' + ($json.newColumnLabel || 'Unbekannt')"
                    " + ($json.movedAtIso ? ('\\nZeitpunkt: ' + $json.movedAtIso) : '')"
                    " + '\\n\\nViele Gruesse\\nJoin Team' }}"
                ),
                "options": {"appendAttribution": False},
            },
            "id": "fe8b8ecf-9ac9-4833-85aa-21cd8dce2ef2",
            "name": "Send task moved response",
            "type": "n8n-nodes-base.gmail",
            "typeVersion": GMAIL_NODE_VERSION,
            "position": [720, 764],
            "credentials": GMAIL_CRED,
            "continueOnFail": True,
        },
        # --- Email intake ---
        {
            "parameters": {
                "postProcessAction": "read",
                "options": {"customEmailConfig": '["UNSEEN"]', "forceReconnect": 15},
            },
            "id": "n-imap-trigger",
            "name": "Email Trigger (IMAP)",
            "type": "n8n-nodes-base.emailReadImap",
            "typeVersion": 2,
            "position": [0, 240],
            "credentials": IMAP_CRED,
            "notes": "Realtime IMAP. No schedule polling.",
        },
        {
            "parameters": {},
            "id": "n-manual",
            "name": "When clicking 'Execute workflow'",
            "type": "n8n-nodes-base.manualTrigger",
            "typeVersion": 1,
            "position": [0, 440],
        },
        {
            "parameters": set_assignments(
                [
                    ("from", "Max Mustermann <test@example.com>", "string"),
                    ("subject", "Test Dark Mode", "string"),
                    (
                        "body",
                        "Bitte Dark Mode bis Ende August testen.\n\nSubtasks:\n"
                        "- Kontrast prüfen\n- Mobile Ansicht testen\n\n"
                        "Mit freundlichen Grüßen\nMax Mustermann",
                        "string",
                    ),
                    ("messageId", "<manual-test-001@join-collector.local>", "string"),
                    ("emailSource", "manual", "string"),
                    ("gmailId", "", "string"),
                ]
            ),
            "id": "n-sample",
            "name": "Sample stakeholder email",
            "type": "n8n-nodes-base.set",
            "typeVersion": 3.4,
            "position": [240, 440],
        },
        {
            "parameters": {"jsCode": PREPARE_EMAIL_JS},
            "id": "n-prepare-email",
            "name": "Prepare email context",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [480, 320],
            "notes": "Maps IMAP/sample fields and repairs UTF-8 mojibake (Ã¼→ü) for German umlauts.",
        },
        {
            "parameters": {"mode": "runOnceForAllItems", "jsCode": AUTO_CAP_JS},
            "id": "n-cap-limit",
            "name": "Apply auto email cap (max 10)",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [720, 320],
            "notes": "Daily cap max 10 BEFORE AI call.",
        },
        {
            "parameters": IF_WITHIN_CAP,
            "id": "n-if-cap",
            "name": "IF within auto cap",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2.2,
            "position": [960, 320],
        },
        # --- AI path ---
        {
            "parameters": {
                "promptType": "define",
                "text": AI_PROMPT,
                "hasOutputParser": True,
            },
            "id": "n-ai-parse",
            "name": "Parse ticket with AI",
            "type": "@n8n/n8n-nodes-langchain.chainLlm",
            "typeVersion": 1.5,
            "position": [1200, 200],
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
            "position": [1200, 420],
            "credentials": OPENAI_CRED,
        },
        {
            "parameters": {
                "schemaType": "fromJson",
                "jsonSchemaExample": TICKET_JSON_EXAMPLE,
            },
            "id": "n-output-parser",
            "name": "Structured Output Parser",
            "type": "@n8n/n8n-nodes-langchain.outputParserStructured",
            "typeVersion": 1.2,
            "position": [1440, 420],
        },
        {
            "parameters": set_assignments(
                [
                    ("title", BUILD_TITLE, "string"),
                    ("description", BUILD_DESCRIPTION, "string"),
                    ("category", BUILD_CATEGORY, "string"),
                    ("priority", BUILD_PRIORITY, "string"),
                    ("dueDate", BUILD_DUEDATE, "string"),
                    ("column", "triageColumn", "string"),
                    ("creatorName", BUILD_CREATOR_NAME, "string"),
                    (
                        "creatorEmail",
                        "={{ $('Prepare email context').item.json.creatorEmail }}",
                        "string",
                    ),
                    ("creatorType", "external", "string"),
                    ("aiGenerated", True, "boolean"),
                    (
                        "sourceMessageId",
                        "={{ $('Prepare email context').item.json.sourceMessageId }}",
                        "string",
                    ),
                    (
                        "emailSource",
                        "={{ $('Prepare email context').item.json.emailSource }}",
                        "string",
                    ),
                    (
                        "gmailId",
                        "={{ $('Prepare email context').item.json.gmailId }}",
                        "string",
                    ),
                    ("subtasks", BUILD_SUBTASKS, "array"),
                ]
            ),
            "id": "n-build",
            "name": "Build Join payload",
            "type": "n8n-nodes-base.set",
            "typeVersion": 3.4,
            "position": [1440, 200],
            "notes": "Set/expressions merge structured AI output with email metadata.",
        },
        {
            "parameters": {
                "method": "POST",
                "url": "https://join-issue-collector-70cb7.web.app/internal/n8n/tasks",
                "authentication": "genericCredentialType",
                "genericAuthType": "httpHeaderAuth",
                "sendHeaders": True,
                "headerParameters": {
                    "parameters": [{"name": "Content-Type", "value": "application/json"}]
                },
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": "={{ $json }}",
                "options": {
                    "response": {"response": {"fullResponse": True, "neverError": True}}
                },
            },
            "id": "n-create",
            "name": "Create task in Triage",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [1680, 200],
            "credentials": HTTP_CRED,
        },
        {
            "parameters": set_assignments(
                [
                    ("ok", EVAL_OK, "boolean"),
                    ("statusCode", "={{ Number($json.statusCode || 0) }}", "number"),
                    (
                        "title",
                        "={{ $('Build Join payload').item.json.title }}",
                        "string",
                    ),
                    (
                        "creatorName",
                        "={{ $('Build Join payload').item.json.creatorName }}",
                        "string",
                    ),
                    (
                        "creatorEmail",
                        "={{ $('Build Join payload').item.json.creatorEmail }}",
                        "string",
                    ),
                    (
                        "gmailId",
                        "={{ $('Build Join payload').item.json.gmailId }}",
                        "string",
                    ),
                    (
                        "emailSource",
                        "={{ $('Build Join payload').item.json.emailSource }}",
                        "string",
                    ),
                    (
                        "sourceMessageId",
                        "={{ $('Build Join payload').item.json.sourceMessageId }}",
                        "string",
                    ),
                ]
            ),
            "id": "n-eval",
            "name": "Evaluate create result",
            "type": "n8n-nodes-base.set",
            "typeVersion": 3.4,
            "position": [1920, 200],
        },
        {
            "parameters": IF_TASK_OK,
            "id": "n-if-ok",
            "name": "IF task created",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2.2,
            "position": [2160, 200],
        },
        {
            "parameters": set_assignments(
                [
                    ("outcome", "success", "string"),
                    ("archiveLabelName", "email done", "string"),
                    ("title", "={{ $json.title }}", "string"),
                    ("creatorName", "={{ $json.creatorName }}", "string"),
                    ("creatorEmail", "={{ $json.creatorEmail }}", "string"),
                    ("gmailId", "={{ $json.gmailId }}", "string"),
                    ("emailSource", "={{ $json.emailSource }}", "string"),
                    ("sourceMessageId", "={{ $json.sourceMessageId }}", "string"),
                ]
            ),
            "id": "n-outcome-success",
            "name": "Set outcome success",
            "type": "n8n-nodes-base.set",
            "typeVersion": 3.4,
            "position": [2400, 120],
        },
        {
            "parameters": set_assignments(
                [
                    ("outcome", "error", "string"),
                    ("archiveLabelName", "needs review", "string"),
                    ("title", "={{ $json.title }}", "string"),
                    ("creatorName", "={{ $json.creatorName }}", "string"),
                    ("creatorEmail", "={{ $json.creatorEmail }}", "string"),
                    ("gmailId", "={{ $json.gmailId }}", "string"),
                    ("emailSource", "={{ $json.emailSource }}", "string"),
                    ("sourceMessageId", "={{ $json.sourceMessageId }}", "string"),
                ]
            ),
            "id": "n-outcome-error",
            "name": "Set outcome error",
            "type": "n8n-nodes-base.set",
            "typeVersion": 3.4,
            "position": [2400, 280],
        },
        {
            "parameters": set_assignments(
                [
                    ("outcome", "cap", "string"),
                    ("archiveLabelName", "needs review", "string"),
                    ("skipReason", "={{ $json.skipReason }}", "string"),
                    ("title", "={{ $json.title }}", "string"),
                    ("creatorName", "={{ $json.creatorName }}", "string"),
                    ("creatorEmail", "={{ $json.creatorEmail }}", "string"),
                    ("gmailId", "={{ $json.gmailId }}", "string"),
                    ("emailSource", "={{ $json.emailSource }}", "string"),
                    ("sourceMessageId", "={{ $json.sourceMessageId }}", "string"),
                ]
            ),
            "id": "n-outcome-cap",
            "name": "Set outcome cap",
            "type": "n8n-nodes-base.set",
            "typeVersion": 3.4,
            "position": [1200, 480],
        },
        # --- Shared feedback + archive (suggestions 1,3,5,6,7) ---
        {
            "parameters": IF_NOT_MANUAL,
            "id": "n-if-not-manual",
            "name": "IF not manual test",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2.2,
            "position": [2640, 240],
            "notes": "Single manual filter before feedback/archive.",
        },
        {
            "parameters": {
                "resource": "message",
                "operation": "send",
                "sendTo": "={{ $json.creatorEmail }}",
                "subject": FEEDBACK_SUBJECT,
                "emailType": "text",
                "message": FEEDBACK_MESSAGE,
                "options": {"appendAttribution": False},
            },
            "id": "n-mail-feedback",
            "name": "Send stakeholder feedback",
            "type": "n8n-nodes-base.gmail",
            "typeVersion": GMAIL_NODE_VERSION,
            "position": [2880, 220],
            "credentials": GMAIL_CRED,
            "continueOnFail": True,
            "notes": "One send node; subject/body depend on outcome success|cap|error.",
        },
        {
            "parameters": {"jsCode": CHECK_LABEL_CACHE_JS},
            "id": "n-check-cache",
            "name": "Check label cache",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [3120, 220],
            "notes": "Uses workflow static data for email done / needs review IDs.",
        },
        {
            "parameters": IF_CACHE_HIT,
            "id": "n-if-cache",
            "name": "IF label cache hit",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2.2,
            "position": [3360, 220],
        },
        {
            "parameters": {"resource": "label", "operation": "getAll", "returnAll": True},
            "id": "n-get-labels",
            "name": "Get Gmail labels",
            "type": "n8n-nodes-base.gmail",
            "typeVersion": GMAIL_NODE_VERSION,
            "position": [3600, 320],
            "credentials": GMAIL_CRED,
        },
        {
            "parameters": {"jsCode": STORE_LABEL_CACHE_JS},
            "id": "n-store-cache",
            "name": "Store label cache",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [3840, 320],
        },
        {
            "parameters": IF_CAN_ARCHIVE,
            "id": "n-if-can-archive",
            "name": "IF can archive in Gmail",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2.2,
            "position": [4080, 220],
            "notes": "Archives only when gmailId + target label ID exist (no RFC fallback).",
        },
        {
            "parameters": {
                "method": "POST",
                "url": GMAIL_MODIFY_URL,
                "authentication": "predefinedCredentialType",
                "nodeCredentialType": "gmailOAuth2",
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": GMAIL_MODIFY_BODY,
                "options": {},
            },
            "id": "n-archive-modify",
            "name": "Archive Gmail message",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [4320, 200],
            "credentials": GMAIL_CRED,
            "continueOnFail": True,
            "notes": "Single Gmail modify: add target label + remove INBOX/UNREAD.",
        },
    ],
    "pinData": {},
    "connections": {
        "Webhook task moved": {
            "main": [[{"node": "Set task moved fields", "type": "main", "index": 0}]]
        },
        "Set task moved fields": {
            "main": [[{"node": "IF creator email available", "type": "main", "index": 0}]]
        },
        "IF creator email available": {
            "main": [[{"node": "Send task moved response", "type": "main", "index": 0}], []]
        },
        "Email Trigger (IMAP)": {
            "main": [[{"node": "Prepare email context", "type": "main", "index": 0}]]
        },
        "When clicking 'Execute workflow'": {
            "main": [[{"node": "Sample stakeholder email", "type": "main", "index": 0}]]
        },
        "Sample stakeholder email": {
            "main": [[{"node": "Prepare email context", "type": "main", "index": 0}]]
        },
        "Prepare email context": {
            "main": [[{"node": "Apply auto email cap (max 10)", "type": "main", "index": 0}]]
        },
        "Apply auto email cap (max 10)": {
            "main": [[{"node": "IF within auto cap", "type": "main", "index": 0}]]
        },
        "IF within auto cap": {
            "main": [
                [{"node": "Parse ticket with AI", "type": "main", "index": 0}],
                [{"node": "Set outcome cap", "type": "main", "index": 0}],
            ]
        },
        "OpenAI Chat Model": {
            "ai_languageModel": [
                [{"node": "Parse ticket with AI", "type": "ai_languageModel", "index": 0}]
            ]
        },
        "Structured Output Parser": {
            "ai_outputParser": [
                [{"node": "Parse ticket with AI", "type": "ai_outputParser", "index": 0}]
            ]
        },
        "Parse ticket with AI": {
            "main": [[{"node": "Build Join payload", "type": "main", "index": 0}]]
        },
        "Build Join payload": {
            "main": [[{"node": "Create task in Triage", "type": "main", "index": 0}]]
        },
        "Create task in Triage": {
            "main": [[{"node": "Evaluate create result", "type": "main", "index": 0}]]
        },
        "Evaluate create result": {
            "main": [[{"node": "IF task created", "type": "main", "index": 0}]]
        },
        "IF task created": {
            "main": [
                [{"node": "Set outcome success", "type": "main", "index": 0}],
                [{"node": "Set outcome error", "type": "main", "index": 0}],
            ]
        },
        "Set outcome success": {
            "main": [[{"node": "IF not manual test", "type": "main", "index": 0}]]
        },
        "Set outcome error": {
            "main": [[{"node": "IF not manual test", "type": "main", "index": 0}]]
        },
        "Set outcome cap": {
            "main": [[{"node": "IF not manual test", "type": "main", "index": 0}]]
        },
        "IF not manual test": {
            "main": [
                [
                    {"node": "Send stakeholder feedback", "type": "main", "index": 0},
                    {"node": "Check label cache", "type": "main", "index": 0},
                ],
                [],
            ]
        },
        "Check label cache": {
            "main": [[{"node": "IF label cache hit", "type": "main", "index": 0}]]
        },
        "IF label cache hit": {
            "main": [
                [{"node": "IF can archive in Gmail", "type": "main", "index": 0}],
                [{"node": "Get Gmail labels", "type": "main", "index": 0}],
            ]
        },
        "Get Gmail labels": {
            "main": [[{"node": "Store label cache", "type": "main", "index": 0}]]
        },
        "Store label cache": {
            "main": [[{"node": "IF can archive in Gmail", "type": "main", "index": 0}]]
        },
        "IF can archive in Gmail": {
            "main": [[{"node": "Archive Gmail message", "type": "main", "index": 0}], []]
        },
    },
    "active": False,
    "settings": {
        "executionOrder": "v1",
        "binaryMode": "separate",
        "availableInMCP": False,
    },
    "meta": {"templateCredsSetupCompleted": True},
    "tags": [],
}


def preserve_live_ids(canonical: dict) -> dict:
    if not OUT.exists():
        return canonical
    live = json.loads(OUT.read_text(encoding="utf-8"))
    by_base = {}
    for node in live.get("nodes", []):
        name = str(node.get("name") or "")
        base = name.rstrip("0123456789 ").strip()
        by_base[base] = node
        by_base[name] = node
    for node in canonical["nodes"]:
        live_node = by_base.get(node["name"])
        if not live_node:
            continue
        if live_node.get("id"):
            node["id"] = live_node["id"]
        if live_node.get("webhookId"):
            node["webhookId"] = live_node["webhookId"]
    return canonical


workflow = preserve_live_ids(workflow)
OUT.write_text(json.dumps(workflow, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"Wrote {OUT} ({len(workflow['nodes'])} nodes)")
