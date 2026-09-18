import "../styles/HomePage.css";

export default function HomePage() {
  return (
    <section className="home-page">
      <div className="home-intro">
        <p className="home-eyebrow">Uma Musume PvP planning</p>
        <h1>Plan your PvP teams.</h1>
        <p className="home-description">
          UmaPlanner is a tool for planning teams for Champions Meeting and
          Legends of Heroes. Check the race conditions, choose your
          Umas, and save your plans in the planner.
        </p>
        <p className="home-note">
          Plans are currently saved locally in your browser.
        </p>
      </div>

      <div className="home-roadmap">
        <p className="home-eyebrow">Planned updates</p>
        <h2>Upcoming features</h2>
        <ul className="feature-list">
          <li>
            <span className="feature-icon" aria-hidden="true">01</span>
            <span>
              <strong>PvP Overview</strong>
              <span>See community team trends and the most popular Umas for each event.</span>
            </span>
          </li>
          <li>
            <span className="feature-icon" aria-hidden="true">02</span>
            <span>
              <strong>Account sync</strong>
              <span>Sign in with Discord and access your plans across devices.</span>
            </span>
          </li>
          <li>
            <span className="feature-icon" aria-hidden="true">03</span>
            <span>
              <strong>Sharing and privacy</strong>
              <span>Share plans with others, or keep them private and anonymous.</span>
            </span>
          </li>
          <li>
            <span className="feature-icon" aria-hidden="true">04</span>
            <span>
              <strong>Public stats and Discord tools</strong>
              <span>Compare Uma and support-card usage, with easier access through Discord.</span>
            </span>
          </li>
        </ul>
      </div>
    </section>
  );
}
