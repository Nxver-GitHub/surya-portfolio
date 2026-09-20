import { describe, expect, it } from "vitest";
import { locationFromPathname } from "@/lib/presence/locationFromPathname";
import { pavilions } from "../content/pavilions";

describe("locationFromPathname", () => {
  it("maps the root path to the map", () => {
    expect(locationFromPathname("/")).toBe("map");
  });

  it("maps an empty pathname to the map", () => {
    expect(locationFromPathname("")).toBe("map");
  });

  it("maps every pavilion slug to itself", () => {
    for (const pavilion of pavilions) {
      expect(locationFromPathname(`/${pavilion.slug}`)).toBe(pavilion.slug);
    }
  });

  it("maps nested paths under a pavilion slug to that slug", () => {
    const pavilion = pavilions[0];
    expect(locationFromPathname(`/${pavilion.slug}/deep/nested`)).toBe(
      pavilion.slug,
    );
  });

  it("maps unknown top-level routes to the map", () => {
    expect(locationFromPathname("/not-a-real-pavilion")).toBe("map");
    expect(locationFromPathname("/admin/login")).toBe("map");
  });
});
