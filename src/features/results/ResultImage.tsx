import { forwardRef } from "react";
import type {
  TeamFinalPlacement,
  TeamRaceResultRow,
  TeamTicket,
  TeamUmaPlacement,
} from "../planner/plannerTypes";
import type { UmaEntry } from "../../types/UmaEntry";
import BrandedImage from "../../components/image/BrandedImage";
import { formatUmaPlacement, formatWinRate } from "./utils";
import UmaImage from "../../components/UmaImage";
import "../../styles/ResultImage.css";

export interface ResultImageBuild {
  id: string;
  slot: 1 | 2 | 3;
  name: string;
  uma: UmaEntry | null;
}

export interface ResultImageDayBuild extends ResultImageBuild {
  wins: number;
  raceCount: number;
  winRate: number | null;
  ticketNumbers: TeamTicket[];
  hasCompleteWinData: boolean;
}

export interface ResultImageDay {
  row: TeamRaceResultRow;
  round: "Round 1" | "Round 2";
  label: string;
  wins: number;
  ticketCount: number;
  winRate: number;
  tickets: {
    number: TeamTicket;
    wins: number;
  }[];
  builds: ResultImageDayBuild[];
}

export interface ResultImageSummary {
  totalWins: number;
  totalRaces: number;
  totalWinRate: number | null;
  finalPlacement: TeamFinalPlacement | null;
  finalsBuilds: (ResultImageBuild & { placement: TeamUmaPlacement | null })[];
  builds: (ResultImageBuild & {
    wins: number;
    raceCount: number;
  })[];
}

interface Props {
  event: string;
  days: ResultImageDay[];
  summary?: ResultImageSummary;
}

function formatRate(rate: number | null) {
  return rate === null ? "—" : `${formatWinRate(rate)}%`;
}

function ordinalPlacement(placement: TeamFinalPlacement) {
  return formatUmaPlacement(placement);
}

function BuildPortrait({ build, className = "" }: {
  build: ResultImageBuild;
  className?: string;
}) {
  return (
    <div className={`result-image__portrait ${className}`}>
      {build.uma ? (
        <UmaImage
          uma={build.uma}
          alt={build.uma.outfitTitle}
        />
      ) : (
        <span aria-hidden="true">U{build.slot}</span>
      )}
    </div>
  );
}

const ResultImage = forwardRef<HTMLElement, Props>(
  function ResultImage({
    event,
    days,
    summary,
  }, ref) {
    const visibleBuildCount = summary
      ? Math.max(summary.builds.length, summary.finalsBuilds.length)
      : Math.max(0, ...days.map((day) => day.builds.length));
    const buildColumns = Math.max(1, Math.min(3, visibleBuildCount));
    const imageWidth = Math.ceil(68 + buildColumns * 176 + (buildColumns - 1) * 6.4);

    return (
      <BrandedImage
        ref={ref}
        event={event}
        width={imageWidth}
      >
        {summary ? (
          <section className="result-image__summary">
            <div className="result-image__metrics">
              <div className={`result-image__metric result-image__metric--placement${summary.finalPlacement
                ? ` result-image__metric--placement-${summary.finalPlacement}`
                : ""}`}>
                <span>FINALS PLACE</span>
                <strong>{summary.finalPlacement
                  ? ordinalPlacement(summary.finalPlacement)
                  : "—"}</strong>
              </div>
              <div className="result-image__metric">
                <span>TOTAL WINS</span>
                <strong>{summary.totalWins}<small> / {summary.totalRaces}</small></strong>
              </div>
              <div className="result-image__metric">
                <span>TEAM WIN RATE</span>
                <strong>{formatRate(summary.totalWinRate)}</strong>
              </div>
            </div>

            {summary.finalsBuilds.length > 0 ? (
              <section className="result-image__lineup">
                <header>
                  <h2>Finals lineup</h2>
                </header>
                <div className="result-image__final-builds">
                  {summary.finalsBuilds.map((build) => (
                    <article
                      className={`result-image__final-build${build.placement === 1
                        ? " result-image__final-build--winner"
                        : ""}`}
                      key={build.slot}
                    >
                      <BuildPortrait
                        build={build}
                        className="result-image__portrait--final"
                      />
                      <div>
                        <span>UMA {build.slot}</span>
                        <strong>{build.name}</strong>
                        <small>
                          {build.placement === null
                            ? "Placement not recorded"
                            : `${formatUmaPlacement(build.placement)} place`}
                        </small>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {summary.builds.length > 0 ? (
              <section className="result-image__build-performance">
                <header>
                  <h2>Build performance</h2>
                </header>
                <div
                  className="result-image__build-grid"
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(3, summary.builds.length)}, 11rem)`,
                  }}
                >
                  {summary.builds.map((build) => (
                    <article className="result-image__build-stat" key={build.id}>
                      <BuildPortrait build={build} />
                      <div>
                        <strong>{build.name}</strong>
                        <span>
                          {formatRate(build.raceCount > 0
                            ? (build.wins / build.raceCount) * 100
                            : null)} WR
                        </span>
                        <small>{build.wins}/{build.raceCount} wins</small>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </section>
        ) : null}

        {days.length > 0 ? (
          <section className="result-image__days">
            {days.map((day) => (
              <section
                className={`result-image__day${days.length === 1 ? " result-image__day--single" : ""}`}
                key={day.row}
              >
                <header className="result-image__day-heading">
                  <div>
                    <span>{day.round}</span>
                    <h2>{day.label}</h2>
                  </div>
                  <div className="result-image__ticket-wins">
                    <span>TICKETS</span>
                    <div>
                      {day.tickets.map((ticket) => (
                        <span key={ticket.number}>
                          T{ticket.number} <strong>{ticket.wins}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="result-image__day-total">
                    <strong>{formatRate(day.winRate)}</strong>
                    <span>WIN RATE</span>
                  </div>
                  <div className="result-image__day-total">
                    <strong>{day.wins}<small> / {day.ticketCount * 5}</small></strong>
                    <span>WINS</span>
                  </div>
                </header>
                {day.builds.length > 0 ? (
                  <section className="result-image__day-builds">
                    <div
                      className="result-image__day-build-grid"
                      style={{
                        gridTemplateColumns: `repeat(${Math.min(3, day.builds.length)}, 11rem)`,
                      }}
                    >
                      {day.builds.map((build) => (
                        <article className="result-image__day-build" key={build.id}>
                          <BuildPortrait build={build} />
                          <div>
                            <strong>{build.name}</strong>
                            <span>
                              {formatRate(build.winRate)} WR
                              {build.hasCompleteWinData ? "" : " · INCOMPLETE"}
                            </span>
                            <small>
                              {build.hasCompleteWinData
                                ? `${build.wins}/${build.raceCount} wins`
                                : "Wins not recorded on all tickets"}
                              {" · "}
                              Tickets {build.ticketNumbers.join(", ")}
                            </small>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null}
              </section>
            ))}
          </section>
        ) : null}
      </BrandedImage>
    );
  },
);

export default ResultImage;
