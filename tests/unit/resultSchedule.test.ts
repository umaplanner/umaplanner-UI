import { describe, expect, it } from "vitest";
import {
  getNextResultOpeningAt,
  getResultAvailability,
  getResultOpenAt,
  resultDayOffsets,
} from "../../src/features/planner/resultSchedule";
import type { RaceEntry } from "../../src/types/RaceEntry";

const raceEntry: RaceEntry = {
  eventTitle: "CM 42",
  name: "Champions Meeting",
  distanceType: "",
  groundType: "",
  racecourse: "",
  distance: 0,
  groundCondition: "",
  direction: "",
  season: "",
  weather: "",
  releaseDate: "2026-09-01T00:00:00.000Z",
  isConfirmed: true,
};

describe("result schedule", () => {
  it("opens each result on the configured day after the official start date", () => {
    const startDate = new Date(2026, 8, 1);
    const rows = Object.keys(resultDayOffsets) as (keyof typeof resultDayOffsets)[];

    for (const row of rows) {
      const expected = new Date(startDate);
      expected.setDate(expected.getDate() + resultDayOffsets[row]);
      expect(getResultOpenAt(raceEntry, row)).toEqual(expected);
      expect(getResultAvailability(raceEntry, expected)[row]).toBe(true);
    }
  });

  it("keeps results closed until their opening day and advances the next opening", () => {
    const beforeRound1Day1 = new Date(2026, 8, 3, 23, 59);
    const round1Day1 = new Date(2026, 8, 4);
    expect(getResultAvailability(raceEntry, beforeRound1Day1)).toMatchObject({
      round1Day1: false,
      round1Day2: false,
      round2Day1: false,
      round2Day2: false,
      finals: false,
    });
    expect(getResultAvailability(raceEntry, round1Day1).round1Day1).toBe(true);
    expect(getNextResultOpeningAt(raceEntry, round1Day1)?.getDate()).toBe(5);
  });

  it("requires a confirmed official start date", () => {
    expect(getResultAvailability(undefined).round1Day1).toBe(false);
    expect(
      getResultAvailability({ ...raceEntry, isConfirmed: false }).round1Day1,
    ).toBe(false);
    expect(getResultOpenAt({ ...raceEntry, releaseDate: "invalid" }, "finals"))
      .toBeNull();
  });

  it("returns no next opening once every result day has passed", () => {
    expect(getNextResultOpeningAt(raceEntry, new Date(2026, 8, 10))).toBeNull();
  });
});
