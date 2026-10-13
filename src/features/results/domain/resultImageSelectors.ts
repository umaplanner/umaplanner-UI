import type { StoredUmaBuild } from "../../../types/UmaBuild";
import type { UmaEntry } from "../../../types/UmaEntry";
import type {
  ResultImageDay,
  ResultImageSummary,
} from "../ResultsImage";
import {
  getTicketBuildResults,
} from "./resultSelectors";
import type { ResultBuildSummary } from "./types";
import type {
  InitialTeamBuildIds,
  TeamBuildAssignments,
  TeamFinalBuildPlacements,
  TeamFinalPlacement,
  TeamResults,
  TeamTicketBuildResults,
  TeamTicketCounts,
} from "./resultsTypes";

const resultGroups = [
  {
    title: "Round 1" as const,
    rows: [
      { row: "round1Day1" as const, label: "Day 1" },
      { row: "round1Day2" as const, label: "Day 2" },
    ],
  },
  {
    title: "Round 2" as const,
    rows: [
      { row: "round2Day1" as const, label: "Day 1" },
      { row: "round2Day2" as const, label: "Day 2" },
    ],
  },
];

interface Inputs {
  results: TeamResults;
  buildAssignments: TeamBuildAssignments;
  ticketBuildResults: TeamTicketBuildResults;
  ticketCounts: TeamTicketCounts;
  initialBuildIds: InitialTeamBuildIds;
  finalPlacement: TeamFinalPlacement | null;
  finalBuildPlacements: TeamFinalBuildPlacements;
  availableBuilds: StoredUmaBuild[];
  umaList: UmaEntry[];
  summaryBuilds: ResultBuildSummary[];
  finalBuilds: [StoredUmaBuild | undefined, StoredUmaBuild | undefined, StoredUmaBuild | undefined];
  hasFinalsData: boolean;
  totalWins: number;
  totalRaces: number;
  totalWinRate: number | null;
}

export function getResultImageData({
  results,
  buildAssignments,
  ticketBuildResults,
  ticketCounts,
  initialBuildIds,
  finalPlacement,
  finalBuildPlacements,
  availableBuilds,
  umaList,
  summaryBuilds,
  finalBuilds,
  hasFinalsData,
  totalWins,
  totalRaces,
  totalWinRate,
}: Inputs): { days: ResultImageDay[]; summary: ResultImageSummary } {
  const getBuild = (buildId: string | null) =>
    buildId ? availableBuilds.find((entry) => entry.id === buildId) : undefined;
  const getUmaForBuild = (build: StoredUmaBuild | undefined) =>
    build
      ? umaList.find((entry) => String(entry.id) === build.outfitId) ?? null
      : null;
  const imageDays = resultGroups.flatMap((group) =>
    group.rows.flatMap(({ row, label }) => {
      const count = ticketCounts[row];
      const counts = results[row];
      if (!counts || count === 0) return [];

      const wins = counts.slice(0, count).reduce((total, value) => total + value, 0);
      const dayBuilds = new Map<string, {
        id: string;
        slot: 1 | 2 | 3;
        name: string;
        uma: ReturnType<typeof getUmaForBuild>;
        wins: number;
        appearances: number;
        recordedWins: number;
        ticketNumbers: Set<1 | 2 | 3 | 4>;
      }>();
      const tickets = Array.from({ length: count }, (_, index) => {
        const ticket = (index + 1) as 1 | 2 | 3 | 4;
        const builds = getTicketBuildResults(
          { buildAssignments, ticketBuildResults, ticketCounts, initialBuildIds },
          row,
          ticket,
        );
        for (const build of builds) {
          if (!build.buildId) continue;
          const storedBuild = getBuild(build.buildId);
          const aggregate = dayBuilds.get(build.buildId) ?? {
            id: build.buildId,
            slot: build.slot,
            name: storedBuild?.name || `Uma ${build.slot}`,
            uma: getUmaForBuild(storedBuild),
            wins: 0,
            appearances: 0,
            recordedWins: 0,
            ticketNumbers: new Set<1 | 2 | 3 | 4>(),
          };
          aggregate.appearances += 1;
          aggregate.ticketNumbers.add(ticket);
          if (build.wins !== null) {
            aggregate.wins += build.wins;
            aggregate.recordedWins += 1;
          }
          dayBuilds.set(build.buildId, aggregate);
        }
        const allBuildWinsRecorded = builds.every((build) => build.wins !== null);
        const ticketWins = allBuildWinsRecorded
          ? builds.reduce((total, build) => total + (build.wins ?? 0), 0)
          : counts[index];
        return { number: ticket, wins: ticketWins };
      });
      const buildStats = Array.from(dayBuilds.values(), (build) => {
        const hasCompleteWinData = build.recordedWins === build.appearances;
        const raceCount = build.appearances * 5;
        return {
          id: build.id,
          slot: build.slot,
          name: build.name,
          uma: build.uma,
          wins: build.wins,
          raceCount,
          winRate: hasCompleteWinData && raceCount > 0
            ? (build.wins / raceCount) * 100
            : null,
          ticketNumbers: Array.from(build.ticketNumbers),
          hasCompleteWinData,
        };
      });
      return [{
        row,
        round: group.title,
        label,
        wins,
        ticketCount: count,
        winRate: (wins / (count * 5)) * 100,
        tickets,
        builds: buildStats,
      }];
    }),
  );

  return {
    days: imageDays,
    summary: {
      totalWins,
      totalRaces,
      totalWinRate,
      finalPlacement,
      finalsBuilds: hasFinalsData
        ? ([1, 2, 3] as const).flatMap((slot, index) => {
          const build = finalBuilds[index];
          return build
            ? [{
              id: build.id,
              slot,
              name: build.name || "Unnamed build",
              uma: getUmaForBuild(build),
              placement: finalBuildPlacements[index],
            }]
            : [];
        })
        : [],
      builds: summaryBuilds.map(({ build, wins, raceCount, slot }) => ({
        id: build.id,
        slot,
        name: build.name || "Unnamed build",
        wins,
        raceCount,
        uma: getUmaForBuild(build),
      })),
    },
  };
}
