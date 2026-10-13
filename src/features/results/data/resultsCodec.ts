import {
  createDefaultTeamResults,
  createDefaultTicketCounts,
  createEmptyEventResults,
  resolveResultBuildId,
  setBuildAssignmentTickets,
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
} from "../domain/resultsTypes";

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

// REMOVE after legacy API and IndexedDB result records have all been migrated.
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

export function normalizeTeamBuildAssignments(
  value: unknown,
  ticketCounts: TeamTicketCounts = createDefaultTicketCounts(),
): TeamBuildAssignments {
  const normalized: TeamBuildAssignments = {};
  // REMOVE legacy override handling after legacy API and IndexedDB records are migrated.
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

function normalizeGroupedEventResults(
  data: Record<string, unknown>,
  event: string,
): EventResults {
  const normalized = createEmptyEventResults(event);
  const results = { ...normalized.results };
  const ticketCounts = { ...normalized.ticketCounts };
  const ticketBuildResults: TeamTicketBuildResults = {};
  let buildAssignments: TeamBuildAssignments = {};

  for (const row of teamResultRows) {
    if (row === "finals") continue;
    const tickets = data[row];
    if (tickets === null) {
      results[row] = [0, 0, 0, 0];
      ticketCounts[row] = 0;
      continue;
    }
    if (!tickets || typeof tickets !== "object" || Array.isArray(tickets)) continue;

    const savedTickets: Partial<Record<TeamTicket, TeamTicketBuildResult[]>> = {};
    for (const [ticketKey, ticketValue] of Object.entries(tickets)) {
      const ticket = Number(ticketKey);
      if (!Number.isInteger(ticket) || ticket < 1 || ticket > 4) continue;
      if (!ticketValue || typeof ticketValue !== "object" || Array.isArray(ticketValue)) {
        continue;
      }
      const ticketData = ticketValue as Record<string, unknown>;
      if (!Array.isArray(ticketData.builds) || ticketData.builds.length !== 3) continue;
      const builds = ticketData.builds.map((build, index) => {
        if (!build || typeof build !== "object" || Array.isArray(build)) return null;
        const buildData = build as Record<string, unknown>;
        if (
          typeof buildData.buildId !== "string" ||
          buildData.buildId.length === 0 ||
          !Number.isInteger(buildData.wins) ||
          Number(buildData.wins) < 0 ||
          Number(buildData.wins) > 5
        ) return null;
        return {
          buildId: buildData.buildId,
          slot: (index + 1) as UmaSlot,
          wins: Number(buildData.wins),
        };
      });
      if (builds.some((build) => build === null)) continue;

      const teamWins = Number.isInteger(ticketData.teamWins) &&
          Number(ticketData.teamWins) >= 0 && Number(ticketData.teamWins) <= 5
        ? Number(ticketData.teamWins)
        : builds.reduce((total, build) => total + (build?.wins ?? 0), 0);
      results[row]![ticket - 1] = teamWins;
      savedTickets[ticket as TeamTicket] = builds as TeamTicketBuildResult[];
      ticketCounts[row] = Math.max(ticketCounts[row], ticket) as TeamTicketCount;
      for (const build of builds as TeamTicketBuildResult[]) {
        buildAssignments = setBuildAssignmentTickets(
          buildAssignments,
          row,
          build.slot,
          build.buildId,
          ticket as TeamTicket,
        );
      }
    }
    if (Object.keys(savedTickets).length > 0) ticketBuildResults[row] = savedTickets;
  }

  const finalsData = data.finals && typeof data.finals === "object" &&
      !Array.isArray(data.finals)
    ? data.finals as Record<string, unknown>
    : {};
  const finalBuilds = Array.isArray(finalsData.builds) ? finalsData.builds : [];
  const finalBuildPlacements = ([0, 1, 2] as const).map((index) => {
    const build = finalBuilds[index];
    if (!build || typeof build !== "object" || Array.isArray(build)) return null;
    const placement = (build as Record<string, unknown>).placement;
    return Number.isInteger(placement) && Number(placement) >= 1 && Number(placement) <= 9
      ? Number(placement) as TeamUmaPlacement
      : null;
  }) as TeamFinalBuildPlacements;
  for (const [index, build] of finalBuilds.slice(0, 3).entries()) {
    if (!build || typeof build !== "object" || Array.isArray(build)) continue;
    const buildId = (build as Record<string, unknown>).buildId;
    if (typeof buildId !== "string" || buildId.length === 0) continue;
    buildAssignments = setBuildAssignmentTickets(
      buildAssignments,
      "finals",
      (index + 1) as UmaSlot,
      buildId,
      1,
    );
  }

  const finalPlacement = normalizeFinalPlacement(finalsData.placement);
  return {
    ...normalized,
    results,
    ticketCounts,
    ticketBuildResults,
    buildAssignments,
    finalPlacement,
    finalBuildPlacements,
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
