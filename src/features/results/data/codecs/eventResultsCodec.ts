import {
  createEmptyEventResults,
  resolveResultBuildId,
  teamResultRows,
  type EventResults,
  type InitialTeamBuildIds,
  type TeamFinalBuildPlacements,
  type TeamFinalPlacement,
  type TeamTicket,
  type TeamUmaPlacement,
} from "../../domain/resultsTypes";
import {
  normalizeTeamResults,
} from "./teamResultsCodec";
import {
  normalizeTeamTicketBuildResults,
  normalizeTeamTicketCounts,
} from "./ticketResultsCodec";
import { normalizeTeamBuildAssignments } from "./buildAssignmentsCodec";
import { normalizeGroupedEventResults } from "./legacyResultsCodec";

function normalizeInitialBuildIds(value: unknown): InitialTeamBuildIds {
  if (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((buildId) => typeof buildId === "string" || buildId === null)
  ) {
    return value as InitialTeamBuildIds;
  }
  return [null, null, null];
}

function normalizeFinalPlacement(value: unknown): TeamFinalPlacement | null {
  return value === 1 || value === 2 || value === 3 ? value : null;
}

function normalizeFinalBuildPlacements(value: unknown): TeamFinalBuildPlacements {
  if (!Array.isArray(value) || value.length !== 3) return [null, null, null];
  return value.map((placement) =>
    Number.isInteger(placement) && Number(placement) >= 1 && Number(placement) <= 9
      ? Number(placement) as TeamUmaPlacement
      : null,
  ) as TeamFinalBuildPlacements;
}

export function normalizeEventResults(value: unknown, event: string): EventResults {
  if (!value || typeof value !== "object") return createEmptyEventResults(event);

  const data = value as Record<string, unknown>;
  if (
    !("results" in data) &&
    (
      "round1Day1" in data ||
      "round1Day2" in data ||
      "round2Day1" in data ||
      "round2Day2" in data ||
      (data.finals !== null && typeof data.finals === "object")
    )
  ) {
    return normalizeGroupedEventResults(data, event);
  }

  // REMOVE the legacy-shape normalization path after legacy API and IndexedDB records are migrated.
  const ticketCounts = normalizeTeamTicketCounts(data.ticketCounts, data.ticketsUsed);
  const results = normalizeTeamResults(data.results);
  for (const row of teamResultRows) {
    if (row !== "finals" && results[row] === null) {
      results[row] = [0, 0, 0, 0];
      ticketCounts[row] = 0;
    }
    const rowResults = results[row];
    rowResults?.forEach((_, index) => {
      if (index >= ticketCounts[row]) {
        rowResults[index as 0 | 1 | 2 | 3] = 0;
      }
    });
  }

  return {
    event,
    detailMode: "full",
    results,
    finalPlacement: normalizeFinalPlacement(data.finalPlacement),
    finalBuildPlacements: normalizeFinalBuildPlacements(data.finalBuildPlacements),
    buildAssignments: normalizeTeamBuildAssignments(
      data.buildAssignments ?? data.buildOverrides,
      ticketCounts,
    ),
    ticketBuildResults: normalizeTeamTicketBuildResults(
      data.ticketBuildResults,
      ticketCounts,
    ),
    ticketCounts,
    initialBuildIds: normalizeInitialBuildIds(data.initialBuildIds),
    lastUpdate: typeof data.lastUpdate === "number" ? data.lastUpdate : 0,
  };
}

export function serializeEventResults(results: EventResults): Record<string, unknown> {
  const serialized: Record<string, unknown> = {
    lastUpdate: results.lastUpdate,
    detailMode: results.detailMode,
  };

  for (const row of teamResultRows) {
    if (row === "finals") continue;
    if (results.results[row] === null) {
      serialized[row] = {};
      continue;
    }

    const tickets: Record<string, unknown> = {};
    for (let index = 0; index < results.ticketCounts[row]; index += 1) {
      const ticket = (index + 1) as TeamTicket;
      const savedBuilds = results.ticketBuildResults[row]?.[ticket];

      const builds = ([1, 2, 3] as const).map((slot) => {
        const buildId = resolveResultBuildId(results, row, ticket, slot);
        if (!buildId) return null;
        const savedBuild = savedBuilds?.find((build) => build.slot === slot);
        return { buildId, wins: savedBuild?.wins ?? 0 };
      });

      if (builds.some((build) => build === null)) continue;

      const ticketData: Record<string, unknown> = { builds };
      if (savedBuilds?.length === 0) {
        ticketData.teamWins = results.results[row]?.[index] ?? 0;
      }
      tickets[ticket] = ticketData;
    }
    serialized[row] = tickets;
  }

  serialized.finals = {
    placement: results.finalPlacement,
    builds: ([1, 2, 3] as const).map((slot) => ({
      buildId: results.buildAssignments.finals?.[slot]
        ?.find((assignment) => assignment.tickets.includes(1))?.buildId ?? null,
      placement: results.finalBuildPlacements[slot - 1],
    })),
  };
  return serialized;
}
