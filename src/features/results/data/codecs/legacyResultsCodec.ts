import {
  createEmptyEventResults,
  setBuildAssignmentTickets,
  teamResultRows,
  type EventResults,
  type TeamBuildAssignments,
  type TeamFinalBuildPlacements,
  type TeamFinalPlacement,
  type TeamTicket,
  type TeamTicketBuildResult,
  type TeamTicketBuildResults,
  type TeamTicketCount,
  type TeamUmaPlacement,
  type UmaSlot,
} from "../../domain/resultsTypes";
function normalizeFinalPlacement(value: unknown): TeamFinalPlacement | null {
  return value === 1 || value === 2 || value === 3 ? value : null;
}

export function normalizeGroupedEventResults(
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
