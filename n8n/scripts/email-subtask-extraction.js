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
  /^beste\s+gr(?:ü|u)(?:ß|ss)e/i,
  /^liebe\s+gr(?:ü|u)(?:ß|ss)e/i,
  /^herzliche\s+gr(?:ü|u)(?:ß|ss)e/i,
  /^lg\b/i,
  /^mfg\b/i,
  /^best\s+regards/i,
  /^kind\s+regards/i,
  /^regards/i,
  /^sent\s+from\s+my/i,
];

const SIGNATURE_LINE_PATTERN =
  /^(?:e-?mail|mail|tel(?:efon)?|phone|fax|mobil(?:e)?|webseite|website|homepage|adresse|address|anschrift|linkedin|xing|instagram|facebook|twitter|amtsgericht|hrb|ust-?id|gesch(?:ä|ae)ftsf(?:ü|u)hrer|ceo|cto|firma|company)\s*:/i;

const DEADLINE_LINE_PATTERN =
  /^(?:bis(?:\s+zum)?|until|due(?:\s+by)?|deadline|f(?:ä|ae)llig(?:keit)?|enddate|end\s*date)\b/i;

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
  if (isClosingOrMetaLine(text)) return '';
  return text.length >= 3 ? text : '';
}

function isPersonNameLine(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed || trimmed.length > 40) return false;
  if (/[/:@]/.test(trimmed)) return false;
  if (/\d/.test(trimmed)) return false;
  // One or two capitalized name tokens, optionally with hyphen.
  return /^[A-ZÄÖÜ][a-zäöüß]+(?:[-\s][A-ZÄÖÜ][a-zäöüß]+)?$/.test(trimmed);
}

function isClosingOrMetaLine(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed) return true;
  if (SIGNATURE_START_MARKERS.some((pattern) => pattern.test(trimmed))) return true;
  if (DEADLINE_LINE_PATTERN.test(trimmed)) return true;
  if (/^\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?$/.test(trimmed)) return true;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return true;
  return false;
}

function isSignatureLikeLine(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed) return false;
  if (SIGNATURE_LINE_PATTERN.test(trimmed)) return true;
  if (isClosingOrMetaLine(trimmed)) return true;
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
  if (DEADLINE_LINE_PATTERN.test(trimmed)) {
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

function hasExplicitSubtaskSection(bodyText) {
  const text = String(bodyText || '');
  return new RegExp(`(?:^|\\n)\\s*${SECTION_MARKERS}\\s*:`, 'i').test(text);
}

function extractExplicitSubtasks(bodyText) {
  const lines = stripEmailSignature(bodyText).split('\n');
  const seen = new Set();
  const subtasks = [];
  let inMarkedSection = false;
  let sectionUsedListItems = false;

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
      // Blank line ends a bullet block, but Create-Request plain lines may
      // continue after an empty Subtask: header with no items yet.
      if (sectionUsedListItems) inMarkedSection = false;
      continue;
    }

    if (isSignatureLikeLine(line)) {
      inMarkedSection = false;
      continue;
    }

    const inlineSection = findInlineSectionContent(line);
    if (inlineSection) {
      inMarkedSection = true;
      sectionUsedListItems = Boolean(parseListItem(inlineSection));
      for (const task of splitInlineTasks(inlineSection)) addSubtask(task);
      continue;
    }

    const header = matchSectionHeader(line);
    if (header) {
      if (header.endSection) {
        inMarkedSection = false;
        sectionUsedListItems = false;
        continue;
      }
      inMarkedSection = true;
      sectionUsedListItems = false;
      if (header.inline) {
        sectionUsedListItems = Boolean(parseListItem(header.inline));
        for (const task of splitInlineTasks(header.inline)) addSubtask(task);
      }
      continue;
    }

    if (!inMarkedSection) continue;

    const listItem = parseListItem(line);
    if (listItem) {
      sectionUsedListItems = true;
      addSubtask(listItem);
      continue;
    }

    // Soft-wrapped continuations stay on the previous item.
    if (subtasks.length && looksLikeContinuation(line, subtasks[subtasks.length - 1].value)) {
      appendToLastSubtask(line);
      continue;
    }

    // After a bullet list, plain lines are closings/dates/names — not tasks.
    if (sectionUsedListItems) {
      inMarkedSection = false;
      continue;
    }

    // Create-Request template: plain lines under Subtask: without bullets.
    // Skip greeting/name leftovers that are not real tasks.
    if (isPersonNameLine(line) || isClosingOrMetaLine(line)) {
      inMarkedSection = false;
      continue;
    }

    addSubtask(line);
  }

  return subtasks;
}

function looksLikeContinuation(line, lastValue) {
  const trimmed = String(line || '').trim();
  const last = String(lastValue || '').trim();
  if (!trimmed || !last || isSignatureLikeLine(trimmed)) return false;
  if (parseListItem(trimmed)) return false;

  const prevIncompleteConnector =
    !/[.!?…)]$/.test(last) &&
    /(?:\b(?:als|und|oder|the|a|an|to|for|mit|für|von|zu|auch|diese|dieser|dieses)\s*)$/i.test(
      last
    );
  if (prevIncompleteConnector) return true;

  // Soft-wrap where the next line continues in lowercase.
  if (!/[.!?…)]$/.test(last) && /^[a-zäöü]/.test(trimmed)) return true;

  return false;
}
