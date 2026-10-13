import type { Dispatch, SetStateAction } from "react";
import type { StoredUmaBuild } from "../../../types/UmaBuild";
import type { UmaEntry } from "../../../types/UmaEntry";
import type { ResolvedTicketBuildResult } from "../domain/types";
import type { TeamRaceResultRow, TeamTicket } from "../domain/resultsTypes";
import TicketBuildRow from "./TicketBuildRow";

interface Props {
  row: TeamRaceResultRow;
  ticket: TeamTicket;
  counts: readonly number[];
  builds: ResolvedTicketBuildResult[];
  editingTickets: Set<string>;
  setEditingTickets: Dispatch<SetStateAction<Set<string>>>;
  availableBuilds: StoredUmaBuild[];
  umaList: UmaEntry[];
  getBuild: (buildId: string | null) => StoredUmaBuild | undefined;
  onRemoveTicket: (row: TeamRaceResultRow, ticket: TeamTicket) => void;
  onSaveTicket: (
    row: TeamRaceResultRow,
    ticket: TeamTicket,
    builds: { buildId: string; slot: 1 | 2 | 3; wins: number }[],
  ) => void;
}

export default function TicketCard({
  row,
  ticket,
  counts,
  builds,
  editingTickets,
  setEditingTickets,
  availableBuilds,
  umaList,
  getBuild,
  onRemoveTicket,
  onSaveTicket,
}: Props) {
  const ticketKey = `${row}:${ticket}`;
  const isEditing = editingTickets.has(ticketKey);
  const hasPerBuildWins = builds.every((build) => build.wins !== null);
  const totalTicketWins = !hasPerBuildWins
    ? counts[ticket - 1]
    : builds.reduce((total, build) => total + (build.wins ?? 0), 0);

  return (
    <article className="uma-build-results__ticket-card" aria-label={`Ticket ${ticket}`}>
      <div className="uma-build-results__ticket-card-heading">
        <strong>Ticket {ticket}</strong>
        <div className="uma-build-results__ticket-card-actions">
          <button
            className="uma-build-results__ticket-edit"
            type="button"
            aria-label={`Edit Ticket ${ticket}`}
            aria-pressed={isEditing}
            onClick={() => setEditingTickets((current) => {
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
        {builds.map((ticketBuild) => (
          <TicketBuildRow
            key={`${ticketBuild.slot}:${ticketBuild.buildId}`}
            row={row}
            ticket={ticket}
            builds={builds}
            ticketBuild={ticketBuild}
            isEditing={isEditing}
            availableBuilds={availableBuilds}
            umaList={umaList}
            getBuild={getBuild}
            onSaveTicket={onSaveTicket}
          />
        ))}
      </ul>
      <p className="uma-build-results__team-wins">
        Team wins:{" "}
        {totalTicketWins}/5
      </p>
    </article>
  );
}
