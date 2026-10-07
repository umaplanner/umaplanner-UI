export type UmaSlot = 1 | 2 | 3;
export type TeamResultRow =
  | "round1Day1"
  | "round1Day2"
  | "round2Day1"
  | "round2Day2"
  | "finals";
export type TeamRaceResultRow = Exclude<TeamResultRow, "finals">;
export type TeamResultCounts = [number, number, number, number];
export type TeamResultRound = "round1" | "round2";
export type TeamFinalPlacement = 1 | 2 | 3;
export type TeamUmaPlacement = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type TeamFinalBuildPlacements = [
  TeamUmaPlacement | null,
  TeamUmaPlacement | null,
  TeamUmaPlacement | null,
];
export type TeamResults = Record<TeamResultRow, TeamResultCounts | null>;
export type TeamTicket = 1 | 2 | 3 | 4;
export type TeamTicketCount = 0 | 1 | 2 | 3 | 4;
export type TeamTicketBuildResult = {
  buildId: string;
  slot: UmaSlot;
  wins: number;
};
export type TeamTicketBuildResults = Partial<
  Record<TeamRaceResultRow, Partial<Record<TeamTicket, TeamTicketBuildResult[]>>>
>;
export type TeamTicketCounts = Record<TeamResultRow, TeamTicketCount>;
export type TeamBuildAssignment = {
  buildId: string | null;
  tickets: TeamTicket[];
};
export type InitialTeamBuildIds = [string | null, string | null, string | null];
export type TeamBuildAssignments = Partial<
  Record<TeamResultRow, Partial<Record<UmaSlot, TeamBuildAssignment[]>>>
>;

export type EventResults = {
  event: string;
  results: TeamResults;
  finalPlacement: TeamFinalPlacement | null;
  finalBuildPlacements: TeamFinalBuildPlacements;
  buildAssignments: TeamBuildAssignments;
  ticketBuildResults: TeamTicketBuildResults;
  ticketCounts: TeamTicketCounts;
  initialBuildIds: InitialTeamBuildIds;
  lastUpdate: number;
};

export const teamResultRows: TeamResultRow[] = [
  "round1Day1",
  "round1Day2",
  "round2Day1",
  "round2Day2",
  "finals",
];

const teamResultRoundRows: Record<TeamResultRound, [TeamResultRow, TeamResultRow]> = {
  round1: ["round1Day1", "round1Day2"],
  round2: ["round2Day1", "round2Day2"],
};

export function isTeamResultRoundExcluded(
  results: TeamResults,
  round: TeamResultRound,
): boolean {
  return teamResultRoundRows[round].every((row) => results[row] === null);
}

export function setTeamResultRoundExcluded(
  results: TeamResults,
  round: TeamResultRound,
  excluded: boolean,
): TeamResults {
  const [day1, day2] = teamResultRoundRows[round];
  const rowResults: TeamResultCounts | null = excluded ? null : [0, 0, 0, 0];
  return { ...results, [day1]: rowResults, [day2]: rowResults };
}

export function setBuildAssignmentTickets(
  assignments: TeamBuildAssignments,
  row: TeamResultRow,
  slot: UmaSlot,
  buildId: string | null,
  ticket: TeamTicket,
): TeamBuildAssignments {
  const rowAssignments = { ...assignments[row] };
  const currentAssignments = rowAssignments[slot] ?? [];
  const byBuild = new Map<string | null, Set<TeamTicket>>();

  for (const assignment of currentAssignments) {
    const assignedTickets = byBuild.get(assignment.buildId) ?? new Set<TeamTicket>();
    assignment.tickets.filter((assigned) => assigned !== ticket).forEach((assigned) =>
      assignedTickets.add(assigned)
    );
    byBuild.set(assignment.buildId, assignedTickets);
  }

  const assignedTickets = byBuild.get(buildId) ?? new Set<TeamTicket>();
  assignedTickets.add(ticket);
  byBuild.set(buildId, assignedTickets);

  rowAssignments[slot] = Array.from(byBuild, ([id, assignedTickets]) => ({
    buildId: id,
    tickets: Array.from(assignedTickets).sort((left, right) => left - right),
  }));
  const buildAssignments = { ...assignments };
  if (rowAssignments[slot]?.length === 0) delete rowAssignments[slot];
  if (Object.keys(rowAssignments).length === 0) delete buildAssignments[row];
  else buildAssignments[row] = rowAssignments;
  return buildAssignments;
}

export function resolveResultBuildId(
  results: Pick<EventResults, "buildAssignments" | "ticketCounts" | "initialBuildIds">,
  row: TeamResultRow,
  ticket: TeamTicket,
  slot: UmaSlot,
): string | null {
  const assignment = results.buildAssignments[row]?.[slot]
    ?.find((entry) => entry.tickets.includes(ticket));
  if (assignment) return assignment.buildId;

  const rowIndex = teamResultRows.indexOf(row);
  if (rowIndex === 0) return results.initialBuildIds[slot - 1];

  const previousRow = teamResultRows[rowIndex - 1];
  const previousCount = results.ticketCounts[previousRow];
  return resolveResultBuildId(
    results,
    previousRow,
    (previousCount > 0 ? previousCount : 1) as TeamTicket,
    slot,
  );
}

export function createDefaultTeamResults(): TeamResults {
  return {
    round1Day1: [0, 0, 0, 0],
    round1Day2: [0, 0, 0, 0],
    round2Day1: [0, 0, 0, 0],
    round2Day2: [0, 0, 0, 0],
    finals: [0, 0, 0, 0],
  };
}

export function createDefaultTicketCounts(): TeamTicketCounts {
  return {
    round1Day1: 0,
    round1Day2: 0,
    round2Day1: 0,
    round2Day2: 0,
    finals: 1,
  };
}

export function getBaseUmaId(outfitId: string): string {
  return outfitId.match(/\d/g)?.slice(0, 4).join("") ?? "";
}

export function hasDuplicateBaseUmaIds(
  builds: readonly ({ outfitId: string } | null | undefined)[],
): boolean {
  const baseIds = new Set<string>();
  for (const build of builds) {
    if (!build) continue;
    const baseId = getBaseUmaId(build.outfitId);
    if (baseId && baseIds.has(baseId)) return true;
    if (baseId) baseIds.add(baseId);
  }
  return false;
}

export function createEmptyEventResults(event = ""): EventResults {
  return {
    event,
    results: createDefaultTeamResults(),
    finalPlacement: null,
    finalBuildPlacements: [null, null, null],
    buildAssignments: {},
    ticketBuildResults: {},
    ticketCounts: createDefaultTicketCounts(),
    initialBuildIds: [null, null, null],
    lastUpdate: 0,
  };
}
