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
  const url = BASE_URL + path + ".json";
  const token = await getAuthToken();
  const authUrl = token ? `${url}?auth=${encodeURIComponent(token)}` : url;
  return fetch(authUrl, options);
}

/**
 * @template T
 * @param {string} [path=""]
 * @returns {Promise<T>}
 */
async function loadData(path = "") {
  const response = await authFetch(path);
  return response.json();
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
  return response.json();
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
  return response.json();
}

/**
 * @template T
 * @param {string} [path=""]
 * @returns {Promise<T>}
 */
async function deleteData(path = "") {
  const response = await authFetch(path, { method: "DELETE" });
  return response.json();
}

window.authFetch = authFetch;
window.authFetchUrl = authFetch;
window.loadData = loadData;
window.postData = postData;
window.putData = putData;
window.deleteData = deleteData;
