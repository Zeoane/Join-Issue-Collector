const SECTION_MARKERS =
  '(?:subtasks?|sub-tasks?|unteraufgaben?|teilaufgaben?|to-?dos?|schritte|n(?:ä|ae)chste\\s+schritte|folgende\\s+aufgaben(?:\\s+beachten)?)';

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
  return text.length >= 3 ? text : '';
}

function matchSectionHeader(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed) return null;
  if (new RegExp(`^${SECTION_MARKERS}\\s*:?\\s*$`, 'i').test(trimmed)) {
    return { inline: '' };
  }
  const match = trimmed.match(new RegExp(`^${SECTION_MARKERS}\\s*:\\s*(.*)$`, 'i'));
  if (match) return { inline: String(match[1] || '').trim() };
  return null;
}

function findInlineSectionContent(line) {
  const match = String(line || '')
    .trim()
    .match(new RegExp(`(?:^|\\s)${SECTION_MARKERS}\\s*:\\s*(.+)$`, 'i'));
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
    .filter((part) => part.length >= 3);
}

function extractExplicitSubtasks(bodyText) {
  const lines = String(bodyText || '').split('\n');
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
    if (!subtasks.length) return false;
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

    const inlineSection = findInlineSectionContent(line);
    if (inlineSection) {
      inMarkedSection = true;
      for (const task of splitInlineTasks(inlineSection)) addSubtask(task);
      continue;
    }

    const header = matchSectionHeader(line);
    if (header) {
      inMarkedSection = true;
      if (header.inline) {
        for (const task of splitInlineTasks(header.inline)) addSubtask(task);
      }
      continue;
    }

    const listItem = parseListItem(line);
    if (inMarkedSection) {
      if (listItem) {
        addSubtask(listItem);
        continue;
      }
      if (appendToLastSubtask(line)) continue;
      inMarkedSection = false;
    }

    if (listItem) addSubtask(listItem);
  }

  return subtasks;
}
