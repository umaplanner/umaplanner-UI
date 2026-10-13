import {
  createDefaultTicketCounts,
  teamResultRows,
  type TeamBuildAssignment,
  type TeamBuildAssignments,
  type TeamResultRow,
  type TeamTicket,
  type TeamTicketCounts,
  type UmaSlot,
} from "../../domain/resultsTypes";

type LegacyTeamBuildOverrides = Record<string, unknown>;

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

