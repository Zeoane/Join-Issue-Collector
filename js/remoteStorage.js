/**
 * Firebase Realtime Database – zentraler CRUD-Layer mit Auth-Token.
 */

/**
 * @returns {Promise<string|null>}
 */
async function getAuthToken() {
  const user = window.firebaseAuth?.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

/**
 * @param {string} path
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */
async function authFetch(path, options = {}) {
  const url = path.startsWith("http")
    ? path
    : BASE_URL + path + ".json";
  const token = await getAuthToken();
  if (!token) {
    return new Response(null, { status: 401, statusText: "Unauthorized" });
  }
  const authUrl = `${url}?auth=${encodeURIComponent(token)}`;
  return fetch(authUrl, options);
}

/**
 * @param {Response} response
 * @returns {Promise<any>}
 */
async function parseJsonResponse(response) {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Firebase request failed (${response.status}): ${errorText || response.statusText}`
    );
  }
  const text = await response.text();
  if (!text) return null;
  return JSON.parse(text);
}

/**
 * @template T
 * @param {string} [path=""]
 * @returns {Promise<T>}
 */
async function loadData(path = "") {
  const response = await authFetch(path);
  return parseJsonResponse(response);
}

/**
 * @template T
 * @param {string} [path=""]
 * @param {any} [data={}]
 * @returns {Promise<T>}
 */
async function postData(path = "", data = {}) {
  const response = await authFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return parseJsonResponse(response);
}

/**
 * @template T
 * @param {string} [path=""]
 * @param {any} [data={}]
 * @returns {Promise<T>}
 */
async function putData(path = "", data = {}) {
  const response = await authFetch(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return parseJsonResponse(response);
}

/**
 * @template T
 * @param {string} [path=""]
 * @returns {Promise<T>}
 */
async function deleteData(path = "") {
  const response = await authFetch(path, { method: "DELETE" });
  return parseJsonResponse(response);
}

window.parseJsonResponse = parseJsonResponse;

window.authFetch = authFetch;
window.authFetchUrl = authFetch;
window.loadData = loadData;
window.postData = postData;
window.putData = putData;
window.deleteData = deleteData;
