import type {
  TeamRaceResultRow,
  TeamResultRound,
  TeamResults,
  TeamTicket,
  TeamTicketBuildResults,
  TeamTicketCount,
  TeamResultRow,
} from "../../../features/planner/plannerTypes";
import type { StoredUmaBuild } from "../../../types/UmaBuild";
import type { UmaEntry } from "../../../types/UmaEntry";
import UmaImage from "../../UmaImage";
import type {
  ResolvedTicketBuildResult,
  ResultGroup,
  TicketEditor,
} from "./types";
import { formatResultOpeningDate, formatWinRate } from "./utils";

interface Props {
  group: ResultGroup;
  results: TeamResults;
  ticketBuildResults: TeamTicketBuildResults;
  ticketCounts: Record<TeamResultRow, TeamTicketCount>;
  resultAvailability: Record<TeamResultRow, boolean>;
  resultOpeningDates?: Record<TeamResultRow, Date | null>;
  collapsed: boolean;
  excluded: boolean;
  umaList: UmaEntry[];
  onToggleRoundExcluded: (round: TeamResultRound, excluded: boolean) => void;
  onToggleCollapsed: (title: ResultGroup["title"]) => void;
  onEditTicket: (editor: TicketEditor) => void;
  onRemoveTicket: (row: TeamRaceResultRow, ticket: TeamTicket) => void;
  getTicketBuildResults: (
    row: TeamRaceResultRow,
    ticket: TeamTicket,
  ) => ResolvedTicketBuildResult[];
  getBuild: (buildId: string | null) => StoredUmaBuild | undefined;
}

export default function Group({
  group,
  results,
  ticketBuildResults,
  ticketCounts,
  resultAvailability,
  resultOpeningDates,
  collapsed,
  excluded,
  umaList,
  onToggleRoundExcluded,
  onToggleCollapsed,
  onEditTicket,
  onRemoveTicket,
  getTicketBuildResults,
  getBuild,
}: Props) {
  const { title, round } = group;

  return (
    <section
      className="uma-build-results__group"
      aria-labelledby={`results-${title.replace(" ", "-").toLowerCase()}`}
    >
      <div className="uma-build-results__group-heading">
        <h2 id={`results-${title.replace(" ", "-").toLowerCase()}`}>{title}</h2>
        <label className="uma-build-results__exclude">
          <input
            type="checkbox"
            aria-label={`Exclude ${title}`}
            checked={excluded}
            onChange={(event) => onToggleRoundExcluded(round, event.target.checked)}
          />
          exclude
        </label>
        <button
          className="uma-build-results__collapse"
          type="button"
          aria-label={`${collapsed ? "Expand" : "Collapse"} ${title}`}
          aria-expanded={!collapsed}
          onClick={() => onToggleCollapsed(title)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d={collapsed ? "m6 14 6-6 6 6" : "m6 10 6 6 6-6"} />
          </svg>
        </button>
      </div>
      {!excluded && !collapsed ? (
        <div className="uma-build-results__days">
          {group.rows.map(({ row, label }) => {
            const count = ticketCounts[row];
            const counts = results[row];
            if (!counts) return null;
            const wins = counts
              .slice(0, count)
              .reduce((total, ticketWins) => total + ticketWins, 0);
            const winRate = count > 0
              ? (wins / (count * 5)) * 100
              : null;
            const openingDate = resultOpeningDates?.[row] ?? null;
            const headingId = `results-${row.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;

            return (
              <section
                className="uma-build-results__day"
                key={row}
                aria-labelledby={headingId}
              >
                <div className="uma-build-results__day-heading">
                  <div>
                    <h3 id={headingId}>{label}</h3>
                    {!resultAvailability[row] ? (
                      <p className="uma-build-results__availability" role="status">
                        {openingDate
                          ? `Available at ${formatResultOpeningDate(openingDate)}`
                          : "Not available yet"}
                      </p>
                    ) : null}
                  </div>
                  <p
                    className="uma-build-results__rate"
                    aria-label={`${title} ${label} win rate`}
                  >
                    {winRate === null
                      ? "—"
                      : `${formatWinRate(winRate)}% (${wins}/${count * 5})`}
                  </p>
                </div>
                <div className="uma-build-results__ticket-list">
                  {Array.from({ length: count }, (_, index) => {
                    const ticket = (index + 1) as TeamTicket;
                    const builds = getTicketBuildResults(row, ticket);
                    const teamWinsOnly =
                      ticketBuildResults[row]?.[ticket]?.length === 0;
                    const hasPerBuildWins =
                      !teamWinsOnly && builds.length > 0 &&
                      builds.every((build) => build.wins !== null);
                    const totalTicketWins = hasPerBuildWins
                      ? builds.reduce((total, build) => total + (build.wins ?? 0), 0)
                      : counts[ticket - 1];
                    return (
                      <article
                        className="uma-build-results__ticket-card"
                        key={ticket}
                        aria-label={`Ticket ${ticket}`}
                      >
                        <div className="uma-build-results__ticket-card-heading">
                          <strong>Ticket {ticket}</strong>
                          <div className="uma-build-results__ticket-card-actions">
                            <button
                              className="uma-build-results__details"
                              type="button"
                              onClick={() =>
                                onEditTicket({ row, groupTitle: title, label, ticket })}
                            >
                              Edit
                            </button>
                            <button
                              className="uma-build-results__ticket-remove"
                              type="button"
                              aria-label={`Remove Ticket ${ticket}`}
                              onClick={() => onRemoveTicket(row, ticket)}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        {builds.length > 0 ? (
                          <ul>
                            {builds.map((ticketBuild) => {
                              const build = getBuild(ticketBuild.buildId);
                              const uma = build
                                ? umaList.find(
                                    (entry) => String(entry.id) === build.outfitId,
                                  )
                                : undefined;
                              return (
                                <li key={`${ticketBuild.slot}:${ticketBuild.buildId}`}>
                                  {uma ? (
                                    <UmaImage
                                      className="uma-build-results__ticket-image"
                                      uma={uma}
                                      alt=""
                                    />
                                  ) : null}
                                  <span>
                                    <strong>
                                      {build?.name || `Uma ${ticketBuild.slot}`}
                                    </strong>
                                    <small>
                                      {teamWinsOnly
                                        ? "Wins N/A"
                                        : `${ticketBuild.wins ?? 0} ${(ticketBuild.wins ?? 0) === 1 ? "win" : "wins"}`}
                                    </small>
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p>
                            {teamWinsOnly
                              ? "Build lineup not recorded."
                              : "No builds recorded."}
                          </p>
                        )}
                        <p>Team wins: {totalTicketWins}/5</p>
                      </article>
                    );
                  })}
                  {count < 4 ? (
                    <button
                      className="uma-build-results__add-ticket"
                      type="button"
                      disabled={!resultAvailability[row]}
                      title={!resultAvailability[row]
                        ? "Tickets can be added starting on this result day."
                        : undefined}
                      onClick={() =>
                        onEditTicket({ row, groupTitle: title, label, ticket: null })}
                    >
                      Add ticket
                    </button>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
