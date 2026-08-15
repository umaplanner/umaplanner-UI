import type { ReactNode } from "react";
import { NavLink } from "react-router";

type LayoutProps = {
  children: ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  return (
    <>
      <header className="site-header">
        <nav aria-label="Main navigation">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/pvp-overview">PvP Overview</NavLink>
          <NavLink to="/pvp-planner">PvP Planner</NavLink>
        </nav>
      </header>

      <main className="site-main">{children}</main>
    </>
  );
}
