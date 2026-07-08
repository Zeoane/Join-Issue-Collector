/**
 * Normalizes an email Message-ID for use as a Firebase RTDB key.
 * @param {string} messageId
 * @returns {string}
 */
export function sanitizeMessageId(messageId) {
  const normalized = String(messageId || "")
    .trim()
    .replace(/^<|>$/g, "");
  if (!normalized) return "";
  // Firebase RTDB keys disallow . # $ [ ] / and backslash.
  // URI encoding plus explicit dot encoding prevents collisions such as "a.b" vs "a_b".
  return encodeURIComponent(normalized).replace(/\./g, "%2E");
}

/**
 * Legacy sanitizer kept for backwards-compatible duplicate lookup.
 * @param {string} messageId
 * @returns {string}
 */
export function sanitizeMessageIdLegacy(messageId) {
  return String(messageId || "")
    .trim()
    .replace(/^<|>$/g, "")
    .replace(/[.#$[\]/\\]/g, "_");
}

/**
 * Returns all key variants that might have been used historically.
 * @param {string} messageId
 * @returns {string[]}
 */
export function getMessageIdLookupKeys(messageId) {
  const current = sanitizeMessageId(messageId);
  const legacy = sanitizeMessageIdLegacy(messageId);
  return [...new Set([current, legacy].filter(Boolean))];
}
