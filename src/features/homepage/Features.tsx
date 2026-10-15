const features = [
  {
    title: "Event team planning",
    description:
      "Create and organize three-Uma teams for Champions Meeting and League of Heroes events.",
  },
  {
    title: "Build details",
    description:
      "Keep track of support cards, skills, stats, running styles, and inheritance for each Uma.",
  },
  {
    title: "Event overview",
    description:
      "Review common Umas, team compositions, running styles, support cards, and skills for an event.",
  },
  {
    title: "Saved builds and imports",
    description:
      "Save your builds locally and import existing Uma builds into the planner.",
  },
];

export default function Features() {
  return (
    <section className="homepage-panel homepage-features" aria-labelledby="features-title">
      <h2 id="features-title">Features</h2>
      <ul className="homepage-feature-list">
        {features.map((feature) => (
          <li key={feature.title} className="homepage-feature">
            <div className="homepage-feature__content">
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
