/**
 * Gemeinsame Passwort-Maskierung mit Sternen und Sichtbarkeits-Toggle.
 */

/**
 * @param {HTMLInputElement} passwordInput
 * @param {HTMLElement} [msgBox]
 */
function applyStarMaskToPassword(passwordInput, msgBox) {
  const state = { realPassword: "", visible: false };
  passwordInput.getRealPassword = () => state.realPassword;
  passwordInput.type = "text";

  if (passwordInput.value.length > 0) {
    state.realPassword = passwordInput.value;
    updatePasswordField(passwordInput, state.realPassword, state.visible);
    updatePasswordVisual(passwordInput, msgBox, state);
  }

  passwordInput.addEventListener("beforeinput", (e) => {
    state.realPassword = handlePasswordInput(e, state.realPassword, passwordInput, state.visible);
    updatePasswordField(passwordInput, state.realPassword, state.visible);
    updatePasswordCursor(passwordInput, state.visible);
    updatePasswordVisual(passwordInput, msgBox, state);
  });

  passwordInput.addEventListener("input", () => {
    if (passwordInput.value !== "*".repeat(state.realPassword.length)) {
      state.realPassword = passwordInput.value;
      updatePasswordField(passwordInput, state.realPassword, state.visible);
      updatePasswordVisual(passwordInput, msgBox, state);
    }
  });

  passwordInput.addEventListener("click", (e) => {
    if (clickedPasswordToggleArea(e, passwordInput) && state.realPassword.length > 0) {
      state.visible = !state.visible;
      updatePasswordField(passwordInput, state.realPassword, state.visible);
      updatePasswordVisual(passwordInput, msgBox, state);
    }
  });

  setTimeout(() => {
    if (passwordInput.value && !state.realPassword) {
      state.realPassword = passwordInput.value.replace(/\*/g, "");
    }
    if (state.realPassword.length > 0) {
      updatePasswordField(passwordInput, state.realPassword, false);
      updatePasswordVisual(passwordInput, msgBox, state);
    }
  }, 500);
}

/**
 * @param {InputEvent} e
 * @param {string} realPassword
 * @param {HTMLInputElement} input
 * @param {boolean} visible
 * @returns {string}
 */
function handlePasswordInput(e, realPassword, input, visible) {
  const start = input.selectionStart ?? 0;
  const end = input.selectionEnd ?? 0;

  if (e.inputType === "insertText" && e.data) {
    realPassword = realPassword.slice(0, start) + e.data + realPassword.slice(end);
  } else if (e.inputType === "deleteContentBackward") {
    realPassword = realPassword.slice(0, Math.max(0, start - 1)) + realPassword.slice(end);
  } else if (e.inputType === "deleteContentForward") {
    realPassword = realPassword.slice(0, start) + realPassword.slice(end + 1);
  }

  e.preventDefault();
  return realPassword;
}

/**
 * @param {HTMLInputElement} input
 * @param {string} realPassword
 * @param {boolean} visible
 */
function updatePasswordField(input, realPassword, visible) {
  input.value = visible ? realPassword : "*".repeat(realPassword.length);
}

/**
 * @param {HTMLInputElement} input
 * @param {boolean} visible
 */
function updatePasswordCursor(input, visible) {
  requestAnimationFrame(() => {
    const pos = visible ? (input.selectionStart ?? 0) + 1 : input.value.length;
    input.setSelectionRange(pos, pos);
  });
}

/**
 * @param {HTMLInputElement} input
 * @param {HTMLElement|undefined} msgBox
 * @param {{realPassword:string,visible:boolean}} state
 */
function updatePasswordVisual(input, msgBox, state) {
  input.classList.remove("input-error", "lock_icon", "visibility_icon", "visibility_off_icon");
  if (msgBox) {
    msgBox.textContent = "";
    msgBox.style.color = "";
  }

  const iconClass =
    state.realPassword.length === 0
      ? "lock_icon"
      : state.visible
        ? "visibility_icon"
        : "visibility_off_icon";

  input.classList.add(iconClass);
}

/**
 * @param {MouseEvent} e
 * @param {HTMLInputElement} input
 * @returns {boolean}
 */
function clickedPasswordToggleArea(e, input) {
  const rect = input.getBoundingClientRect();
  return e.clientX > rect.right - 40;
}

window.applyStarMaskToPassword = applyStarMaskToPassword;
window.clickedPasswordToggleArea = clickedPasswordToggleArea;
