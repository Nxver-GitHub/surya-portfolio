import { describe, expect, it } from "vitest";
import {
  LOGIN_PROMPT,
  handleLoginInput,
} from "../src/components/cafe/terminal/loginMachine";

/**
 * SPEC (not the current stub) — see task brief. The stub logs every input
 * straight into "authed" with a single system line, so most cases below
 * fail against it today. Each failure must be an assertion mismatch, never
 * an import/type/runtime error.
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

  describe("password prompt -> always denied", () => {
    it("'hunter2' -> back to login, masked echo, denial, re-prompt", () => {
      const result = handleLoginInput("password", "hunter2");
      expect(result.next).toBe("login");
      expect(result.lines).toHaveLength(3);

      expect(result.lines[0].tone).toBe("prompt");
      expect(result.lines[0].text).toBe("password: ••••••");
      expect(result.lines[0].text).not.toContain("hunter2");

      expect(result.lines[1].tone).toBe("error");
      expect(result.lines[1].text).toBe(
        "ACCESS DENIED — admin console offline. guest services only.",
      );

      expect(result.lines[2].tone).toBe("system");
      expect(result.lines[2].text).toBe(LOGIN_PROMPT);
    });
  });

  describe("authed passthrough", () => {
    it("any input while authed is a no-op step", () => {
      const result = handleLoginInput("authed", "anything");
      expect(result).toEqual({ next: "authed", lines: [] });
    });
  });
});
