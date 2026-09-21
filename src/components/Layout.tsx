import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { NavLink } from "react-router";
import { ensureDataLoaded } from "../lib/data";
import { routes } from "../app/routes";
import EventSelector from "./EventSelector";
import UserMenu from "./UserMenu";

type LayoutProps = {
  children: ReactNode;
};

export default function Layout({children}: LayoutProps) {
  useEffect(() => {
    const fetchR2Data = async () => {
      try {
        await ensureDataLoaded();
      } catch (error) {
        console.error("Error fetching R2 data:", error);
      }
    };

    void fetchR2Data();
  }, []);

  return (
    <>
      <header className="site-header">
        <nav aria-label="Main navigation">
          <NavLink to="/">Home</NavLink>
          <NavLink to={routes.overview}>PvP Overview</NavLink>
          <NavLink to={routes.planner}>PvP Planner</NavLink>


          <EventSelector />
          <UserMenu />
        </nav>
      </header>

      <main className="site-main">{children}</main>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
