import { describe, expect, it } from "vitest";
import {
  joinControls,
  lobbyRoom,
  playerList,
  statusChips,
} from "../content/lobby";
import { findEvent } from "../content/career";

const EXPECTED_JOIN_HREFS: Record<string, string> = {
  email: "mailto:suryapugaz1629@gmail.com",
  github: "https://github.com/Nxver-GitHub",
  linkedin: "https://www.linkedin.com/in/surya-pugazhenthi",
  x: "https://x.com/suryamightbuild",
};

describe("lobby room", () => {
  it("has a non-empty room name and region", () => {
    expect(lobbyRoom.name).toBeTruthy();
    expect(lobbyRoom.region).toBeTruthy();
  });
});

describe("lobby status chips", () => {
  it("has exactly four chips, all with non-empty labels", () => {
    expect(statusChips).toHaveLength(4);
    for (const chip of statusChips) {
      expect(chip.label).toBeTruthy();
    }
  });
});

describe("lobby join controls", () => {
  it("has exactly four join controls", () => {
    expect(joinControls).toHaveLength(4);
  });

  it("pins the exact four join channels and hrefs (regression)", () => {
    expect(joinControls.map((c) => c.channel).sort()).toEqual(
      Object.keys(EXPECTED_JOIN_HREFS).sort(),
    );
    for (const control of joinControls) {
      expect(control.href).toBe(EXPECTED_JOIN_HREFS[control.channel]);
    }
  });

  it("gives every join control a non-empty label", () => {
    for (const control of joinControls) {
      expect(control.label).toBeTruthy();
    }
  });

  it("uses the exact confirmed mailto address for email", () => {
    const email = joinControls.find((c) => c.channel === "email");
    expect(email?.href).toBe("mailto:suryapugaz1629@gmail.com");
  });

  it("uses https for every non-email join control", () => {
    for (const control of joinControls) {
      if (control.channel === "email") continue;
      expect(control.href.startsWith("https://"), control.channel).toBe(true);
    }
  });
});

describe("lobby player list", () => {
  it("has at least one player card", () => {
    expect(playerList.length).toBeGreaterThan(0);
  });

  it("has unique player ids", () => {
    const ids = playerList.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every player a non-empty name and description", () => {
    for (const player of playerList) {
      expect(player.name, player.id).toBeTruthy();
      expect(player.description, player.id).toBeTruthy();
    }
  });

  it("uses https for every player link", () => {
    for (const player of playerList) {
      if (player.link) {
        expect(player.link.startsWith("https://"), player.id).toBe(true);
      }
    }
  });

  it("resolves every careerEventSlug to a real career event", () => {
    for (const player of playerList) {
      if (player.careerEventSlug) {
        expect(
          findEvent(player.careerEventSlug),
          `${player.id} → ${player.careerEventSlug}`,
        ).not.toBeNull();
      }
    }
  });
});
