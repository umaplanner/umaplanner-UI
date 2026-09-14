import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { NavLink } from "react-router";
import { useEvent } from "../contexts/PvpEventContext";

type LayoutProps = {
  children: ReactNode;
};


interface RaceEntry {
  eventTitle: string;
  name: string;
  distanceType: string;
  racecourse: string;
  distance: number;
  condition: string;
  handed: string;
  season: string;
  releaseDate: string;
  isConfirmed: boolean;
}

export default function Layout({children}: LayoutProps) {
  const { selectedEvent, setSelectedEvent } = useEvent();
  const [raceEntries, setRaceEntries] = useState<RaceEntry[]>([]);

  useEffect(() => {
    const fetchRaceEntries = async () => {
      try {
        const response = await fetch('http://localhost:5063/races'); 
        const data: RaceEntry[] = await response.json();
        setRaceEntries(data);
      } catch (error) {
        console.error('Error fetching race entries:', error);
      }
    };

    fetchRaceEntries();
  }, []);

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedEvent(event.target.value);
  };

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
            {raceEntries.map((entry) => (
              <option key={entry.eventTitle} value={entry.eventTitle}>
                {entry.eventTitle} - {entry.name}
              </option>
            ))}
          </select>
        </nav>
      </header>

      <main className="site-main">{children}</main>
    </>
  );
}
