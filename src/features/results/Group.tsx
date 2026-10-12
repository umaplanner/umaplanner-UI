import { useState } from "react";
import type {
  TeamRaceResultRow,
  TeamResults,
  TeamTicket,
  TeamTicketCount,
  TeamResultRow,
} from "./resultsTypes";
import type { StoredUmaBuild } from "../../types/UmaBuild";
import type { UmaEntry } from "../../types/UmaEntry";
import type {
  ResolvedTicketBuildResult,
  ResultGroup,
} from "./types";
import CopyIcon from "../../components/CopyIcon";
import BuildSelector from "./BuildSelector";
import { formatResultOpeningDate, formatWinRate } from "./utils";

interface Props {
  group: ResultGroup;
  results: TeamResults;
  ticketCounts: Record<TeamResultRow, TeamTicketCount>;
  resultAvailability: Record<TeamResultRow, boolean>;
  resultOpeningDates?: Record<TeamResultRow, Date | null>;
  collapsed: boolean;
  umaList: UmaEntry[];
  availableBuilds: StoredUmaBuild[];
  onToggleCollapsed: (title: ResultGroup["title"]) => void;
  onCopyDay: (row: TeamRaceResultRow) => void;
  dayCopyStatus: { row: TeamRaceResultRow; message: string } | null;
  isCopyingImage: boolean;
  onAddTicket: (row: TeamRaceResultRow) => void;
  onRemoveTicket: (row: TeamRaceResultRow, ticket: TeamTicket) => void;
  onSaveTicket: (
    row: TeamRaceResultRow,
    ticket: TeamTicket,
    builds: { buildId: string; slot: 1 | 2 | 3; wins: number }[],
    teamWins?: number,
  ) => void;
  getTicketBuildResults: (
    row: TeamRaceResultRow,
    ticket: TeamTicket,
  ) => ResolvedTicketBuildResult[];
  getBuild: (buildId: string | null) => StoredUmaBuild | undefined;
}

export default function Group({
  group,
  results,
  ticketCounts,
  resultAvailability,
  resultOpeningDates,
  collapsed,
  umaList,
  availableBuilds,
  onToggleCollapsed,
  onCopyDay,
  dayCopyStatus,
  isCopyingImage,
  onAddTicket,
  onRemoveTicket,
  onSaveTicket,
  getTicketBuildResults,
  getBuild,
}: Props) {
  const [editingTickets, setEditingTickets] = useState<Set<string>>(() => new Set());
  const { title } = group;

  return (
    <section
      className="uma-build-results__group"
      aria-labelledby={`results-${title.replace(" ", "-").toLowerCase()}`}
    >
      <div className="uma-build-results__group-heading">
        <h2 id={`results-${title.replace(" ", "-").toLowerCase()}`}>{title}</h2>
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
      {!collapsed ? (
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
                    <div className="uma-build-results__day-title">
                      <h3 id={headingId}>{label}</h3>
                      <button
                        className="uma-build-results__copy-day"
                        type="button"
                        disabled={count === 0 || isCopyingImage}
                        aria-label={`Copy ${title} ${label} as image`}
                        onClick={() => onCopyDay(row)}
                      >
                        <span>Image</span>
                        <CopyIcon />
                      </button>
                      {dayCopyStatus?.row === row ? (
                        <span className="uma-build-results__copy-status" role="status" aria-live="polite">
                          {dayCopyStatus.message}
                        </span>
                      ) : null}
                    </div>
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
                    const ticketKey = `${row}:${ticket}`;
                    const isEditing = editingTickets.has(ticketKey);
                    const builds = getTicketBuildResults(row, ticket);
                    const hasPerBuildWins = builds.every((build) => build.wins !== null);
                    const totalTicketWins = !hasPerBuildWins
                      ? counts[ticket - 1]
                      : builds.reduce((total, build) => total + (build.wins ?? 0), 0);
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
                              className="uma-build-results__ticket-edit"
                              type="button"
                              aria-label={`Edit Ticket ${ticket}`}
                              aria-pressed={isEditing}
                              onClick={() =>
                                setEditingTickets((current) => {
                                  const next = new Set(current);
                                  if (next.has(ticketKey)) next.delete(ticketKey);
                                  else next.add(ticketKey);
                                  return next;
                                })}
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
                        <ul>
                          {builds.map((ticketBuild) => {
                              const build = getBuild(ticketBuild.buildId || null);
                              return (
                                <li key={`${ticketBuild.slot}:${ticketBuild.buildId}`}>
                                  <div className="uma-build-results__ticket-build-entry">
                                    <BuildSelector
                                      slot={ticketBuild.slot}
                                      buildId={ticketBuild.buildId}
                                      compact
                                      disabled={!isEditing}
                                      nativeModal={false}
                                      choices={availableBuilds}
                                      availableBuilds={availableBuilds}
                                      umaList={umaList}
                                      ariaLabel={`Choose build for Uma ${ticketBuild.slot} on Ticket ${ticket}`}
                                      title="Swap to a saved build"
                                      onChange={(buildId) => {
                                        const nextBuilds = builds.flatMap((entry) => {
                                          const nextId = entry.slot === ticketBuild.slot
                                            ? buildId
                                            : entry.buildId;
                                          return nextId
                                            ? [{
                                              buildId: nextId,
                                              slot: entry.slot,
                                              wins: entry.slot === ticketBuild.slot
                                                ? 0
                                                : entry.wins ?? 0,
                                            }]
                                            : [];
                                        });
                                        onSaveTicket(
                                          row,
                                          ticket,
                                          nextBuilds,
                                        );
                                      }}
                                    />
                                    {ticketBuild.buildId ? (
                                      <span className="uma-build-results__win-stepper">
                                        <small>
                                          {ticketBuild.wins ?? 0} {(ticketBuild.wins ?? 0) === 1 ? "win" : "wins"}
                                        </small>
                                        <button
                                          type="button"
                                          aria-label={`Decrease wins for ${build?.name || `Uma ${ticketBuild.slot}`} on Ticket ${ticket}`}
                                          disabled={(ticketBuild.wins ?? 0) <= 0}
                                          onClick={() => {
                                            const wins = builds.filter((entry) => entry.buildId).map((entry) => ({
                                              buildId: entry.buildId,
                                              slot: entry.slot,
                                              wins: entry.wins ?? 0,
                                            }));
                                            const current = wins.find((entry) =>
                                              entry.slot === ticketBuild.slot
                                            );
                                            if (current) current.wins -= 1;
                                            onSaveTicket(row, ticket, wins);
                                          }}
                                        >−</button>
                                        <button
                                          type="button"
                                          aria-label={`Increase wins for ${build?.name || `Uma ${ticketBuild.slot}`} on Ticket ${ticket}`}
                                          disabled={builds.reduce((total, entry) => total + (entry.wins ?? 0), 0) >= 5}
                                          onClick={() => {
                                            const wins = builds.filter((entry) => entry.buildId).map((entry) => ({
                                              buildId: entry.buildId,
                                              slot: entry.slot,
                                              wins: entry.wins ?? 0,
                                            }));
                                            const current = wins.find((entry) =>
                                              entry.slot === ticketBuild.slot
                                            );
                                            if (current) current.wins += 1;
                                            onSaveTicket(row, ticket, wins);
                                          }}
                                        >+</button>
                                      </span>
                                    ) : null}
                                  </div>
                                </li>
                              );
                          })}
                          </ul>
                        <p className="uma-build-results__team-wins">
                          Team wins:{" "}
                          {totalTicketWins}/5
                        </p>
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
                        onAddTicket(row)}
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
