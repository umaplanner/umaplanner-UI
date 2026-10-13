import {
  isTeamBuildAssignments,
  isTeamResults,
  isTeamTicketBuildResults,
  normalizeEventResults as normalizeLegacyEventResults,
  normalizeTeamResults,
  normalizeTeamTicketCounts,
} from "./resultsCodec";
import type { EventResults } from "../domain/resultsTypes";

// Remove this module once legacy team records no longer embed results.
export function getLegacyEventResults(
  value: unknown,
  event: string,
): EventResults | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (!isTeamResults(data.results)) return null;
  return {
    event,
    detailMode: "full",
    results: normalizeTeamResults(data.results),
    finalPlacement: null,
    finalBuildPlacements: [null, null, null],
    buildAssignments: {},
    ticketBuildResults: {},
    ticketCounts: normalizeTeamTicketCounts(undefined),
    initialBuildIds: [null, null, null],
    lastUpdate: typeof data.lastUpdate === "number" ? data.lastUpdate : 0,
  };
}

export function isLegacyEventResults(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  const assignments = data.buildAssignments ?? data.buildOverrides;
  return isTeamResults(data.results) &&
    (assignments === undefined || isTeamBuildAssignments(assignments)) &&
    (data.ticketBuildResults === undefined ||
      isTeamTicketBuildResults(data.ticketBuildResults));
}

export function migrateLegacyEventResults(
  value: unknown,
  event: string,
): EventResults {
  if (isLegacyEventResults(value)) {
    return normalizeLegacyEventResults(value, event);
  }
  return {
    event,
    detailMode: "full",
    results: normalizeTeamResults(undefined),
    finalPlacement: null,
    finalBuildPlacements: [null, null, null],
    buildAssignments: {},
    ticketBuildResults: {},
    ticketCounts: normalizeTeamTicketCounts(undefined),
    initialBuildIds: [null, null, null],
    lastUpdate: 0,
  };
}
