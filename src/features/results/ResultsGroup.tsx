import { useState } from "react";
import type {
  TeamRaceResultRow,
  TeamResults,
  TeamTicket,
  TeamTicketCount,
  TeamResultRow,
} from "./domain/resultsTypes";
import type { StoredUmaBuild } from "../../types/UmaBuild";
import type { UmaEntry } from "../../types/UmaEntry";
import type {
  ResolvedTicketBuildResult,
  ResultGroup,
} from "./domain/types";
import ResultDay from "./components/ResultDay";

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
            const openingDate = resultOpeningDates?.[row] ?? null;
            return <ResultDay
              key={row}
              title={title}
              row={row}
              label={label}
              counts={counts}
              count={count}
              resultAvailability={resultAvailability}
              openingDate={openingDate}
              umaList={umaList}
              availableBuilds={availableBuilds}
              editingTickets={editingTickets}
              setEditingTickets={setEditingTickets}
              isCopyingImage={isCopyingImage}
              dayCopyStatus={dayCopyStatus}
              onCopyDay={onCopyDay}
              onAddTicket={onAddTicket}
              onRemoveTicket={onRemoveTicket}
              onSaveTicket={onSaveTicket}
              getTicketBuildResults={getTicketBuildResults}
              getBuild={getBuild}
            />;
          })}
        </div>
      ) : null}
    </section>
  );
}
