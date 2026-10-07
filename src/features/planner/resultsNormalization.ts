import {
  createDefaultTeamResults,
  createDefaultTicketCounts,
  createEmptyEventResults,
  teamResultRows,
  type EventResults,
  type InitialTeamBuildIds,
  type TeamBuildAssignment,
  type TeamBuildAssignments,
  type TeamFinalBuildPlacements,
  type TeamFinalPlacement,
  type TeamRaceResultRow,
  type TeamResultCounts,
  type TeamResultRow,
  type TeamResults,
  type TeamTicket,
  type TeamTicketBuildResult,
  type TeamTicketBuildResults,
  type TeamTicketCount,
  type TeamTicketCounts,
  type TeamUmaPlacement,
  type UmaSlot,
} from "./resultsTypes";

type LegacyTeamBuildOverrides = Record<string, unknown>;

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

export function isTeamBuildOverrides(value: unknown): value is LegacyTeamBuildOverrides {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const overrides = value as Record<string, unknown>;
  return Object.entries(overrides).every(([row, rowOverrides]) => {
    if (!teamResultRows.includes(row as TeamResultRow)) return false;
    if (!rowOverrides || typeof rowOverrides !== "object" || Array.isArray(rowOverrides)) {
      return false;
    }
    const entries = Object.entries(rowOverrides);
    if (entries.some(([, value]) => typeof value === "string")) {
      return entries.every(([slot, buildId]) =>
        ["1", "2", "3"].includes(slot) && typeof buildId === "string"
      );
    }
    return entries.every(([ticket, ticketOverrides]) => {
      if (!["1", "2", "3", "4"].includes(ticket)) return false;
      if (
        !ticketOverrides ||
        typeof ticketOverrides !== "object" ||
        Array.isArray(ticketOverrides)
      ) return false;
      return Object.entries(ticketOverrides).every(([slot, buildId]) =>
        ["1", "2", "3"].includes(slot) && typeof buildId === "string"
      );
    });
  });
}

export function isTeamBuildAssignments(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (isTeamBuildOverrides(value)) return true;
  const assignments = value as Record<string, unknown>;
  return Object.entries(assignments).every(([row, rowAssignments]) => {
    if (!teamResultRows.includes(row as TeamResultRow)) return false;
    if (!rowAssignments || typeof rowAssignments !== "object" || Array.isArray(rowAssignments)) {
      return false;
    }
    return Object.entries(rowAssignments).every(([slot, builds]) => {
      if (!["1", "2", "3"].includes(slot) || !Array.isArray(builds)) return false;
      const usedTickets = new Set<number>();
      return builds.every((build) => {
        if (!build || typeof build !== "object" || Array.isArray(build)) return false;
        const data = build as Record<string, unknown>;
        if (
          (typeof data.buildId !== "string" && data.buildId !== null) ||
          !Array.isArray(data.tickets) ||
          !data.tickets.every((ticket) =>
            Number.isInteger(ticket) && Number(ticket) >= 1 && Number(ticket) <= 4
          ) ||
          new Set(data.tickets).size !== data.tickets.length
        ) return false;
        for (const ticket of data.tickets as number[]) {
          if (usedTickets.has(ticket)) return false;
          usedTickets.add(ticket);
        }
        return true;
      });
    });
  });
}

function legacyTicketCount(value: unknown): TeamTicketCount | null {
  if (!Array.isArray(value) || value.length !== 4 || !value.every((used) => typeof used === "boolean")) {
    return null;
  }
  const lastUsed = value.lastIndexOf(true);
  return Math.max(1, lastUsed + 1) as TeamTicketCount;
}

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

export function normalizeTeamBuildAssignments(
  value: unknown,
  ticketCounts: TeamTicketCounts = createDefaultTicketCounts(),
): TeamBuildAssignments {
  const normalized: TeamBuildAssignments = {};
  if (isTeamBuildOverrides(value)) {
    const legacy = value as Record<string, Record<string, unknown>>;
    for (const row of teamResultRows) {
      const rowOverrides = legacy[row];
      if (!rowOverrides) continue;
      const grouped = new Map<UmaSlot, Map<string, TeamTicket[]>>();
      const entries = Object.entries(rowOverrides);
      if (entries.some(([, buildId]) => typeof buildId === "string")) {
        for (const [slotKey, buildId] of entries) {
          const slot = Number(slotKey) as UmaSlot;
          if (typeof buildId !== "string") continue;
          grouped.set(slot, new Map([[buildId, Array.from(
            { length: ticketCounts[row] },
            (_, index) => (index + 1) as TeamTicket,
          )]]));
        }
      } else {
        for (const [ticketKey, ticketOverrides] of entries) {
          const ticket = Number(ticketKey) as TeamTicket;
          if (ticket > ticketCounts[row]) continue;
          for (const [slotKey, buildId] of Object.entries(ticketOverrides as Record<string, string>)) {
            const slot = Number(slotKey) as UmaSlot;
            const byBuild = grouped.get(slot) ?? new Map<string, TeamTicket[]>();
            byBuild.set(buildId, [...(byBuild.get(buildId) ?? []), ticket]);
            grouped.set(slot, byBuild);
          }
        }
      }
      const slots: Partial<Record<UmaSlot, TeamBuildAssignment[]>> = {};
      for (const [slot, byBuild] of grouped) {
        slots[slot] = Array.from(byBuild, ([buildId, tickets]) => ({ buildId, tickets }));
      }
      normalized[row] = slots;
    }
    return normalized;
  }

  if (!isTeamBuildAssignments(value)) return normalized;
  const data = value as Record<string, Record<string, TeamBuildAssignment[]>>;
  for (const row of teamResultRows) {
    const rowAssignments = data[row];
    if (!rowAssignments) continue;
    const slots: Partial<Record<UmaSlot, TeamBuildAssignment[]>> = {};
    for (const slot of [1, 2, 3] as const) {
      const byBuild = new Map<string | null, Set<TeamTicket>>();
      for (const assignment of rowAssignments[slot] ?? []) {
        const tickets = assignment.tickets
          .filter((ticket) => ticket <= ticketCounts[row]);
        const existing = byBuild.get(assignment.buildId) ?? new Set<TeamTicket>();
        tickets.forEach((ticket) => existing.add(ticket));
        byBuild.set(assignment.buildId, existing);
      }
      const builds = Array.from(byBuild, ([buildId, tickets]) => ({
        buildId,
        tickets: Array.from(tickets),
      })).filter((assignment) => row !== "finals" || assignment.tickets.length > 0);
      if (builds.length > 0) slots[slot] = builds;
    }
    if (Object.keys(slots).length > 0) normalized[row] = slots;
  }
  return normalized;
}

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
  const ticketCounts = normalizeTeamTicketCounts(data.ticketCounts, data.ticketsUsed);
  const results = normalizeTeamResults(data.results);
  for (const row of teamResultRows) {
    const rowResults = results[row];
    rowResults?.forEach((_, index) => {
      if (index >= ticketCounts[row]) {
        rowResults[index as 0 | 1 | 2 | 3] = 0;
      }
    });
  }
  return {
    event,
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

export function getLegacyEventResults(value: unknown, event: string): EventResults | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (!isTeamResults(data.results)) return null;
  return {
    event,
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
