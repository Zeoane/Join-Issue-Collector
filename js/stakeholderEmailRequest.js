const EMAIL_BODY_TEMPLATE = `Description:


Subtask:


Enddate:

`;

const COMPOSE_URL =
  `https://mail.google.com/mail/?view=cm&fs=1&to=joincollector%40gmail.com&su=Feature%20Request&body=${encodeURIComponent(EMAIL_BODY_TEMPLATE)}`;

/**
 * @returns {string}
 */
function getReturnUrl() {
  return `${window.location.origin}/index.html`;
}

/**
 * @param {string} composeUrl
 * @returns {void}
 */
function openComposeInNewTab(composeUrl) {
  const popup = window.open(composeUrl, "_blank");
  if (popup) {
    try {
      popup.opener = null;
    } catch (_) {
      // Ignore cross-browser restrictions.
    }
  }
}

/**
 * @param {Event} event
 * @returns {void}
 */
function handleStakeholderEmailRequest(event) {
  const trigger = event.currentTarget;
  if (!(trigger instanceof HTMLElement)) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  const composeUrl = trigger.getAttribute("data-compose-url") || COMPOSE_URL;
  openComposeInNewTab(composeUrl);

  // One frame delay so the browser keeps the Gmail tab open while we navigate away.
  requestAnimationFrame(() => {
    window.location.replace(getReturnUrl());
  });
}

/**
 * @returns {void}
 */
function initStakeholderEmailRequest() {
  document.querySelectorAll("[data-stakeholder-email-request]").forEach((element) => {
    element.setAttribute("data-compose-url", COMPOSE_URL);
    element.addEventListener("click", handleStakeholderEmailRequest, true);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initStakeholderEmailRequest);
} else {
  initStakeholderEmailRequest();
}
