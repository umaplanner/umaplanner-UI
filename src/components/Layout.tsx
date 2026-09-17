import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { NavLink } from "react-router";
import { useEvent } from "../contexts/PvpEventContext";
import { ensureDataLoaded } from "../lib/data";
import type { RaceEntry } from "../types/RaceEntry";
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
            version: 1,
            storeName: "races",
            keyPath: "eventTitle",
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

        const response = await fetch("http://localhost:5063/races");
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

  const sortedRaceEntries = raceEntries
    .filter(
      (entry): entry is RaceEntry & { releaseDate: string } =>
        entry.releaseDate !== null,
    )
    .sort(
      (a, b) =>
        new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime(),
    );

  return (
    <>
      <header className="site-header">
        <nav aria-label="Main navigation">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/pvp-overview">PvP Overview</NavLink>
          <NavLink to="/pvp-planner">PvP Planner</NavLink>


          <select
            id="event-select"
            value={selectedEvent}
            onChange={handleSelectChange}
          >
            <option value="" disabled>Select an Race</option>
            {sortedRaceEntries.map((entry) => (
              <option key={entry.eventTitle} value={entry.eventTitle}>
                {entry.eventTitle === "Monthly Match"
                  ? entry.name
                  : `${entry.eventTitle} - ${entry.name}`}
              </option>
            ))}
          </select>
        </nav>
      </header>

      <main className="site-main">{children}</main>
    </>
  );
}
