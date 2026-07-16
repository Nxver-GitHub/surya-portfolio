import { describe, expect, it } from "vitest";
import {
  BOOKING_URL,
  isMeetupRequest,
  makeMeetupLines,
} from "../src/components/cafe/terminal/meetup";
import { joinControls } from "../content/lobby";
import { linkifySegments } from "../src/components/cafe/terminal/linkify";
import { buildSystemPrompt } from "../src/lib/terminal-prompt";

describe("meetup — isMeetupRequest", () => {
  it("recognizes meeting/booking style asks", () => {
    for (const text of [
      "can i meet surya",
      "Can I meet up with you?",
      "how do I book a call",
      "can we schedule a meeting",
      "I'd love to grab coffee with him",
      "do you have office hours?",
      "can I set up a chat",
      "where's your calendly",
      "can I talk to surya",
    ]) {
      expect(isMeetupRequest(text), text).toBe(true);
    }
  });

  it("rejects unrelated queries", () => {
    for (const text of [
      "help",
      "who is surya",
      "what is the cafe based on",
      "what did he build at Locus",
      "what stack does TripWeaver use",
    ]) {
      expect(isMeetupRequest(text), text).toBe(false);
    }
  });
});

describe("meetup — booking lines", () => {
  it("sources the booking URL from lobby content (single source)", () => {
    const calendly = joinControls.find((c) => c.channel === "calendly");
    expect(BOOKING_URL).toBe(calendly?.href);
    expect(BOOKING_URL.startsWith("https://calendly.com/")).toBe(true);
  });

  it("emits a header line plus the URL line", () => {
    const lines = makeMeetupLines();
    expect(lines).toHaveLength(2);
    expect(lines[0].text).toContain("BOOKING CHANNEL OPEN");
    expect(lines[1].text).toContain(BOOKING_URL);
  });

  it("linkifies the booking URL (allowlisted via joinControls)", () => {
    const segments = linkifySegments(makeMeetupLines()[1].text);
    const link = segments.find((s) => s.type === "link");
    expect(link?.href).toBe(BOOKING_URL);
  });
});

describe("meetup — system prompt grounding", () => {
  it("tells the model to offer the booking link for meeting requests", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain(BOOKING_URL);
    expect(prompt).toContain("booking link");
  });
});
