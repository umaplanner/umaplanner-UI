import type { RaceEntry } from "../types/RaceEntry";

export type DatedRaceEntry = RaceEntry & { releaseDate: string };

export function sortRaceEntries(entries: RaceEntry[]): DatedRaceEntry[] {
  return [...entries]
    .filter(
      (entry): entry is DatedRaceEntry => entry.releaseDate !== null,
    )
    .sort(
      (a, b) =>
        new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime(),
    );
}

export function getRecentRaceEntries(
  entries: DatedRaceEntry[],
  now = new Date(),
): DatedRaceEntry[] {
  const oneMonthAgo = new Date(now);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  return entries.filter(
    (entry) => new Date(entry.releaseDate).getTime() >= oneMonthAgo.getTime(),
  );
}

export function getAdjacentEvent(
  entries: DatedRaceEntry[],
  selectedEvent: string,
  direction: -1 | 1,
): string | undefined {
  if (entries.length === 0) {
    return undefined;
  }

  const selectedIndex = entries.findIndex(
    (entry) => entry.eventTitle === selectedEvent,
  );
  const nextIndex =
    selectedIndex === -1
      ? direction === 1
        ? 0
        : entries.length - 1
      : selectedIndex + direction;

  return entries[nextIndex]?.eventTitle;
}
