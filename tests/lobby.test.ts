import { describe, expect, it } from "vitest";
import {
  emailMailto,
  joinControls,
  lobbyRoom,
  playerList,
  statusChips,
} from "../content/lobby";
import { findEvent } from "../content/career";

const EXPECTED_JOIN_HREFS: Record<string, string | undefined> = {
  email: undefined,
  resume: "/resume/Surya_Pugazhenthi_Resume.pdf",
  calendly: "https://calendly.com/suryaoncall/surya-s-vc-scout-office-hours",
  github: "https://github.com/Nxver-GitHub",
  linkedin: "https://www.linkedin.com/in/surya-pugazhenthi",
  x: "https://x.com/surpugaz",
};

describe("lobby room", () => {
  it("has a non-empty room name and region", () => {
    expect(lobbyRoom.name).toBeTruthy();
    expect(lobbyRoom.region).toBeTruthy();
  });
});

describe("lobby status chips", () => {
  it("has exactly three chips, all with non-empty labels", () => {
    expect(statusChips).toHaveLength(3);
    for (const chip of statusChips) {
      expect(chip.label).toBeTruthy();
    }
  });
});

describe("lobby join controls", () => {
  it("has exactly six join controls", () => {
    expect(joinControls).toHaveLength(6);
  });

  it("pins the exact six join channels and hrefs (regression)", () => {
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

  it("builds the exact confirmed mailto address at call time only", () => {
    const email = joinControls.find((c) => c.channel === "email");
    expect(email?.href).toBeUndefined();
    expect(emailMailto()).toBe("mailto:suryapugaz1629@gmail.com");
  });

  it("uses https for every external join control", () => {
    for (const control of joinControls) {
      if (control.channel === "email" || control.channel === "resume") continue;
      expect(control.href?.startsWith("https://"), control.channel).toBe(true);
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

  it("marks exactly one community as active — 16VC (owner call, 2026-07)", () => {
    const active = playerList.filter((p) => p.membership === "active");
    expect(active.map((p) => p.id)).toEqual(["16vc"]);
  });

  it("excludes communities that only hosted a competition/hackathon", () => {
    // Removed 2026-07: hackathon hosts are not communities Surya belongs to.
    const banished = ["cruzhacks", "entrepreneur-first", "locus"];
    for (const id of banished) {
      expect(playerList.some((p) => p.id === id), id).toBe(false);
    }
  });

  it("writes every former community in the past tense (previously/earned)", () => {
    for (const player of playerList) {
      if (player.membership === "former") {
        expect(
          /previously|earned/i.test(player.description),
          `${player.id}: "${player.description}"`,
        ).toBe(true);
      }
    }
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
