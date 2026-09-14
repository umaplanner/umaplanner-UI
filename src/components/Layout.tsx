import type { ReactNode } from "react";
import { NavLink } from "react-router";
import { useEvent } from "../contexts/PvpEventContext";

type LayoutProps = {
  children: ReactNode;
};

export default function Layout({children}: LayoutProps) {
  const { selectedEvent, setSelectedEvent } = useEvent();

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
            onChange={(event) => setSelectedEvent(event.target.value)}
          >
            <option>Select an event</option>
            <option value="cm18">CM18</option>
            <option value="cm19">CM19</option>
            <option value="cm20">CM20</option>
          </select>
        </nav>
      </header>

      <main className="site-main">{children}</main>
    </>
  );
}
