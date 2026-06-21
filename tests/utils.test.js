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
    global.window = { location: { href: "" } };
    global.localStorage = {
      store: {},
      getItem(key) {
        return this.store[key] ?? null;
      },
      clear() {
        this.store = {};
      },
    };
  });

  it("leitet um wenn kein User-Key vorhanden", () => {
    function protectPageAccess(redirectUrl = "../../index.html") {
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

  it("erlaubt Zugriff mit gültigem Key", () => {
    function protectPageAccess(redirectUrl = "../../index.html") {
      const userKey = global.window.USERKEY || global.localStorage.getItem("loggedInUserKey");
      if (!userKey) {
        global.window.location.href = redirectUrl;
        return false;
      }
      return true;
    }

    global.localStorage.store.loggedInUserKey = "uid-123";
    expect(protectPageAccess()).toBe(true);
  });
});
