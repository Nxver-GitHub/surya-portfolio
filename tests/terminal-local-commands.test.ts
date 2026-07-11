import { describe, expect, it } from "vitest";
import {
  LOCAL_COMMANDS,
  resolveLocalCommand,
} from "../src/components/cafe/terminal/localCommands";
import {
  parseErrorCode,
  themedErrorLine,
} from "../src/components/cafe/terminal/errorMapping";
import { THEMED } from "../src/components/cafe/terminal/terminalLines";

describe("terminal local commands — resolution", () => {
  it("routes help/about/projects/contact to printed output", () => {
    for (const cmd of ["help", "about", "projects", "contact"] as const) {
      const result = resolveLocalCommand(cmd);
      expect(result.kind, cmd).toBe("print");
      if (result.kind === "print") {
        expect(result.lines.length, cmd).toBeGreaterThan(0);
      }
    }
  });

  it("routes clear and exit to their own results", () => {
    expect(resolveLocalCommand("clear").kind).toBe("clear");
    expect(resolveLocalCommand("exit").kind).toBe("exit");
  });

  it("is case-insensitive on the command verb", () => {
    expect(resolveLocalCommand("HELP").kind).toBe("print");
    expect(resolveLocalCommand("Exit").kind).toBe("exit");
  });

  it("treats unknown input as a chat message with original text", () => {
    const result = resolveLocalCommand("what did he build at Locus?");
    expect(result.kind).toBe("chat");
    if (result.kind === "chat") {
      expect(result.text).toBe("what did he build at Locus?");
    }
  });

  it("trims chat input", () => {
    const result = resolveLocalCommand("   hello there   ");
    expect(result.kind).toBe("chat");
    if (result.kind === "chat") expect(result.text).toBe("hello there");
  });

  it("returns an empty print for blank input (no send, no output)", () => {
    const result = resolveLocalCommand("   ");
    expect(result.kind).toBe("print");
    if (result.kind === "print") expect(result.lines).toHaveLength(0);
  });

  it("does not treat a command-like word mid-sentence as a command", () => {
    // Only the leading verb is matched; 'tell me about help' is a chat message.
    const result = resolveLocalCommand("tell me about help");
    expect(result.kind).toBe("chat");
  });

  it("projects output lists real featured builds", () => {
    const result = resolveLocalCommand("projects");
    if (result.kind === "print") {
      const text = result.lines.join("\n");
      expect(text).toContain("Nodegent");
      expect(text).toContain("TripWeaver");
    }
  });

  it("contact output lists real links", () => {
    const result = resolveLocalCommand("contact");
    if (result.kind === "print") {
      const text = result.lines.join("\n");
      expect(text).toContain("github.com/Nxver-GitHub");
      expect(text).toContain("linkedin.com/in/surya-pugazhenthi");
    }
  });

  it("exposes a stable command list for help", () => {
    expect(LOCAL_COMMANDS).toContain("help");
    expect(LOCAL_COMMANDS).toContain("exit");
    expect(new Set(LOCAL_COMMANDS).size).toBe(LOCAL_COMMANDS.length);
  });
});

describe("terminal error mapping", () => {
  it("parses a known code from a JSON error body", () => {
    expect(parseErrorCode('{"error":"RATE_LIMITED","retryAfterSeconds":12}')).toBe(
      "RATE_LIMITED",
    );
    expect(parseErrorCode('{"error":"TERMINAL_OFFLINE"}')).toBe(
      "TERMINAL_OFFLINE",
    );
    expect(parseErrorCode('{"error":"SYSTEM_BUSY"}')).toBe("SYSTEM_BUSY");
  });

  it("parses a known code from a bare substring", () => {
    expect(parseErrorCode("Error: RATE_LIMITED happened")).toBe("RATE_LIMITED");
  });

  it("returns null for an unrecognized message", () => {
    expect(parseErrorCode("network hiccup")).toBeNull();
  });

  it("maps each code to its themed line", () => {
    expect(themedErrorLine(new Error('{"error":"RATE_LIMITED"}'))).toBe(
      THEMED.rateLimited,
    );
    expect(themedErrorLine(new Error('{"error":"TERMINAL_OFFLINE"}'))).toBe(
      THEMED.terminalOffline,
    );
    expect(themedErrorLine(new Error('{"error":"SYSTEM_BUSY"}'))).toBe(
      THEMED.systemBusy,
    );
  });

  it("falls back to a generic themed line for unknown errors", () => {
    expect(themedErrorLine(new Error("boom"))).toBe(THEMED.genericError);
    expect(themedErrorLine("weird string")).toBe(THEMED.genericError);
    expect(themedErrorLine(undefined)).toBe(THEMED.genericError);
  });
});
