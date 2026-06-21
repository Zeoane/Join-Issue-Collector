/**
 * Splash duration before showing the welcome screen (ms).
 * @type {number}
 */
const SPLASH_HOLD_MS = 600;

/** @type {HTMLElement|null} */
const startScreen = document.getElementById("start-screen");

/** @type {HTMLElement|null} */
const startLogo = document.getElementById("start-logo");

/** @type {HTMLElement|null} */
const welcomeScreen = document.getElementById("welcome-screen");

/**
 * Shows the welcome screen and hides the start splash.
 * @returns {void}
 */
function showWelcomeScreen() {
    if (startScreen) {
        startScreen.classList.add("is-hidden");
        startScreen.setAttribute("aria-hidden", "true");
    }

    if (welcomeScreen) {
        welcomeScreen.classList.add("is-visible");
        welcomeScreen.setAttribute("aria-hidden", "false");
    }

    document.documentElement.classList.add("welcome-page-active");
    document.body.classList.add("welcome-page-active");
}

/**
 * Runs the 100ms ease-in-out logo fade-in, then reveals welcome.
 * @returns {void}
 */
function initStartFlow() {
    if (!startLogo) return;

    requestAnimationFrame(() => {
        startLogo.classList.add("is-visible");
    });

    window.setTimeout(showWelcomeScreen, 100 + SPLASH_HOLD_MS);
}

window.addEventListener("load", initStartFlow);
