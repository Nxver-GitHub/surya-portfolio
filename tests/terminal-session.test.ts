import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendSessionLines,
  clearSessionLines,
  getTerminalSession,
  patchTerminalSession,
  pushSessionHistory,
  resetTerminalSession,
  subscribeTerminalSession,
} from "../src/components/cafe/terminal/terminalSession";
import { makeLine } from "../src/components/cafe/terminal/terminalLines";

describe("terminalSession", () => {
  beforeEach(() => {
    resetTerminalSession();
  });

  it("has the expected initial shape", () => {
    const session = getTerminalSession();
    expect(session.lines).toEqual([]);
    expect(session.login).toBe("login");
    expect(session.userTurns).toBe(0);
    expect(session.history).toEqual([]);
    expect(session.booted).toBe(false);
  });

  describe("appendSessionLines", () => {
    it("appends lines immutably, leaving the prior snapshot unchanged", () => {
      const before = getTerminalSession();
      const line = makeLine("system", "hello");
      appendSessionLines([line]);
      const after = getTerminalSession();

      expect(before.lines).toEqual([]);
      expect(after.lines).toEqual([line]);
      expect(after).not.toBe(before);
    });

    it("no-ops on an empty batch", () => {
      appendSessionLines([makeLine("system", "first")]);
      const before = getTerminalSession();
      appendSessionLines([]);
      const after = getTerminalSession();

      expect(after).toBe(before);
      expect(after.lines).toEqual(before.lines);
    });
  });

  describe("clearSessionLines", () => {
    it("wipes only the lines — login/turns/history/booted survive", () => {
      appendSessionLines([makeLine("system", "hi")]);
      pushSessionHistory("help");
      patchTerminalSession({ login: "password", userTurns: 3, booted: true });

      clearSessionLines();
      const session = getTerminalSession();

      expect(session.lines).toEqual([]);
      expect(session.login).toBe("password");
      expect(session.userTurns).toBe(3);
      expect(session.history).toEqual(["help"]);
      expect(session.booted).toBe(true);
    });
  });

  describe("pushSessionHistory", () => {
    it("trims whitespace before recording", () => {
      pushSessionHistory("  hello  ");
      expect(getTerminalSession().history).toEqual(["hello"]);
    });

    it("skips empty (or whitespace-only) input", () => {
      pushSessionHistory("");
      pushSessionHistory("   ");
      expect(getTerminalSession().history).toEqual([]);
    });

    it("skips an immediate duplicate", () => {
      pushSessionHistory("help");
      pushSessionHistory("help");
      expect(getTerminalSession().history).toEqual(["help"]);
    });

    it("allows a non-adjacent duplicate", () => {
      pushSessionHistory("help");
      pushSessionHistory("about");
      pushSessionHistory("help");
      expect(getTerminalSession().history).toEqual(["help", "about", "help"]);
    });
  });

  describe("patchTerminalSession", () => {
    it("shallow-merges the patch into the session", () => {
      patchTerminalSession({ login: "authed", userTurns: 5 });
      const session = getTerminalSession();

      expect(session.login).toBe("authed");
      expect(session.userTurns).toBe(5);
      expect(session.lines).toEqual([]);
      expect(session.history).toEqual([]);
      expect(session.booted).toBe(false);
    });
  });

  describe("resetTerminalSession", () => {
    it("restores the initial state after mutation", () => {
      appendSessionLines([makeLine("system", "hi")]);
      pushSessionHistory("help");
      patchTerminalSession({ login: "authed", userTurns: 9, booted: true });

      resetTerminalSession();
      const session = getTerminalSession();

      expect(session.lines).toEqual([]);
      expect(session.login).toBe("login");
      expect(session.userTurns).toBe(0);
      expect(session.history).toEqual([]);
      expect(session.booted).toBe(false);
    });
  });

  describe("subscribeTerminalSession", () => {
    it("fires the listener on update and stops firing after unsubscribe", () => {
      const listener = vi.fn();
      const unsubscribe = subscribeTerminalSession(listener);

      patchTerminalSession({ userTurns: 1 });
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      patchTerminalSession({ userTurns: 2 });
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
