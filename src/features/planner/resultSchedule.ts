import type { RaceEntry } from "../../types/RaceEntry";
import type { TeamResultRow } from "./plannerTypes";

export const resultDayOffsets: Record<TeamResultRow, number> = {
  round1Day1: 3,
  round1Day2: 4,
  round2Day1: 5,
  round2Day2: 6,
  finals: 7,
};

export function getResultOpenAt(
  raceEntry: RaceEntry | undefined,
  row: TeamResultRow,
): Date | null {
  if (!raceEntry?.isConfirmed || !raceEntry.releaseDate) return null;

  const startDate = new Date(raceEntry.releaseDate);
  if (Number.isNaN(startDate.getTime())) return null;

  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() + resultDayOffsets[row]);
  return startDate;
}

export function getResultOpeningDates(
  raceEntry: RaceEntry | undefined,
): Record<TeamResultRow, Date | null> {
  return Object.fromEntries(
    (Object.keys(resultDayOffsets) as TeamResultRow[]).map((row) => [
      row,
      getResultOpenAt(raceEntry, row),
    ]),
  ) as Record<TeamResultRow, Date | null>;
}

export function getResultAvailability(
  raceEntry: RaceEntry | undefined,
  now = new Date(),
): Record<TeamResultRow, boolean> {
  const openingDates = getResultOpeningDates(raceEntry);
  return Object.fromEntries(
    (Object.keys(openingDates) as TeamResultRow[]).map((row) => [
      row,
      (openingDates[row]?.getTime() ?? Infinity) <= now.getTime(),
    ]),
  ) as Record<TeamResultRow, boolean>;
}

export function getNextResultOpeningAt(
  raceEntry: RaceEntry | undefined,
  now = new Date(),
): Date | null {
  const upcoming = Object.values(getResultOpeningDates(raceEntry))
    .filter((date): date is Date => date !== null && date.getTime() > now.getTime())
    .sort((left, right) => left.getTime() - right.getTime());

  return upcoming[0] ?? null;
}
