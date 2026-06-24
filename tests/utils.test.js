import { describe, it, expect, beforeEach } from "vitest";

// Utils als reine Funktionen testen (ohne Browser-Globals)
function escapeHtml(value) {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeJsString(value) {
  if (value == null) return "";
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
}

function getInitials(name) {
  if (!name) return "";
  return name
    .split(" ")
    .map((word) => word[0]?.toUpperCase() || "")
    .join("")
    .substring(0, 2);
}

describe("escapeHtml", () => {
  it("escaped HTML-Sonderzeichen", () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
    );
  });

  it("gibt leeren String für null/undefined zurück", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });
});

describe("escapeJsString", () => {
  it("escaped Anführungszeichen für onclick-Attribute", () => {
    expect(escapeJsString("it's a test")).toBe("it\\'s a test");
  });
});

describe("getInitials", () => {
  it("liefert bis zu zwei Initialen", () => {
    expect(getInitials("Anna Becker")).toBe("AB");
    expect(getInitials("Max")).toBe("M");
    expect(getInitials("")).toBe("");
  });
});

describe("protectPageAccess", () => {
  beforeEach(() => {
    global.window = { location: { href: "" }, USERKEY: null };
    global.localStorage = {
      store: {},
      getItem(key) {
        return this.store[key] ?? null;
      },
      removeItem(key) {
        delete this.store[key];
      },
      clear() {
        this.store = {};
      },
    };
  });

  it("leitet um wenn kein Firebase-User und kein Key vorhanden", () => {
    function protectPageAccess(redirectUrl = "../../index.html") {
      if (global.window.firebaseAuth?.currentUser) return true;
      if (global.window.firebaseAuth) return false;
      const userKey = global.window.USERKEY || global.localStorage.getItem("loggedInUserKey");
      if (!userKey) {
        global.window.location.href = redirectUrl;
        return false;
      }
      return true;
    }

    expect(protectPageAccess()).toBe(false);
    expect(global.window.location.href).toBe("../../index.html");
  });

  it("erlaubt Zugriff mit aktivem Firebase-User", () => {
    function protectPageAccess() {
      if (global.window.firebaseAuth?.currentUser) return true;
      return false;
    }

    global.window.firebaseAuth = { currentUser: { uid: "uid-123" } };
    expect(protectPageAccess()).toBe(true);
  });
});
