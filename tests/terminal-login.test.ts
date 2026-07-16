import { describe, expect, it } from "vitest";
import { handleLoginInput } from "../src/components/cafe/terminal/loginMachine";

/**
 * The pure account-selection step of the login flow. The password SUBMISSION
 * is no longer resolved here — it is verified asynchronously against the real
 * auth route (see adminLogin + tests/terminal-admin-login.test.ts), so this
 * step function treats `password` (and both authed states) as no-op passthrough.
 */
describe("loginMachine — spec", () => {
  describe("guest login", () => {
    it("'guest' -> authed with echo + guest system line", () => {
      const result = handleLoginInput("login", "guest");
      expect(result.next).toBe("authed");
      expect(result.lines).toHaveLength(2);
      expect(result.lines[0].tone).toBe("prompt");
      expect(result.lines[0].text).toBe("login: guest");
      expect(result.lines[1].tone).toBe("system");
      expect(result.lines[1].text).toBe(
        "guest session started. type 'help' or ask a question.",
      );
    });

    it("empty input (Enter) -> authed, echo still reads 'login: guest'", () => {
      const result = handleLoginInput("login", "");
      expect(result.next).toBe("authed");
      expect(result.lines).toHaveLength(2);
      expect(result.lines[0].tone).toBe("prompt");
      expect(result.lines[0].text).toBe("login: guest");
      expect(result.lines[1].tone).toBe("system");
      expect(result.lines[1].text).toBe(
        "guest session started. type 'help' or ask a question.",
      );
    });

    it("padded/mixed-case '  GUEST ' -> authed, same guest flow", () => {
      const result = handleLoginInput("login", "  GUEST ");
      expect(result.next).toBe("authed");
      expect(result.lines).toHaveLength(2);
      expect(result.lines[0].tone).toBe("prompt");
      expect(result.lines[0].text).toBe("login: guest");
      expect(result.lines[1].tone).toBe("system");
      expect(result.lines[1].text).toBe(
        "guest session started. type 'help' or ask a question.",
      );
    });
  });

  describe("admin login -> password prompt", () => {
    it("'admin' -> password state, echo + password prompt", () => {
      const result = handleLoginInput("login", "admin");
      expect(result.next).toBe("password");
      expect(result.lines).toHaveLength(2);
      expect(result.lines[0].tone).toBe("prompt");
      expect(result.lines[0].text).toBe("login: admin");
      expect(result.lines[1].tone).toBe("system");
      expect(result.lines[1].text).toBe("password:");
    });

    it("' Admin ' (padded/mixed-case) -> password state", () => {
      const result = handleLoginInput("login", " Admin ");
      expect(result.next).toBe("password");
      expect(result.lines).toHaveLength(2);
      expect(result.lines[0].tone).toBe("prompt");
      expect(result.lines[0].text).toBe("login: admin");
      expect(result.lines[1].tone).toBe("system");
      expect(result.lines[1].text).toBe("password:");
    });
  });

  describe("unknown account", () => {
    it("'root' -> stays on login, echo + unknown-account error", () => {
      const result = handleLoginInput("login", "root");
      expect(result.next).toBe("login");
      expect(result.lines).toHaveLength(2);
      expect(result.lines[0].tone).toBe("prompt");
      // Echo casing of the unknown account is not load-bearing spec — match
      // loosely rather than pin exact casing/whitespace.
      expect(result.lines[0].text).toMatch(/^login: root$/i);
      expect(result.lines[1].tone).toBe("error");
      expect(result.lines[1].text).toBe(
        "unknown account 'root' — guest services only.",
      );
    });
  });

  describe("password submission is async elsewhere — pure step is a no-op", () => {
    it("'hunter2' at the password step neither denies nor grants here", () => {
      const result = handleLoginInput("password", "hunter2");
      // The real verify is async (adminLogin.requestAdminLogin); this pure step
      // must NOT resolve it, and must never echo/leak the secret.
      expect(result).toEqual({ next: "password", lines: [] });
      expect(JSON.stringify(result)).not.toContain("hunter2");
    });
  });

  describe("authed passthrough", () => {
    it("any input while authed (guest) is a no-op step", () => {
      const result = handleLoginInput("authed", "anything");
      expect(result).toEqual({ next: "authed", lines: [] });
    });

    it("any input while in the admin console is a no-op step", () => {
      const result = handleLoginInput("admin", "logs");
      expect(result).toEqual({ next: "admin", lines: [] });
    });
  });
});
