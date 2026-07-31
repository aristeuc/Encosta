import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { computeSchedule, type CpmActivityInput } from "../cpm";

describe("computeSchedule — basic chain", () => {
  it("computes sequential dates for a simple 2-activity chain", () => {
    const activities: CpmActivityInput[] = [
      { code: "A", durationDays: 15, predecessorCodes: [], lagDays: 0 },
      { code: "B", durationDays: 60, predecessorCodes: ["A"], lagDays: 0 },
    ];
    const start = new Date("2026-08-03T00:00:00Z");
    const holidays = [new Date("2026-08-15T00:00:00Z")];
    const result = computeSchedule(activities, start, holidays);

    expect(result.errors).toHaveLength(0);
    expect(result.activities.A.plannedEnd.toISOString().slice(0, 10)).toBe("2026-08-21");
    expect(result.activities.B.plannedStart.toISOString().slice(0, 10)).toBe("2026-08-24");
    expect(result.activities.B.plannedEnd.toISOString().slice(0, 10)).toBe("2026-11-13");
  });

  it("flags unknown predecessors as errors instead of crashing", () => {
    const activities: CpmActivityInput[] = [
      { code: "A", durationDays: 5, predecessorCodes: ["DOES_NOT_EXIST"], lagDays: 0 },
    ];
    const result = computeSchedule(activities, new Date("2026-08-03T00:00:00Z"), []);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("marks a single-chain activity as critical (zero float)", () => {
    const activities: CpmActivityInput[] = [
      { code: "A", durationDays: 5, predecessorCodes: [], lagDays: 0 },
      { code: "B", durationDays: 5, predecessorCodes: ["A"], lagDays: 0 },
    ];
    const result = computeSchedule(activities, new Date("2026-08-03T00:00:00Z"), []);
    expect(result.activities.A.isCritical).toBe(true);
    expect(result.activities.B.isCritical).toBe(true);
    expect(result.activities.A.totalFloatDays).toBe(0);
  });

  it("gives float to a shorter parallel branch", () => {
    // A -> B (60 days) and A -> C (5 days), both feeding D. C should have float.
    const activities: CpmActivityInput[] = [
      { code: "A", durationDays: 5, predecessorCodes: [], lagDays: 0 },
      { code: "B", durationDays: 60, predecessorCodes: ["A"], lagDays: 0 },
      { code: "C", durationDays: 5, predecessorCodes: ["A"], lagDays: 0 },
      { code: "D", durationDays: 5, predecessorCodes: ["B", "C"], lagDays: 0 },
    ];
    const result = computeSchedule(activities, new Date("2026-08-03T00:00:00Z"), []);
    expect(result.activities.B.isCritical).toBe(true);
    expect(result.activities.C.isCritical).toBe(false);
    expect(result.activities.C.totalFloatDays).toBeGreaterThan(0);
  });

  it("computes deviation days once actualEnd is set", () => {
    const activities: CpmActivityInput[] = [
      {
        code: "A",
        durationDays: 5,
        predecessorCodes: [],
        lagDays: 0,
        actualStart: new Date("2026-08-03T00:00:00Z"),
        actualEnd: new Date("2026-08-12T00:00:00Z"), // 3 calendar days later than planned finish (08-07 -> 08-10ish)
      },
    ];
    const result = computeSchedule(activities, new Date("2026-08-03T00:00:00Z"), []);
    expect(result.activities.A.status).toBe("CONCLUIDO");
    expect(result.activities.A.deviationDays).not.toBeNull();
  });
});

describe("computeSchedule — full real-world flow (Loteamento -> Escritura)", () => {
  const fixturePath = path.join(__dirname, "../../../prisma/seed-data/fluxo-obra-padrao.json");
  const fixture = JSON.parse(readFileSync(fixturePath, "utf-8")) as {
    activities: Array<{
      code: string;
      durationDays: number;
      predecessorCodes: string[];
      lagDays: number;
    }>;
  };

  it("matches the spreadsheet's known summary dates for the sample project", () => {
    const activities: CpmActivityInput[] = fixture.activities.map((a) => ({
      code: a.code,
      durationDays: a.durationDays,
      predecessorCodes: a.predecessorCodes,
      lagDays: a.lagDays,
    }));

    const holidays = [
      "2026-08-15", "2026-10-05", "2026-11-01", "2026-12-01", "2026-12-08", "2026-12-25",
      "2027-01-01", "2027-02-09", "2027-03-26", "2027-03-28", "2027-04-25", "2027-05-01",
      "2027-05-27", "2027-06-10", "2027-08-15", "2027-10-05", "2027-11-01", "2027-12-01",
      "2027-12-08", "2027-12-25",
      "2028-01-01", "2028-02-29", "2028-04-14", "2028-04-16", "2028-04-25", "2028-05-01",
      "2028-06-15", "2028-06-10", "2028-08-15", "2028-10-05", "2028-11-01", "2028-12-01",
      "2028-12-08", "2028-12-25",
    ].map((d) => new Date(`${d}T00:00:00Z`));

    const result = computeSchedule(activities, new Date("2026-08-03T00:00:00Z"), holidays);

    expect(result.errors).toHaveLength(0);
    // T07 = "Emissão da licença de utilização" — spreadsheet says 2029-01-25
    expect(result.activities.T07.plannedEnd.toISOString().slice(0, 10)).toBe("2029-01-25");
    // E03 = "Marcação e realização da escritura" — spreadsheet says 2029-06-14
    expect(result.activities.E03.plannedEnd.toISOString().slice(0, 10)).toBe("2029-06-14");
    // Overall flow end — spreadsheet says 2029-06-21
    expect(result.projectEnd?.toISOString().slice(0, 10)).toBe("2029-06-21");

    const criticalCount = Object.values(result.activities).filter((a) => a.isCritical).length;
    expect(criticalCount).toBe(21);
  });
});
