const changelog = [
  {
    date: "October 2026",
    change: "Added a dedicated homepage with project features and navigation.",
  },
  {
    date: "September 2026",
    change: "Added saved build results and Uma build imports.",
  },
  {
    date: "August 2026",
    change: "Added event-aware team planning with local persistence.",
  },
];

export default function Changelog() {
  return (
    <section className="homepage-panel homepage-changelog" aria-labelledby="changelog-title">
      <h2 id="changelog-title">Changelog</h2>
      <ol className="homepage-changelog-list">
        {changelog.map((entry) => (
          <li key={entry.date}>
            <time>{entry.date}</time>
            <p>{entry.change}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
