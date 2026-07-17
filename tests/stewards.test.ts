import { describe, expect, it } from "vitest";
import {
  PENALTY_SECONDS,
  isInspectGesture,
  stewardsAction,
  type KeyGesture,
} from "../src/components/anticheat/stewards";

const gesture = (over: Partial<KeyGesture>): KeyGesture => ({
  code: "",
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...over,
});

describe("stewards — isInspectGesture", () => {
  it("flags the classic DevTools shortcuts", () => {
    expect(isInspectGesture(gesture({ code: "F12" }))).toBe(true);
    for (const code of ["KeyI", "KeyJ", "KeyC"]) {
      expect(isInspectGesture(gesture({ code, ctrlKey: true, shiftKey: true })), code).toBe(true);
      expect(isInspectGesture(gesture({ code, metaKey: true, shiftKey: true })), code).toBe(true);
      // mac Cmd+Opt — the .code check survives the alt-mangled .key
      expect(isInspectGesture(gesture({ code, metaKey: true, altKey: true })), code).toBe(true);
    }
  });

  it("flags view-source (Cmd/Ctrl+U)", () => {
    expect(isInspectGesture(gesture({ code: "KeyU", ctrlKey: true }))).toBe(true);
    expect(isInspectGesture(gesture({ code: "KeyU", metaKey: true }))).toBe(true);
  });

  it("ignores ordinary typing and unrelated shortcuts", () => {
    expect(isInspectGesture(gesture({ code: "KeyI" }))).toBe(false); // plain "i"
    expect(isInspectGesture(gesture({ code: "KeyU" }))).toBe(false);
    expect(isInspectGesture(gesture({ code: "KeyC", metaKey: true }))).toBe(false); // copy
    expect(isInspectGesture(gesture({ code: "KeyU", metaKey: true, shiftKey: true }))).toBe(false);
    expect(isInspectGesture(gesture({ code: "KeyR", metaKey: true }))).toBe(false); // reload
  });
});

describe("stewards — escalation ladder", () => {
  it("penalises the first offense, escalates the second, stands down after", () => {
    expect(stewardsAction(0)).toBe("penalty");
    expect(stewardsAction(1)).toBe("repeat-offense");
    expect(stewardsAction(2)).toBe("stand-down");
    expect(stewardsAction(7)).toBe("stand-down");
  });

  it("keeps the time penalty at five seconds — the bit depends on it", () => {
    expect(PENALTY_SECONDS).toBe(5);
  });
});
