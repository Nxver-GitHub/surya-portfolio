// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import type { PresenceState } from "@/lib/presence/types";
import type { Player } from "@/lib/presence/protocol";

/**
 * UI coverage for the lobby presence surfaces this branch owns: LiveRacers
 * (guest rows in PlayerList) and RoomOnlineChip (RoomStatusPanel's status
 * chip). usePresence() is mocked directly — the real hook/provider are owned
 * by another agent and may not exist on disk when this file first runs.
 */

const mockUsePresence = vi.fn<() => PresenceState>();

vi.mock("@/lib/presence/usePresence", () => ({
  usePresence: () => mockUsePresence(),
}));

const { LiveRacers } = await import("../src/components/lobby/LiveRacers");
const { RoomOnlineChip } = await import(
  "../src/components/lobby/RoomOnlineChip"
);

function player(overrides: Partial<Player> = {}): Player {
  return {
    id: "id-1",
    callsign: "RACER-0421",
    livery: "gulf",
    location: "map",
    ...overrides,
  };
}

function offlineState(): PresenceState {
  return { status: "offline", you: null, roster: [] };
}

afterEach(() => {
  cleanup();
  mockUsePresence.mockReset();
});

describe("LiveRacers", () => {
  it("renders nothing when offline", () => {
    mockUsePresence.mockReturnValue(offlineState());
    const { container } = render(React.createElement(LiveRacers));
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when connecting", () => {
    mockUsePresence.mockReturnValue({
      status: "connecting",
      you: null,
      roster: [],
    });
    const { container } = render(React.createElement(LiveRacers));
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when online with an empty roster", () => {
    mockUsePresence.mockReturnValue({
      status: "online",
      you: null,
      roster: [],
    });
    const { container } = render(React.createElement(LiveRacers));
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a row per roster entry, marking YOU vs GUEST and pavilion names", () => {
    const you = player({ id: "me", callsign: "RACER-0001", location: "garage" });
    const guest = player({
      id: "them",
      callsign: "RACER-0002",
      location: "cafe",
    });
    mockUsePresence.mockReturnValue({
      status: "online",
      you,
      roster: [you, guest],
    });

    render(React.createElement(LiveRacers));

    const list = screen.getByRole("list", { name: "Racers online" });
    expect(list).toHaveAttribute("aria-live", "polite");

    expect(screen.getByText("RACER-0001")).toBeInTheDocument();
    expect(screen.getByText("RACER-0002")).toBeInTheDocument();
    expect(screen.getByText("YOU")).toBeInTheDocument();
    expect(screen.getByText("GUEST")).toBeInTheDocument();
    expect(screen.getByText("Exploring Garage")).toBeInTheDocument();
    expect(screen.getByText("Exploring GT Café")).toBeInTheDocument();
  });

  it("describes the map location as 'On the world map'", () => {
    const you = player({ id: "me", location: "map" });
    mockUsePresence.mockReturnValue({
      status: "online",
      you,
      roster: [you],
    });

    render(React.createElement(LiveRacers));
    expect(screen.getByText("On the world map")).toBeInTheDocument();
  });
});

describe("RoomOnlineChip", () => {
  it("renders nothing when never connected", () => {
    mockUsePresence.mockReturnValue(offlineState());
    const { container } = render(
      React.createElement("ul", null, React.createElement(RoomOnlineChip)),
    );
    expect(container.querySelector("li")).toBeNull();
  });

  it("renders ONLINE n when online", () => {
    mockUsePresence.mockReturnValue({
      status: "online",
      you: player(),
      roster: [player(), player({ id: "id-2" })],
    });
    render(
      React.createElement("ul", null, React.createElement(RoomOnlineChip)),
    );
    expect(screen.getByText(/Online 2/i)).toBeInTheDocument();
  });

  it("renders OFFLINE after a session that was previously online drops", () => {
    mockUsePresence.mockReturnValue({
      status: "online",
      you: player(),
      roster: [player()],
    });
    const { rerender, container } = render(
      React.createElement("ul", null, React.createElement(RoomOnlineChip)),
    );
    expect(screen.getByText(/Online/i)).toBeInTheDocument();

    mockUsePresence.mockReturnValue(offlineState());
    rerender(
      React.createElement("ul", null, React.createElement(RoomOnlineChip)),
    );
    expect(screen.getByText(/Offline/i)).toBeInTheDocument();
    expect(container.querySelector("li")).not.toBeNull();
  });
});
