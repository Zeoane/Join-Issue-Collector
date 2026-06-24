import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["js/**/*.js", "main.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...globals.browser,
        BASE_URL: "readonly",
        USERKEY: "readonly",
        firebase: "readonly",
        escapeHtml: "readonly",
        escapeJsString: "readonly",
        loadData: "readonly",
        postData: "readonly",
        putData: "readonly",
        deleteData: "readonly",
        authFetchUrl: "readonly",
        clearSessionStorage: "readonly",
        signUpWithEmail: "readonly",
        getAuthErrorMessage: "readonly",
        signInAsGuest: "readonly",
        signOutUser: "readonly",
        protectPageAccess: "readonly",
        ensureAuthenticated: "readonly",
        applyStarMaskToPassword: "readonly",
        demoContacts: "readonly",
        predefinedColors: "readonly",
        getInitials: "readonly",
        getRandomColor: "readonly",
        contactIconSpan: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-implicit-globals": "off",
    },
  },
  {
    ignores: ["node_modules/**", ".idea/**"],
  },
];
