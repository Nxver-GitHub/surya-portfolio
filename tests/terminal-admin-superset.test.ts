import { describe, expect, it } from "vitest";
import { routeAdminInput } from "../src/components/cafe/terminal/adminSuperset";

/**
 * The admin account is a full SUPERSET of the guest account. `routeAdminInput`
 * is the single pure place that encodes the precedence the hook dispatches on:
 *
 *   admin command  →  guest local command  →  chat
 */
describe("routeAdminInput — admin is a superset of guest", () => {
  it("routes admin-only commands as admin", () => {
    expect(routeAdminInput("logs")).toEqual({
      kind: "admin",
      result: { kind: "data", command: "logs" },
    });
    expect(routeAdminInput("stats")).toEqual({
      kind: "admin",
      result: { kind: "data", command: "stats" },
    });
    expect(routeAdminInput("logout")).toEqual({
      kind: "admin",
      result: { kind: "logout" },
    });
  });

  it("routes the shared help/clear as admin (admin owns them first)", () => {
    expect(routeAdminInput("help").kind).toBe("admin");
    expect(routeAdminInput("clear")).toEqual({
      kind: "admin",
      result: { kind: "clear" },
    });
  });

  it("runs GUEST commands in admin mode (about/projects/contact/exit)", () => {
    const about = routeAdminInput("about");
    expect(about.kind).toBe("guest");
    expect(about.result.kind).toBe("print");

    expect(routeAdminInput("projects").result.kind).toBe("print");
    expect(routeAdminInput("contact").result.kind).toBe("print");
    expect(routeAdminInput("exit")).toEqual({
      kind: "guest",
      result: { kind: "exit" },
    });
  });

  it("routes free text to CHAT, preserving the original text", () => {
    const route = routeAdminInput("what stack is the site on?");
    expect(route).toEqual({
      kind: "guest",
      result: { kind: "chat", text: "what stack is the site on?" },
    });
  });

  it("treats empty input as an admin no-op (not a chat)", () => {
    expect(routeAdminInput("   ")).toEqual({
      kind: "admin",
      result: { kind: "empty" },
    });
  });
});
