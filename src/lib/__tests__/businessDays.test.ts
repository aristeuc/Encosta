import { describe, expect, it } from "vitest";
import { addBusinessDays, businessDaysBetween, isBusinessDay } from "../businessDays";

const holidays = new Set(["2026-08-15"]);

describe("businessDays", () => {
  it("skips weekends when adding business days", () => {
    // 2026-08-03 is a Monday
    const start = new Date("2026-08-03T00:00:00Z");
    const result = addBusinessDays(start, 14, holidays);
    expect(result.toISOString().slice(0, 10)).toBe("2026-08-21");
  });

  it("treats a holiday as a non-business day", () => {
    expect(isBusinessDay(new Date("2026-08-15T00:00:00Z"), holidays)).toBe(false);
    expect(isBusinessDay(new Date("2026-08-14T00:00:00Z"), holidays)).toBe(true);
  });

  it("returns 0 for businessDaysBetween when dates are equal", () => {
    const d = new Date("2026-08-03T00:00:00Z");
    expect(businessDaysBetween(d, d, holidays)).toBe(0);
  });

  it("counts business days between two dates matching addBusinessDays", () => {
    const start = new Date("2026-08-03T00:00:00Z");
    const end = addBusinessDays(start, 10, holidays);
    expect(businessDaysBetween(start, end, holidays)).toBe(10);
  });
});
