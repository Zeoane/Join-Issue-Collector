const SECTION_MARKERS =
  '(?:subtasks?|sub-tasks?|unteraufgaben?|teilaufgaben?|to-?dos?|schritte|n(?:ä|ae)chste\\s+schritte|folgende\\s+aufgaben(?:\\s+beachten)?)';

const NON_SUBTASK_SECTION_MARKERS =
  '(?:description|beschreibung|enddate|end\\s*date|f(?:ä|ae)llig(?:keitsdatum)?|deadline|due\\s*date)';

const SIGNATURE_START_MARKERS = [
  /^--\s*$/,
  /^_{3,}$/,
  /^mit\s+freundlichen\s+gr(?:ü|u)(?:ß|ss)en/i,
  /^freundliche\s+gr(?:ü|u)(?:ß|ss)e/i,
  /^viele\s+gr(?:ü|u)(?:ß|ss)e/i,
  /^best\s+regards/i,
  /^kind\s+regards/i,
  /^regards/i,
  /^sent\s+from\s+my/i,
];

const SIGNATURE_LINE_PATTERN =
  /^(?:e-?mail|mail|tel(?:efon)?|phone|fax|mobil(?:e)?|webseite|website|homepage|adresse|address|anschrift|linkedin|xing|instagram|facebook|twitter|amtsgericht|hrb|ust-?id|gesch(?:ä|ae)ftsf(?:ü|u)hrer|ceo|cto|firma|company)\s*:/i;

function parseListItem(line) {
  const match = String(line || '')
    .trim()
    .match(/^(?:[-*•‣▪–—]\s+|\d{1,2}[.)]\s+(?!\d)|\[\s?[xX]?\s?\]\s+)(.+)$/);
  if (!match) return '';
  return String(match[1] || '').trim();
}

function normalizeSubtaskValue(value) {
  let text = String(value || '').replace(/\s+/g, ' ').trim();
  text = text
    .replace(/^[-*•‣▪–—]\s+/, '')
    .replace(/^\d{1,2}[.)]\s+/, '')
    .replace(/^\[\s?[xX]?\s?\]\s+/, '')
    .replace(/[;,\.\s?]+$/g, '')
    .trim();
  if (!text || SIGNATURE_LINE_PATTERN.test(text)) return '';
  return text.length >= 3 ? text : '';
}

function isSignatureLikeLine(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed) return false;
  if (SIGNATURE_LINE_PATTERN.test(trimmed)) return true;
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/^www\./i.test(trimmed)) return true;
  if (/@[\w.-]+\.[a-z]{2,}$/i.test(trimmed) && !trimmed.includes(' ')) return true;
  return false;
}

function stripEmailSignature(bodyText) {
  const lines = String(bodyText || '').split('\n');
  const kept = [];

  for (const rawLine of lines) {
    const line = String(rawLine || '').trim();
    if (line && SIGNATURE_START_MARKERS.some((pattern) => pattern.test(line))) {
      break;
    }
    kept.push(rawLine);
  }

  return kept.join('\n');
}

function matchSectionHeader(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed) return null;
  if (new RegExp(`^${NON_SUBTASK_SECTION_MARKERS}\\s*:?\\s*(.*)$`, 'i').test(trimmed)) {
    return { endSection: true };
  }
  if (new RegExp(`^${SECTION_MARKERS}\\s*:?\\s*$`, 'i').test(trimmed)) {
    return { inline: '' };
  }
  const match = trimmed.match(new RegExp(`^${SECTION_MARKERS}\\s*:\\s*(.*)$`, 'i'));
  if (match) return { inline: String(match[1] || '').trim() };
  return null;
}

function findInlineSectionContent(line) {
  const trimmed = String(line || '').trim();
  if (new RegExp(`(?:^|\\s)${NON_SUBTASK_SECTION_MARKERS}\\s*:`, 'i').test(trimmed)) {
    return null;
  }
  const match = trimmed.match(new RegExp(`(?:^|\\s)${SECTION_MARKERS}\\s*:\\s*(.+)$`, 'i'));
  return match ? String(match[1] || '').trim() : '';
}

function splitInlineTasks(text) {
  const raw = String(text || '').trim();
  if (!raw) return [];
  const listItem = parseListItem(raw);
  if (listItem) return [listItem];
  return raw
    .split(/\?(?:\s+(?:Und|und)\s*:\s*|\s*$)|(?:^|\s+)(?:Und|und)\s*:\s*/i)
    .map((part) => part.replace(/[;,\.\s?]+$/g, '').trim())
    .filter((part) => part.length >= 3 && !isSignatureLikeLine(part));
}

function extractExplicitSubtasks(bodyText) {
  const lines = stripEmailSignature(bodyText).split('\n');
  const seen = new Set();
  const subtasks = [];
  let inMarkedSection = false;

  function addSubtask(raw) {
    const value = normalizeSubtaskValue(raw);
    if (!value) return;
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    subtasks.push({ value, checked: false });
  }

  function appendToLastSubtask(fragment) {
    if (!subtasks.length || isSignatureLikeLine(fragment)) return false;
    const last = subtasks.pop();
    seen.delete(last.value.toLowerCase());
    addSubtask(`${last.value} ${fragment}`.trim());
    return true;
  }

  for (const rawLine of lines) {
    const line = String(rawLine || '').trim();
    if (!line) {
      inMarkedSection = false;
      continue;
    }

    if (isSignatureLikeLine(line)) {
      inMarkedSection = false;
      continue;
    }

    const inlineSection = findInlineSectionContent(line);
    if (inlineSection) {
      inMarkedSection = true;
      for (const task of splitInlineTasks(inlineSection)) addSubtask(task);
      continue;
    }

    const header = matchSectionHeader(line);
    if (header) {
      if (header.endSection) {
        inMarkedSection = false;
        continue;
      }
      inMarkedSection = true;
      if (header.inline) {
        for (const task of splitInlineTasks(header.inline)) addSubtask(task);
      }
      continue;
    }

    if (!inMarkedSection) continue;

    const listItem = parseListItem(line);
    if (listItem) {
      addSubtask(listItem);
      continue;
    }
    if (appendToLastSubtask(line)) continue;
    inMarkedSection = false;
  }

  return subtasks;
}
