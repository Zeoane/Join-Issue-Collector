/**
 * Normalizes an email Message-ID for use as a Firebase RTDB key.
 * @param {string} messageId
 * @returns {string}
 */
export function sanitizeMessageId(messageId) {
  return String(messageId || "")
    .trim()
    .replace(/^<|>$/g, "")
    .replace(/[.#$[\]/\\]/g, "_");
}
