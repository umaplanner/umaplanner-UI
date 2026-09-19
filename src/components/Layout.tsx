import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { NavLink } from "react-router";
import { useEvent } from "../contexts/PvpEventContext";
import { config } from "../lib/config";
import { ensureDataLoaded } from "../lib/data";
import {
  getAdjacentEvent,
  getRecentRaceEntries,
  sortRaceEntries,
} from "../lib/eventNavigation";
import type { RaceEntry } from "../types/RaceEntry";
import { routes } from "../app/routes";
import { IndexedDbRepository } from "./indexedDbRepository";

type LayoutProps = {
  children: ReactNode;
};

export default function Layout({children}: LayoutProps) {
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

    const fetchR2Data = async () => {
      try {
        await ensureDataLoaded();
      } catch (error) {
        console.error("Error fetching R2 data:", error);
      }
    };

    void fetchRaceEntries();
    void fetchR2Data();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedEvent(event.target.value);
  };

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
    <>
      <header className="site-header">
        <nav aria-label="Main navigation">
          <NavLink to="/">Home</NavLink>
          <NavLink to={routes.overview}>PvP Overview</NavLink>
          <NavLink to={routes.planner}>PvP Planner</NavLink>


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
              onChange={handleSelectChange}
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
        </nav>
      </header>

      <main className="site-main">{children}</main>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
