import type { StoredUmaBuild } from "../../../types/UmaBuild";
import {
  resolveResultBuildId,
  teamResultRows,
  type EventResults,
  type TeamRaceResultRow,
  type TeamTicket,
} from "./resultsTypes";
import type {
  ResultBuildSummary,
  ResolvedTicketBuildResult,
} from "./types";

export function getTicketBuildResults(
  results: Pick<EventResults, "buildAssignments" | "ticketBuildResults" | "ticketCounts" | "initialBuildIds">,
  row: TeamRaceResultRow,
  ticket: TeamTicket,
): ResolvedTicketBuildResult[] {
  return ([1, 2, 3] as const).map((slot) => {
    const saved = results.ticketBuildResults[row]?.[ticket]?.find(
      (build) => build.slot === slot,
    );

    const assigned = results.buildAssignments[row]?.[slot]
      ?.find((assignment) => assignment.tickets.includes(ticket))
      ?.buildId;

    const buildId = saved?.buildId ?? assigned ??
      (results.ticketBuildResults[row]?.[ticket] === undefined
        ? resolveResultBuildId(results, row, ticket, slot)
        : null);

    return {
      buildId: buildId ?? "",
      slot,
      wins: saved?.wins ?? null,
    };
  });
}

export function getResultBuildSummaries(
  results: Pick<EventResults, "buildAssignments" | "ticketBuildResults" | "ticketCounts" | "initialBuildIds" | "results" | "finalPlacement" | "finalBuildPlacements">,
  availableBuilds: StoredUmaBuild[],
): ResultBuildSummary[] {
  const getBuild = (buildId: string | null) =>
    buildId ? availableBuilds.find((entry) => entry.id === buildId) : undefined;
  const byBuild = new Map<string, ResultBuildSummary>();

  for (const row of teamResultRows) {
    if (row === "finals" || results.results[row] === null) continue;
    for (let index = 0; index < results.ticketCounts[row]; index += 1) {
      const ticket = (index + 1) as TeamTicket;
      const savedBuildResults = results.ticketBuildResults[row]?.[ticket] ?? [];

      for (const slot of [1, 2, 3] as const) {
        const saved = savedBuildResults.find((entry) => entry.slot === slot);
        const assigned = results.buildAssignments[row]?.[slot]
          ?.find((assignment) => assignment.tickets.includes(ticket))
          ?.buildId;
        const buildId = saved?.buildId ?? assigned ??
          (results.ticketBuildResults[row]?.[ticket] === undefined
            ? resolveResultBuildId(results, row, ticket, slot)
            : null);
        const build = getBuild(buildId);
        if (!build) continue;

        const summary = byBuild.get(build.id) ?? {
          build,
          wins: 0,
          raceCount: 0,
          slot,
        };
        if (saved?.wins !== undefined) summary.wins += saved.wins;
        summary.raceCount += 5;
        byBuild.set(build.id, summary);
      }
    }
  }

  if (results.finalPlacement !== null) {
    for (const slot of [1, 2, 3] as const) {
      const finalBuildId = results.buildAssignments.finals?.[slot]
        ?.find((assignment) => assignment.tickets.includes(1))
        ?.buildId;
      if (!finalBuildId) continue;

      const finalBuild = getBuild(finalBuildId);
      if (!finalBuild) continue;

      const summary = byBuild.get(finalBuildId) ?? {
        build: finalBuild,
        wins: 0,
        raceCount: 0,
        slot,
      };
      summary.raceCount += 1;
      if (results.finalBuildPlacements[slot - 1] === 1) summary.wins += 1;
      byBuild.set(finalBuildId, summary);
    }
  }

  return Array.from(byBuild.values());
}

export function getResultTotals(
  results: Pick<EventResults, "results" | "ticketCounts" | "finalPlacement">,
) {
  const roundWins = teamResultRows.reduce((total, row) => {
    if (row === "finals" || results.results[row] === null) return total;

    return total + (results.results[row]?.slice(0, results.ticketCounts[row])
      .reduce((rowTotal, wins) => rowTotal + wins, 0) ?? 0);
  }, 0);

  const roundTicketCount = teamResultRows.reduce((total, row) => {
    if (row === "finals" || results.results[row] === null) return total;

    return total + results.ticketCounts[row];
  }, 0);

  const totalWins = roundWins + (results.finalPlacement === 1 ? 1 : 0);
  const totalRaces = roundTicketCount * 5 + (results.finalPlacement === null ? 0 : 1);

  return {
    roundWins,
    roundTicketCount,
    totalWins,
    totalRaces,
    totalWinRate: totalRaces > 0 ? (totalWins / totalRaces) * 100 : null,
  };
}

export function hasFinalsData(
  results: Pick<EventResults, "buildAssignments" | "finalPlacement">,
): boolean {
  return results.finalPlacement !== null ||
    ([1, 2, 3] as const).some((slot) =>
      results.buildAssignments.finals?.[slot]
        ?.some((assignment) => assignment.tickets.includes(1)),
    );
}

export function getFinalBuilds(
  results: Pick<EventResults, "buildAssignments" | "ticketCounts" | "initialBuildIds">,
  availableBuilds: StoredUmaBuild[],
): [StoredUmaBuild | undefined, StoredUmaBuild | undefined, StoredUmaBuild | undefined] {
  const getBuild = (buildId: string | null) =>
    buildId ? availableBuilds.find((entry) => entry.id === buildId) : undefined;

  return ([1, 2, 3] as const).map((slot) =>
    getBuild(resolveResultBuildId(results, "finals", 1, slot)),
  ) as [StoredUmaBuild | undefined, StoredUmaBuild | undefined, StoredUmaBuild | undefined];
}
