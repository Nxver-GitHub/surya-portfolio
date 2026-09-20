// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import type { PresenceState } from "@/lib/presence/types";
import type { Player } from "@/lib/presence/protocol";

/**
 * Coverage for the map HUD's ONLINE readout (this branch's HudOnline.tsx).
 * usePresence() is mocked directly, same approach as
 * tests/lobby-presence-ui.test.ts.
 */

const mockUsePresence = vi.fn<() => PresenceState>();

vi.mock("@/lib/presence/usePresence", () => ({
  usePresence: () => mockUsePresence(),
}));

const { HudOnline } = await import("../src/components/world-map/HudOnline");

function player(overrides: Partial<Player> = {}): Player {
  return {
    id: "id-1",
    callsign: "RACER-0421",
    livery: "gulf",
    location: "map",
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  mockUsePresence.mockReset();
});

describe("HudOnline", () => {
  it("is hidden when offline", () => {
    mockUsePresence.mockReturnValue({ status: "offline", you: null, roster: [] });
    const { container } = render(React.createElement(HudOnline));
    expect(container).toBeEmptyDOMElement();
  });

  it("is hidden while connecting", () => {
    mockUsePresence.mockReturnValue({
      status: "connecting",
      you: null,
      roster: [],
    });
    const { container } = render(React.createElement(HudOnline));
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the online count when online", () => {
    mockUsePresence.mockReturnValue({
      status: "online",
      you: player(),
      roster: [player(), player({ id: "id-2" }), player({ id: "id-3" })],
    });
    render(React.createElement(HudOnline));
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Online")).toBeInTheDocument();
  });
});
