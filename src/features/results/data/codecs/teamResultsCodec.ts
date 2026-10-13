import {
  createDefaultTeamResults,
  type TeamResultCounts,
  type TeamResults,
} from "../../domain/resultsTypes";

function isTeamResultCounts(value: unknown): value is TeamResultCounts {
  return Array.isArray(value) &&
    value.length === 4 &&
    value.every((count) =>
      typeof count === "number" &&
      Number.isInteger(count) &&
      count >= 0 &&
      count <= 5
    );
}

interface LegacyTeamResults {
  day1: TeamResultCounts;
  day2: TeamResultCounts;
  finals: TeamResultCounts;
}

// REMOVE after legacy API and IndexedDB result records have all been migrated.
export function isTeamResults(value: unknown): value is TeamResults | LegacyTeamResults {
  if (!value || typeof value !== "object") return false;
  const results = value as Record<string, unknown>;
  const validRound = (day1: unknown, day2: unknown) =>
    (day1 === null && day2 === null) ||
    (isTeamResultCounts(day1) && isTeamResultCounts(day2));
  return (
    (
      validRound(results.round1Day1, results.round1Day2) &&
      validRound(results.round2Day1, results.round2Day2) &&
      isTeamResultCounts(results.finals)
    ) ||
    (
      isTeamResultCounts(results.day1) &&
      isTeamResultCounts(results.day2) &&
      isTeamResultCounts(results.finals)
    )
  );
}

export function normalizeTeamResults(value: unknown): TeamResults {
  if (!isTeamResults(value)) return createDefaultTeamResults();
  if ("round1Day1" in value) return value;

  return {
    ...createDefaultTeamResults(),
    round1Day1: value.day1,
    round1Day2: value.day2,
    finals: value.finals,
  };
}

