import type {
  TeamRaceResultRow,
  TeamResultRound,
  TeamTicket,
  TeamTicketBuildResult,
  TeamUmaPlacement,
  UmaSlot,
} from "../../../features/planner/plannerTypes";
import type { StoredUmaBuild } from "../../../types/UmaBuild";

export type ResultGroup = {
  title: "Round 1" | "Round 2";
  round: TeamResultRound;
  rows: { row: TeamRaceResultRow; label: string }[];
};

export type TicketEditor = {
  row: TeamRaceResultRow;
  groupTitle: string;
  label: string;
  ticket: TeamTicket | null;
};

export type ResultBuildSummary = {
  build: StoredUmaBuild;
  wins: number;
  raceCount: number;
  slot: UmaSlot;
};

export type ResolvedTicketBuildResult = Omit<TeamTicketBuildResult, "wins"> & {
  wins: number | null;
};

export type FinalsDraft = {
  placement: 1 | 2 | 3 | null;
  buildIds: [string, string, string];
  buildPlacements: [TeamUmaPlacement | null, TeamUmaPlacement | null, TeamUmaPlacement | null];
};

export type ResultBuildLookup = (buildId: string | null) => StoredUmaBuild | undefined;

export type EffectiveResultBuildLookup = (
  row: TeamRaceResultRow | "finals",
  ticket: TeamTicket,
  slot: UmaSlot,
) => string | null;
