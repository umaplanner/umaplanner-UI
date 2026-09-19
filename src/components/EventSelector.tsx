import { useEffect, useState } from "react";
import { useEvent } from "../contexts/PvpEventContext";
import { config } from "../lib/config";
import {
  getAdjacentEvent,
  getRecentRaceEntries,
  sortRaceEntries,
} from "../lib/eventNavigation";
import type { RaceEntry } from "../types/RaceEntry";
import { IndexedDbRepository } from "./indexedDbRepository";

export default function EventSelector() {
  const { selectedEvent, setSelectedEvent } = useEvent();
  const [raceEntries, setRaceEntries] = useState<RaceEntry[]>([]);

  useEffect(() => {
    let cancelled = false;

    const fetchRaceEntries = async () => {
      try {
        const db = new IndexedDbRepository<RaceEntry>({
          databaseName: "RaceDB",
          version: 2,
          storeName: "races",
          keyPath: "eventTitle",
          indexes: [
            {
              name: "eventTitle",
              unique: true,
            },
          ],
        });

        const storedEntries = await db.getAll();

        if (cancelled) {
          return;
        }

        if (storedEntries.length > 0) {
          setRaceEntries(storedEntries as RaceEntry[]);
          console.log("Loaded race entries from IndexedDB");
          return;
        }

        const response = await fetch(`${config.apiBaseUrl}/races`);
        const data: RaceEntry[] = await response.json();

        await db.addMany(data);

        if (!cancelled) {
          setRaceEntries(data);
        }

        console.log("Fetched and stored race entries in IndexedDB");
      } catch (error) {
        console.error("Error fetching race entries:", error);
      }
    };

    void fetchRaceEntries();

    return () => {
      cancelled = true;
    };
  }, []);

  const sortedRaceEntries = sortRaceEntries(raceEntries);
  const recentRaceEntries = getRecentRaceEntries(sortedRaceEntries);
  const selectedRaceEntry = sortedRaceEntries.find(
    (entry) => entry.eventTitle === selectedEvent,
  );
  const selectableRaceEntries = selectedRaceEntry &&
    !recentRaceEntries.some(
      (entry) => entry.eventTitle === selectedRaceEntry.eventTitle,
    )
    ? [selectedRaceEntry, ...recentRaceEntries]
    : recentRaceEntries;
  const selectedIndex = sortedRaceEntries.findIndex(
    (entry) => entry.eventTitle === selectedEvent,
  );
  const previousEvent = getAdjacentEvent(sortedRaceEntries, selectedEvent, -1);
  const nextEvent = getAdjacentEvent(sortedRaceEntries, selectedEvent, 1);

  return (
    <div className="event-selector">
      <button
        type="button"
        className="event-navigation-button"
        aria-label="Previous event"
        title="Previous event"
        disabled={selectedIndex <= 0}
        onClick={() => {
          if (previousEvent) {
            setSelectedEvent(previousEvent);
          }
        }}
      >
        ←
      </button>
      <select
        id="event-select"
        value={selectedEvent}
        onChange={(event) => setSelectedEvent(event.target.value)}
      >
        <option value="" disabled>Select an Race</option>
        {selectableRaceEntries.map((entry) => (
          <option key={entry.eventTitle} value={entry.eventTitle}>
            {entry.eventTitle === "Monthly Match"
              ? entry.name
              : `${entry.eventTitle} - ${entry.name}`}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="event-navigation-button"
        aria-label="Next event"
        title="Next event"
        disabled={
          selectedIndex === -1 || selectedIndex >= sortedRaceEntries.length - 1
        }
        onClick={() => {
          if (nextEvent) {
            setSelectedEvent(nextEvent);
          }
        }}
      >
        →
      </button>
    </div>
  );
}
