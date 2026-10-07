import type { StoredUmaBuild } from "../../types/UmaBuild";
import {
  hasDuplicateBaseUmaIds,
  resolveResultBuildId,
  setBuildAssignmentTickets,
  setTeamResultRoundExcluded,
  type EventResults,
  type InitialTeamBuildIds,
  type TeamFinalBuildPlacements,
  type TeamFinalPlacement,
  type TeamRaceResultRow,
  type TeamResultCounts,
  type TeamResultRound,
  type TeamTicket,
  type TeamTicketBuildResult,
  type UmaSlot,
} from "./plannerTypes";

interface Dependencies {
  selectedEvent: string | null;
  allBuilds: StoredUmaBuild[];
  getCurrentResults: () => EventResults | null;
  saveEventResults: (results: EventResults) => void;
}

export function createResultActions({
  selectedEvent,
  allBuilds,
  getCurrentResults,
  saveEventResults,
}: Dependencies) {
  function saveTicketResult(
    row: TeamRaceResultRow,
    ticket: TeamTicket,
    builds: TeamTicketBuildResult[],
    teamWins?: number,
  ) {
    const current = getCurrentResults();
    const rowResults = current?.results[row];
    const currentTicketCount = current?.ticketCounts[row];
    const winsTotal = builds.length > 0
      ? builds.reduce((total, build) => total + build.wins, 0)
      : teamWins;
    const uniqueBuilds = new Set(builds.map((build) => build.buildId));
    const uniqueSlots = new Set(builds.map((build) => build.slot));
    if (
      !selectedEvent ||
      !current ||
      current.event !== selectedEvent ||
      rowResults === null ||
      rowResults === undefined
    ) return;
    if (
      currentTicketCount === undefined ||
      ticket > currentTicketCount + 1 ||
      builds.length > 3 ||
      uniqueBuilds.size !== builds.length ||
      uniqueSlots.size !== builds.length ||
      winsTotal === undefined ||
      !Number.isInteger(winsTotal) ||
      winsTotal < 0 ||
      winsTotal > 5 ||
      builds.some((build) =>
        !build.buildId ||
        ![1, 2, 3].includes(build.slot) ||
        !Number.isInteger(build.wins) ||
        build.wins < 0 ||
        build.wins > 5
      )
    ) return;

    const nextResults: TeamResultCounts = [...rowResults];
    nextResults[ticket - 1] = winsTotal;

    let buildAssignments = current.buildAssignments;
    for (const slot of [1, 2, 3] as const) {
      const selectedBuild = builds.find((build) => build.slot === slot);
      buildAssignments = setBuildAssignmentTickets(
        buildAssignments,
        row,
        slot,
        selectedBuild?.buildId ?? null,
        ticket,
      );
    }

    const ticketBuildResults = {
      ...current.ticketBuildResults,
      [row]: {
        ...current.ticketBuildResults[row],
        [ticket]: builds,
      },
    };
    saveEventResults({
      ...current,
      results: { ...current.results, [row]: nextResults },
      buildAssignments,
      ticketBuildResults,
      ticketCounts: {
        ...current.ticketCounts,
        [row]: Math.max(currentTicketCount, ticket) as 1 | 2 | 3 | 4,
      },
    });
  }

  function removeTicketResult(row: TeamRaceResultRow, ticket: TeamTicket) {
    const current = getCurrentResults();
    const count = current?.ticketCounts[row];
    const rowResults = current?.results[row];
    if (
      !selectedEvent ||
      !current ||
      current.event !== selectedEvent ||
      count === undefined ||
      ticket > count ||
      rowResults === null ||
      rowResults === undefined
    ) return;

    const originalLineups = new Map<UmaSlot, (string | null)[]>();
    for (const slot of [1, 2, 3] as const) {
      originalLineups.set(
        slot,
        Array.from({ length: count }, (_, index) =>
          resolveResultBuildId(
            current,
            row,
            (index + 1) as TeamTicket,
            slot,
          )
        ),
      );
    }

    let buildAssignments = current.buildAssignments;
    for (const slot of [1, 2, 3] as const) {
      const lineup = originalLineups.get(slot) ?? [];
      for (let index = ticket; index <= count; index += 1) {
        const sourceIndex = index < count ? index : -1;
        buildAssignments = setBuildAssignmentTickets(
          buildAssignments,
          row,
          slot,
          sourceIndex >= 0 ? lineup[sourceIndex] : null,
          index as TeamTicket,
        );
      }
    }

    const nextCount = count - 1;
    const rowAssignments = { ...buildAssignments[row] };
    for (const slot of [1, 2, 3] as const) {
      const assignments = (rowAssignments[slot] ?? [])
        .map((assignment) => ({
          ...assignment,
          tickets: assignment.tickets.filter((assigned) => assigned <= nextCount),
        }))
        .filter((assignment) => assignment.tickets.length > 0);
      if (assignments.length === 0) delete rowAssignments[slot];
      else rowAssignments[slot] = assignments;
    }
    buildAssignments = { ...buildAssignments };
    if (Object.keys(rowAssignments).length === 0) delete buildAssignments[row];
    else buildAssignments[row] = rowAssignments;

    const nextResults: TeamResultCounts = [...rowResults];
    for (let index = ticket - 1; index < count - 1; index += 1) {
      nextResults[index] = nextResults[index + 1];
    }
    nextResults[count - 1] = 0;

    const rowTicketResults = current.ticketBuildResults[row] ?? {};
    const nextTicketResults = { ...rowTicketResults };
    for (let index = ticket; index <= count; index += 1) {
      delete nextTicketResults[index as TeamTicket];
    }
    for (let index = ticket + 1; index <= count; index += 1) {
      const builds = rowTicketResults[index as TeamTicket];
      if (builds) nextTicketResults[(index - 1) as TeamTicket] = builds;
    }
    const ticketBuildResults = { ...current.ticketBuildResults };
    if (Object.keys(nextTicketResults).length === 0) delete ticketBuildResults[row];
    else ticketBuildResults[row] = nextTicketResults;

    saveEventResults({
      ...current,
      results: { ...current.results, [row]: nextResults },
      buildAssignments,
      ticketBuildResults,
      ticketCounts: { ...current.ticketCounts, [row]: nextCount as 0 | 1 | 2 | 3 | 4 },
    });
  }

  function updateResultRoundExcluded(round: TeamResultRound, excluded: boolean) {
    const current = getCurrentResults();
    if (!selectedEvent || !current || current.event !== selectedEvent) return;

    const ticketBuildResults = { ...current.ticketBuildResults };
    const rows = round === "round1"
      ? ["round1Day1", "round1Day2"] as const
      : ["round2Day1", "round2Day2"] as const;
    for (const row of rows) {
      const rowTicketResults = ticketBuildResults[row];
      if (!rowTicketResults) continue;
      ticketBuildResults[row] = Object.fromEntries(
        Object.entries(rowTicketResults).map(([ticket, builds]) => [
          ticket,
          builds?.map((build) => ({ ...build, wins: 0 })) ?? [],
        ]),
      );
    }

    saveEventResults({
      ...current,
      results: setTeamResultRoundExcluded(current.results, round, excluded),
      ticketBuildResults,
    });
  }

  function saveFinalsResult(
    buildIds: InitialTeamBuildIds,
    buildPlacements: TeamFinalBuildPlacements,
    placement: TeamFinalPlacement,
  ) {
    const current = getCurrentResults();
    if (!selectedEvent || !current || current.event !== selectedEvent) return;
    const builds = buildIds.map((buildId) =>
      buildId ? allBuilds.find((build) => build.id === buildId) : null,
    );
    const hasFirstPlace = buildPlacements.includes(1);
    if (
      buildIds.some((buildId, index) => buildId !== null && !builds[index]) ||
      buildPlacements.some((buildPlacement, index) =>
        buildPlacement !== null && buildIds[index] === null
      ) ||
      (!hasFirstPlace && placement === 1) ||
      builds.some((build) => build?.["build-type"] === "plan") ||
      hasDuplicateBaseUmaIds(builds)
    ) return;

    let buildAssignments = current.buildAssignments;
    for (const slot of [1, 2, 3] as const) {
      buildAssignments = setBuildAssignmentTickets(
        buildAssignments,
        "finals",
        slot,
        buildIds[slot - 1],
        1,
      );
    }
    saveEventResults({
      ...current,
      buildAssignments,
      finalBuildPlacements: buildPlacements,
      finalPlacement: hasFirstPlace ? 1 : placement,
    });
  }

  return {
    saveTicketResult,
    removeTicketResult,
    updateResultRoundExcluded,
    saveFinalsResult,
  };
}
