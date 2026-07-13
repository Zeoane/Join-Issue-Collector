const STAKEHOLDER_RETURN_URL = "/index.html";

/**
 * @param {HTMLElement} trigger
 * @param {boolean} waiting
 */
function setTriggerWaitingState(trigger, waiting) {
  if (!trigger) return;
  trigger.setAttribute("aria-busy", waiting ? "true" : "false");
  if (waiting) {
    trigger.dataset.stakeholderEmailWaiting = "true";
    trigger.setAttribute("aria-disabled", "true");
    trigger.style.pointerEvents = "none";
    return;
  }
  delete trigger.dataset.stakeholderEmailWaiting;
  trigger.removeAttribute("aria-disabled");
  trigger.style.pointerEvents = "";
}

/**
 * @param {string} composeUrl
 * @returns {boolean}
 */
function openComposeInNewTab(composeUrl) {
  const popup = window.open(composeUrl, "_blank");
  if (!popup) return false;
  try {
    popup.opener = null;
  } catch (_) {
    // Ignore cross-browser restrictions.
  }
  return true;
}

/**
 * @param {Event} event
 * @returns {void}
 */
function handleStakeholderEmailRequest(event) {
  const trigger = event.currentTarget;
  if (!(trigger instanceof HTMLElement)) return;
  if (trigger.dataset.stakeholderEmailWaiting === "true") {
    event.preventDefault();
    return;
  }

  const composeUrl = trigger.getAttribute("href");
  if (!composeUrl) return;

  event.preventDefault();
  setTriggerWaitingState(trigger, true);

  const opened = openComposeInNewTab(composeUrl);
  if (!opened) {
    setTriggerWaitingState(trigger, false);
    window.alert(
      "Bitte erlaube Pop-ups für diese Seite, damit die E-Mail in einem neuen Tab geöffnet werden kann."
    );
    return;
  }

  window.location.replace(STAKEHOLDER_RETURN_URL);
}

/**
 * @returns {void}
 */
function initStakeholderEmailRequest() {
  document.querySelectorAll("[data-stakeholder-email-request]").forEach((element) => {
    element.addEventListener("click", handleStakeholderEmailRequest);
  });
}

void initStakeholderEmailRequest();
