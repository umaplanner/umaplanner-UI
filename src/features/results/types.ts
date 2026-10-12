import type {
  TeamRaceResultRow,
  TeamTicket,
  TeamTicketBuildResult,
  TeamUmaPlacement,
  UmaSlot,
} from "./resultsTypes";
import type { StoredUmaBuild } from "../../types/UmaBuild";

export type ResultGroup = {
  title: "Round 1" | "Round 2";
  rows: { row: TeamRaceResultRow; label: string }[];
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
