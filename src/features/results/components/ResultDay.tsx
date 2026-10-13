import type { Dispatch, SetStateAction } from "react";
import type {
  TeamRaceResultRow,
  TeamResultCounts,
  TeamResultRow,
  TeamTicket,
  TeamTicketCount,
} from "../domain/resultsTypes";
import type { StoredUmaBuild } from "../../../types/UmaBuild";
import type { UmaEntry } from "../../../types/UmaEntry";
import type { ResolvedTicketBuildResult } from "../domain/types";
import CopyIcon from "../../../components/CopyIcon";
import { formatResultOpeningDate, formatWinRate } from "../domain/utils";
import TicketList from "./TicketList";

interface Props {
  title: string;
  row: TeamRaceResultRow;
  label: string;
  counts: TeamResultCounts;
  count: TeamTicketCount;
  resultAvailability: Record<TeamResultRow, boolean>;
  openingDate: Date | null;
  umaList: UmaEntry[];
  availableBuilds: StoredUmaBuild[];
  editingTickets: Set<string>;
  setEditingTickets: Dispatch<SetStateAction<Set<string>>>;
  isCopyingImage: boolean;
  dayCopyStatus: { row: TeamRaceResultRow; message: string } | null;
  onCopyDay: (row: TeamRaceResultRow) => void;
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

export default function ResultDay({
  title,
  row,
  label,
  counts,
  count,
  resultAvailability,
  openingDate,
  umaList,
  availableBuilds,
  editingTickets,
  setEditingTickets,
  isCopyingImage,
  dayCopyStatus,
  onCopyDay,
  onAddTicket,
  onRemoveTicket,
  onSaveTicket,
  getTicketBuildResults,
  getBuild,
}: Props) {
  const wins = counts.slice(0, count).reduce((total, ticketWins) => total + ticketWins, 0);
  const winRate = count > 0 ? (wins / (count * 5)) * 100 : null;
  const headingId = `results-${row.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;

  return (
    <section className="uma-build-results__day" aria-labelledby={headingId}>
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
        <p className="uma-build-results__rate" aria-label={`${title} ${label} win rate`}>
          {winRate === null ? "—" : `${formatWinRate(winRate)}% (${wins}/${count * 5})`}
        </p>
      </div>
      <TicketList
        row={row}
        count={count}
        counts={counts}
        resultAvailability={resultAvailability}
        umaList={umaList}
        availableBuilds={availableBuilds}
        editingTickets={editingTickets}
        setEditingTickets={setEditingTickets}
        onAddTicket={onAddTicket}
        onRemoveTicket={onRemoveTicket}
        onSaveTicket={onSaveTicket}
        getTicketBuildResults={getTicketBuildResults}
        getBuild={getBuild}
      />
    </section>
  );
}
