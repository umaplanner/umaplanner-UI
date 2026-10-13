import {
  createDefaultTicketCounts,
  teamResultRows,
  type TeamRaceResultRow,
  type TeamTicket,
  type TeamTicketBuildResult,
  type TeamTicketBuildResults,
  type TeamTicketCount,
  type TeamTicketCounts,
} from "../../domain/resultsTypes";

function legacyTicketCount(value: unknown): TeamTicketCount | null {
  if (!Array.isArray(value) || value.length !== 4 || !value.every((used) => typeof used === "boolean")) {
    return null;
  }
  const lastUsed = value.lastIndexOf(true);
  return Math.max(1, lastUsed + 1) as TeamTicketCount;
}

// REMOVE the legacyTicketsUsed fallback after legacy result records are migrated.
export function normalizeTeamTicketCounts(
  value: unknown,
  legacyTicketsUsed?: unknown,
): TeamTicketCounts {
  const counts = createDefaultTicketCounts();
  const data = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  const legacy = legacyTicketsUsed && typeof legacyTicketsUsed === "object" &&
      !Array.isArray(legacyTicketsUsed)
    ? legacyTicketsUsed as Record<string, unknown>
    : {};

  for (const row of teamResultRows) {
    if (row === "finals") {
      counts[row] = 1;
      continue;
    }

    const count = data[row];
    if (Number.isInteger(count) && Number(count) >= 0 && Number(count) <= 4) {
      counts[row] = Number(count) as TeamTicketCount;
    } else {
      counts[row] = legacyTicketCount(legacy[row]) ?? 4;
    }
  }
  return counts;
}

export function isTeamTicketBuildResults(value: unknown): value is TeamTicketBuildResults {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const validRows: TeamRaceResultRow[] = [
    "round1Day1",
    "round1Day2",
    "round2Day1",
    "round2Day2",
  ];

  return Object.entries(value).every(([row, tickets]) => {
    if (
      !validRows.includes(row as TeamRaceResultRow) ||
      !tickets ||
      typeof tickets !== "object" ||
      Array.isArray(tickets)
    ) return false;

    return Object.entries(tickets).every(([ticket, builds]) => {
      if (
        !["1", "2", "3", "4"].includes(ticket) ||
        !Array.isArray(builds) ||
        builds.length > 3
      ) return false;

      const slots = new Set<number>();
      const buildIds = new Set<string>();
      let winsTotal = 0;
      for (const build of builds) {
        if (!build || typeof build !== "object" || Array.isArray(build)) return false;

        const data = build as Record<string, unknown>;
        if (
          typeof data.buildId !== "string" ||
          data.buildId.length === 0 ||
          ![1, 2, 3].includes(Number(data.slot)) ||
          !Number.isInteger(data.wins) ||
          Number(data.wins) < 0 ||
          Number(data.wins) > 5 ||
          slots.has(Number(data.slot)) ||
          buildIds.has(data.buildId)
        ) return false;

        slots.add(Number(data.slot));
        buildIds.add(data.buildId);
        winsTotal += Number(data.wins);
      }
      return winsTotal <= 5;
    });
  });
}

export function normalizeTeamTicketBuildResults(
  value: unknown,
  ticketCounts: TeamTicketCounts,
): TeamTicketBuildResults {
  if (!isTeamTicketBuildResults(value)) return {};

  const normalized: TeamTicketBuildResults = {};
  for (const row of Object.keys(value) as TeamRaceResultRow[]) {
    const normalizedTickets: Partial<Record<TeamTicket, TeamTicketBuildResult[]>> = {};

    for (const [ticketKey, builds] of Object.entries(value[row] ?? {})) {
      const ticket = Number(ticketKey) as TeamTicket;
      if (ticket > ticketCounts[row]) continue;

      normalizedTickets[ticket] = builds.map((build) => ({
        buildId: build.buildId,
        slot: build.slot,
        wins: build.wins,
      }));
    }
    if (Object.keys(normalizedTickets).length > 0) normalized[row] = normalizedTickets;
  }
  return normalized;
}
