import type { Dispatch, SetStateAction } from "react";
import type {
  TeamRaceResultRow,
  TeamResultCounts,
  TeamTicket,
  TeamTicketCount,
} from "../domain/resultsTypes";
import type { StoredUmaBuild } from "../../../types/UmaBuild";
import type { UmaEntry } from "../../../types/UmaEntry";
import type { ResolvedTicketBuildResult } from "../domain/types";
import TicketCard from "./TicketCard";

interface Props {
  row: TeamRaceResultRow;
  count: TeamTicketCount;
  counts: TeamResultCounts;
  resultAvailability: Record<TeamRaceResultRow, boolean>;
  umaList: UmaEntry[];
  availableBuilds: StoredUmaBuild[];
  editingTickets: Set<string>;
  setEditingTickets: Dispatch<SetStateAction<Set<string>>>;
  onAddTicket: (row: TeamRaceResultRow) => void;
  onRemoveTicket: (row: TeamRaceResultRow, ticket: TeamTicket) => void;
  onSaveTicket: (
    row: TeamRaceResultRow,
    ticket: TeamTicket,
    builds: { buildId: string; slot: 1 | 2 | 3; wins: number }[],
  ) => void;
  getTicketBuildResults: (
    row: TeamRaceResultRow,
    ticket: TeamTicket,
  ) => ResolvedTicketBuildResult[];
  getBuild: (buildId: string | null) => StoredUmaBuild | undefined;
}

export default function TicketList({
  row,
  count,
  counts,
  resultAvailability,
  umaList,
  availableBuilds,
  editingTickets,
  setEditingTickets,
  onAddTicket,
  onRemoveTicket,
  onSaveTicket,
  getTicketBuildResults,
  getBuild,
}: Props) {
  return (
    <div className="uma-build-results__ticket-list">
      {Array.from({ length: count }, (_, index) => {
        const ticket = (index + 1) as TeamTicket;
        return (
          <TicketCard
            key={ticket}
            row={row}
            ticket={ticket}
            counts={counts}
            builds={getTicketBuildResults(row, ticket)}
            editingTickets={editingTickets}
            setEditingTickets={setEditingTickets}
            availableBuilds={availableBuilds}
            umaList={umaList}
            getBuild={getBuild}
            onRemoveTicket={onRemoveTicket}
            onSaveTicket={onSaveTicket}
          />
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
          onClick={() => onAddTicket(row)}
        >
          Add ticket
        </button>
      ) : null}
    </div>
  );
}
