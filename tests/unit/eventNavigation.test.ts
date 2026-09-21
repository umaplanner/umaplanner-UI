import { describe, expect, it } from "vitest";
import {
  getAdjacentEvent,
  getRecentRaceEntries,
  sortRaceEntries,
} from "../../src/lib/eventNavigation";
import type { RaceEntry } from "../../src/types/RaceEntry";

const race = (eventTitle: string, releaseDate: string): RaceEntry => ({
  eventTitle,
  name: eventTitle,
  distanceType: "",
  groundType: "",
  racecourse: "",
  distance: 0,
  groundCondition: "",
  direction: "",
  season: "",
  weather: "",
  releaseDate,
  isConfirmed: true,
});

describe("event navigation", () => {
  const entries = sortRaceEntries([
    race("Old", "2026-06-01T00:00:00.000Z"),
    race("Current", "2026-08-20T00:00:00.000Z"),
    race("Future", "2026-10-01T00:00:00.000Z"),
  ]);

  it("keeps only events from the last calendar month and future events", () => {
    expect(
      getRecentRaceEntries(entries, new Date("2026-09-19T00:00:00.000Z")),
    ).toHaveLength(2);
  });

  it("navigates through all events, including hidden old events", () => {
    expect(getAdjacentEvent(entries, "Current", -1)).toBe("Old");
    expect(getAdjacentEvent(entries, "Old", 1)).toBe("Current");
  });
});
