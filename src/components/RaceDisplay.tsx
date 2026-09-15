import type { RaceEntry } from "../types/RaceEntry";
import "../styles/RaceDisplay.css";

interface RaceDisplayProps {
  raceEntry?: RaceEntry;
}

export default function RaceDisplay({ raceEntry }: RaceDisplayProps) {
  if (!raceEntry || raceEntry.releaseDate === null) {
    return null;
  }

  const releaseDate = new Date(raceEntry.releaseDate);

  const day = releaseDate.getDate();
  const month = releaseDate.toLocaleDateString("en-GB", {
    month: "short",
  });
  const year = releaseDate.getFullYear();

  const dateStatus = raceEntry.isConfirmed
    ? "Official"
    : "Estimated";

  return (
    <article className="race-card">
      <header className="race-card__header">
        <div>
          <span className="race-card__number">
            {raceEntry.eventTitle}
          </span>

          <h1 className="race-card__title">
            {raceEntry.name}
          </h1>
        </div>

        <div className="race-card__tags">
          <div
            className={`race-card__date ${
              raceEntry.isConfirmed
                ? "race-card__date--official"
                : "race-card__date--estimated"
            }`}
          >
            <span className="race-card__date-status">
              {dateStatus}
            </span>

            <div className="race-card__date-value">
              <span className="race-card__date-day">
                {day}
              </span>

              <span className="race-card__date-month">
                {month}
              </span>

              <span className="race-card__date-year">
                {year}
              </span>
            </div>
          </div>
        </div>
      </header>

      <section className="race-card__details">
        <div>
          <span className="race-card__label">Racecourse</span>
          <span>{raceEntry.racecourse}</span>
        </div>

        <div>
          <span className="race-card__label">Type</span>
          <span>{raceEntry.groundType}</span>
        </div>
        
        <div>
          <span className="race-card__label">Distance</span>
          <span>{raceEntry.distanceType}</span>
        </div>

        <div>
          <span className="race-card__label">Distance</span>
          <span>{raceEntry.distance}m</span>
        </div>

        <div>
          <span className="race-card__label">Direction</span>
          <span>{raceEntry.direction}</span>
        </div>

        <div>
          <span className="race-card__label">Ground</span>
          <span>{raceEntry.groundCondition}</span>
        </div>

        <div>
          <span className="race-card__label">Weather</span>
          <span>{raceEntry.weather}</span>
        </div>

        <div>
          <span className="race-card__label">Season</span>
          <span>{raceEntry.season}</span>
        </div>
      </section>
    </article>
  );
}
