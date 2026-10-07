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

interface Props {
  group: ResultGroup;
  results: TeamResults;
  ticketBuildResults: TeamTicketBuildResults;
  ticketCounts: Record<TeamResultRow, TeamTicketCount>;
  resultAvailability: Record<TeamResultRow, boolean>;
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
        <div className="uma-build-results__table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col">Tickets</th>
                <th scope="col">Win rate</th>
              </tr>
            </thead>
            <tbody>
              {group.rows.map(({ row, label }) => {
                const count = ticketCounts[row];
                const counts = results[row];
                if (!counts) return null;
                const wins = counts
                  .slice(0, count)
                  .reduce((total, ticketWins) => total + ticketWins, 0);
                const winRate = count > 0
                  ? Math.round((wins / (count * 5)) * 100)
                  : null;

                return (
                  <tr key={row}>
                    <th scope="row">{label}</th>
                    <td>
                      <div className="uma-build-results__ticket-list">
                        {Array.from({ length: count }, (_, index) => {
                          const ticket = (index + 1) as TeamTicket;
                          const builds = getTicketBuildResults(row, ticket);
                          const teamWinsOnly =
                            ticketBuildResults[row]?.[ticket]?.length === 0;
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
                                      <li
                                        key={`${ticketBuild.slot}:${ticketBuild.buildId}`}
                                      >
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
                                            {ticketBuild.wins ?? 0}{" "}
                                            {(ticketBuild.wins ?? 0) === 1 ? "win" : "wins"}
                                          </small>
                                        </span>
                                      </li>
                                    );
                                  })}
                                </ul>
                              ) : (
                                <p>
                                  {teamWinsOnly
                                    ? `Per-build wins: N/A · Team wins: ${counts[ticket - 1]}/5`
                                    : "No builds recorded."}
                                </p>
                              )}
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
                    </td>
                    <td
                      className="uma-build-results__rate"
                      aria-label={`${title} ${label} win rate`}
                    >
                      {winRate === null ? "—" : `${winRate}% (${wins}/${count * 5})`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
