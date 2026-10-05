import "../styles/HomePage.css";

export default function HomePage() {
  return (
    <section className="home-page">
      <div className="home-intro">
        <p className="home-eyebrow">UmaMusume planning</p>
        <h1>Plan your teams.</h1>
        <p className="home-description">
          UmaPlanner is a tool for planning teams for Champions Meeting and
          Legends of Heroes. Check the race conditions, choose your
          Umas, and save your plans in the planner.
        </p>
        <p className="home-note">
          Plans are saved locally in your browser. <br />
          If you want to access your plans across devices, sign in with Discord to sync your plans.
        </p>
      </div>

      <div className="home-roadmap">
        <p className="home-eyebrow">In progress or planned updates</p>
        <h2>Upcoming features</h2>
        <ul className="feature-list">
          <li>
            <span className="feature-icon" aria-hidden="true">01</span>
            <span>
              <strong>Overview</strong>
              <span>See community team trends and the most popular Umas for each event.</span>
            </span>
          </li>
          <li>
            <span className="feature-icon" aria-hidden="true">02</span>
            <span>
              <strong>Plans</strong>
              <span>A simplified "editor" for simple plans without needing builds</span>
            </span>
          </li>
          <li>
            <span className="feature-icon" aria-hidden="true">03</span>
            <span>
              <strong>Inherits</strong>
              <span>
                Have a separate section for parents either for specific events or for general styles/distances.
              </span>
            </span>
          </li>
          {/* <li> */}
          {/*   <span className="feature-icon" aria-hidden="true">04</span> */}
          {/*   <span> */}
          {/*     <strong>Potentially a Discord bot (Probably not)</strong> */}
          {/*     <span>Option for using discord as a way to access the overview/builds</span> */}
          {/*   </span> */}
          {/* </li> */}
        </ul>
      </div>
    </section>
  );
}
