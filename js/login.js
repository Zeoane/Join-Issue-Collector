document.addEventListener("DOMContentLoaded", initLogin);

/**
 * @returns {void}
 */
function initLogin() {
  const elements = getLoginElements();
  setupLiveFeedback(elements);
  applyStarMaskToPassword(elements.passwordInput, elements.msgBox);
  bindLoginHandler(elements);
}

/**
 * @returns {{form:HTMLFormElement,emailInput:HTMLInputElement,passwordInput:HTMLInputElement,loginButton:HTMLButtonElement,msgBox:HTMLElement}}
 */
function getLoginElements() {
  return {
    form: document.getElementById("loginForm"),
    emailInput: document.getElementById("email"),
    passwordInput: document.getElementById("password"),
    loginButton: document.querySelector(".login-btn"),
    msgBox: document.getElementById("msgBox"),
  };
}

/**
 * @param {{emailInput:HTMLInputElement,passwordInput:HTMLInputElement,msgBox:HTMLElement}} param0
 */
function setupLiveFeedback({ emailInput, passwordInput, msgBox }) {
  emailInput.addEventListener("input", () => {
    emailInput.classList.remove("input-error");
    clearMessage(msgBox);
  });
  passwordInput.addEventListener("input", () => {
    passwordInput.classList.remove("input-error");
    clearMessage(msgBox);
  });
}

/**
 * @param {{form:HTMLFormElement,emailInput:HTMLInputElement,passwordInput:HTMLInputElement,loginButton:HTMLButtonElement,msgBox:HTMLElement}} param0
 */
function bindLoginHandler({ form, emailInput, passwordInput, loginButton, msgBox }) {
  form.addEventListener("submit", (e) =>
    onSubmitLogin(e, { emailInput, passwordInput, loginButton, msgBox })
  );
}

/**
 * @param {SubmitEvent} e
 * @param {{emailInput:HTMLInputElement,passwordInput:HTMLInputElement,loginButton:HTMLButtonElement,msgBox:HTMLElement}} ctx
 */
async function onSubmitLogin(e, { emailInput, passwordInput, loginButton, msgBox }) {
  e.preventDefault();
  clearMessage(msgBox);
  const email = emailInput.value.trim();
  const password = passwordInput.getRealPassword();
  if (!email || !password) return showMessage("Check your input. Please try again.", msgBox);
  disableButton(loginButton);
  const result = await signInWithEmail(email, password);
  if (result.success) {
    sessionStorage.setItem("showMobileGreeting", "1");
    window.location.href = "../index/summary.html";
  } else {
    showMessage("Check your input. Please try again.", msgBox);
    enableButton(loginButton);
  }
}

/**
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{success:boolean,error?:string}>}
 */
async function login(email, password) {
  return signInWithEmail(email, password);
}

/**
 * @param {string} message
 * @param {HTMLElement} box
 */
function showMessage(message, box) {
  box.textContent = message;
  box.style.color = "red";
}

/**
 * @param {HTMLElement} box
 */
function clearMessage(box) {
  box.textContent = "";
  box.style.color = "";
}

/**
 * @param {HTMLButtonElement} button
 */
function disableButton(button) {
  button.disabled = true;
  button.classList.add("loading");
}

/**
 * @param {HTMLButtonElement} button
 */
function enableButton(button) {
  button.disabled = false;
  button.classList.remove("loading");
}

/**
 * @returns {Promise<void>}
 */
async function startGuestSession() {
  try {
    await signInAsGuest();
    await preloadGuestContacts(window.USERKEY);
    await seedUserTasksIfEmpty();
    sessionStorage.setItem("showMobileGreeting", "1");
    window.location.href = "../index/summary.html";
  } catch (err) {
    console.error("Guest-Login fehlgeschlagen:", err);
    alert("Guest login failed. Please try again.");
  }
}

/**
 * @param {string} userKey
 * @returns {Promise<void>}
 */
async function preloadGuestContacts(userKey) {
  const contacts = demoContacts.map((contact) =>
    postData(`users/${userKey}/contacts`, contact)
  );
  await Promise.all(contacts);
}

window.startGuestSession = startGuestSession;
window.login = login;
