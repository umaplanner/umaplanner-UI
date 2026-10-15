import { Link } from "react-router";
import { routes } from "../../app/routes";
import Changelog from "./Changelog";
import Features from "./Features";
import "../../styles/Home.css";

export default function Home() {
  return (
    <div className="homepage">
      <header className="homepage-heading">
        <h1>UmaPlanner</h1>
        <p>Tools for planning Uma Musume PvP teams and builds.</p>
      </header>
      <nav className="homepage-links" aria-label="UmaPlanner tools">
        <Link to={routes.planner}>Open planner</Link>
        <Link to={routes.overview}>View overview</Link>
      </nav>

      <div className="homepage-columns">
        <Features />
        <Changelog />
      </div>

    </div>
  );
}
