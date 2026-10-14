import { describe, expect, it } from "vitest";
import { splitNumerals } from "../src/lib/numerals";

const numbers = (text: string) =>
  splitNumerals(text)
    .filter((p) => p.numeric)
    .map((p) => p.text);

describe("splitNumerals", () => {
  it("keeps the text intact", () => {
    const text = "Detection: 2,932 companies scanned in 2025.";
    expect(splitNumerals(text).map((p) => p.text).join("")).toBe(text);
  });

  it("finds counts, years, ranges, times and percentages", () => {
    expect(numbers("Detection: 2,932 companies scanned")).toEqual(["2,932"]);
    expect(numbers("Jun 2024 – Sep 2025")).toEqual(["2024", "2025"]);
    expect(numbers("2024–2025")).toEqual(["2024–2025"]);
    expect(numbers("12:30 · 40% · +3 · v1.9")).toEqual(["12:30", "40%", "+3", "1.9"]);
  });

  it("drops sentence punctuation off the end of a number", () => {
    expect(numbers("in 2024. Then 3, then 4")).toEqual(["2024", "3", "4"]);
  });

  it("leaves short codes as lettering", () => {
    expect(numbers("SS1 · 01A · S3 · 4K · GT1")).toEqual([]);
  });

  it("returns one lettering part when there is no number", () => {
    expect(splitNumerals("World Map")).toEqual([{ text: "World Map", numeric: false }]);
  });
});
