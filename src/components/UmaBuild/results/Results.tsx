import { useState } from "react";
import {
  resolveResultBuildId,
  teamResultRows,
} from "../../../features/planner/plannerTypes";
import type {
  InitialTeamBuildIds,
  TeamBuildAssignments,
  TeamFinalBuildPlacements,
  TeamFinalPlacement,
  TeamRaceResultRow,
  TeamResultRow,
  TeamResults,
  TeamTicket,
  TeamTicketBuildResult,
  TeamTicketBuildResults,
  TeamTicketCount,
} from "../../../features/planner/plannerTypes";
import type { StoredUmaBuild } from "../../../types/UmaBuild";
import type { SkillEntry } from "../../../types/SkillEntry";
import type { UmaEntry } from "../../../types/UmaEntry";
import { useResultCollapsePreferences } from "../../Preferences";
import FinalsEditor from "./FinalsEditor";
import Group from "./Group";
import type {
  EffectiveResultBuildLookup,
  ResultBuildLookup,
  ResultGroup,
  ResultBuildSummary,
  ResolvedTicketBuildResult,
} from "./types";
import Summary from "./Summary";
import "../../../styles/Builds.css";
import "../../../styles/UmaBuildResults.css";

interface Props {
  event: string;
  results: TeamResults;
  resultAvailability?: Record<TeamResultRow, boolean>;
  resultOpeningDates?: Record<TeamResultRow, Date | null>;
  buildAssignments: TeamBuildAssignments;
  ticketBuildResults: TeamTicketBuildResults;
  ticketCounts: Record<TeamResultRow, TeamTicketCount>;
  initialBuildIds: InitialTeamBuildIds;
  finalPlacement: TeamFinalPlacement | null;
  finalBuildPlacements?: TeamFinalBuildPlacements;
  availableBuilds: StoredUmaBuild[];
  umaList: UmaEntry[];
  skillList: SkillEntry[];
  showSupportCards: boolean;
  onSaveTicket: (
    row: TeamRaceResultRow,
    ticket: TeamTicket,
    builds: TeamTicketBuildResult[],
    teamWins?: number,
  ) => void;
  onRemoveTicket: (row: TeamRaceResultRow, ticket: TeamTicket) => void;
  onSaveFinals: (
    buildIds: InitialTeamBuildIds,
    buildPlacements: TeamFinalBuildPlacements,
    placement: 1 | 2 | 3,
  ) => void;
}

const resultGroups: ResultGroup[] = [
  {
    title: "Round 1",
    rows: [
      { row: "round1Day1", label: "Day 1" },
      { row: "round1Day2", label: "Day 2" },
    ],
  },
  {
    title: "Round 2",
    rows: [
      { row: "round2Day1", label: "Day 1" },
      { row: "round2Day2", label: "Day 2" },
    ],
  },
];

export default function Results({
  event,
  results,
  resultOpeningDates,
  resultAvailability = {
    round1Day1: true,
    round1Day2: true,
    round2Day1: true,
    round2Day2: true,
    finals: true,
  },
  buildAssignments,
  ticketBuildResults,
  ticketCounts,
  initialBuildIds,
  finalPlacement,
  finalBuildPlacements = [null, null, null],
  availableBuilds,
  umaList,
  skillList,
  showSupportCards,
  onSaveTicket,
  onRemoveTicket,
  onSaveFinals,
}: Props) {
  const selectableBuilds = availableBuilds.filter(
    (build) => build["build-type"] !== "plan",
  );
  const { collapsedGroups, setCollapsedGroups } =
    useResultCollapsePreferences(event);
  const [isFinalsEditorOpen, setIsFinalsEditorOpen] = useState(false);
  const lineupSource = { buildAssignments, ticketCounts, initialBuildIds };

  const getEffectiveBuildId: EffectiveResultBuildLookup = (row, ticket, slot) =>
    resolveResultBuildId(lineupSource, row, ticket, slot);

  const getBuild: ResultBuildLookup = (buildId) =>
    buildId ? availableBuilds.find((entry) => entry.id === buildId) : undefined;

  function getTicketBuildResults(
    row: TeamRaceResultRow,
    ticket: TeamTicket,
  ): ResolvedTicketBuildResult[] {
    return ([1, 2, 3] as const).flatMap((slot) => {
      const saved = ticketBuildResults[row]?.[ticket]?.find(
        (build) => build.slot === slot,
      );
      const assigned = buildAssignments[row]?.[slot]
        ?.find((assignment) => assignment.tickets.includes(ticket))
        ?.buildId;
      const buildId = saved?.buildId ?? assigned ??
        (ticketBuildResults[row]?.[ticket] === undefined
          ? getEffectiveBuildId(row, ticket, slot)
          : null);
      return [{
        buildId: buildId ?? "",
        slot,
        wins: saved?.wins ?? null,
      }];
    });
  }

  function addTicket(row: TeamRaceResultRow) {
    const count = ticketCounts[row];
    if (!resultAvailability[row] || count >= 4) return;
    const ticket = (count + 1) as TeamTicket;
    const previousTicket = count > 0 ? count as TeamTicket : 1;
    const builds = ([1, 2, 3] as const).flatMap((slot) => {
      const buildId = getEffectiveBuildId(row, previousTicket, slot);
      return buildId ? [{ buildId, slot, wins: 0 }] : [];
    });
    onSaveTicket(
      row,
      ticket,
      builds,
    );
  }

  const summaryBuilds: ResultBuildSummary[] = (() => {
    const byBuild = new Map<string, ResultBuildSummary>();

    for (const row of teamResultRows) {
      if (row === "finals" || results[row] === null) continue;
      for (let index = 0; index < ticketCounts[row]; index += 1) {
        const ticket = (index + 1) as TeamTicket;
        const savedBuildResults = ticketBuildResults[row]?.[ticket] ?? [];
        for (const slot of [1, 2, 3] as const) {
          const saved = savedBuildResults.find((entry) => entry.slot === slot);
          const assigned = buildAssignments[row]?.[slot]
            ?.find((assignment) => assignment.tickets.includes(ticket))
            ?.buildId;
          const buildId = saved?.buildId ?? assigned ??
            (ticketBuildResults[row]?.[ticket] === undefined
              ? getEffectiveBuildId(row, ticket, slot)
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

    if (finalPlacement !== null) {
      for (const slot of [1, 2, 3] as const) {
        const finalBuildId = buildAssignments.finals?.[slot]
          ?.find((assignment) => assignment.tickets.includes(1))
          ?.buildId;
        if (!finalBuildId) continue;

        const summary = byBuild.get(finalBuildId);
        const finalBuild = getBuild(finalBuildId);
        if (!finalBuild) continue;
        const finalSummary = summary ?? {
          build: finalBuild,
          wins: 0,
          raceCount: 0,
          slot,
        };

        finalSummary.raceCount += 1;
        if (finalBuildPlacements[slot - 1] === 1) {
          finalSummary.wins += 1;
        }
        byBuild.set(finalBuildId, finalSummary);
      }
    }

    return Array.from(byBuild.values());
  })();

  const canShowBuildWinRates =
    results.round1Day1 !== null || results.round1Day2 !== null ||
    results.round2Day1 !== null || results.round2Day2 !== null;
  const roundWins = teamResultRows.reduce((total, row) => {
      if (row === "finals" || results[row] === null) return total;
      return total + (results[row]?.slice(0, ticketCounts[row])
        .reduce((rowTotal, wins) => rowTotal + wins, 0) ?? 0);
    }, 0);
  const roundTicketCount = teamResultRows.reduce((total, row) => {
      if (row === "finals" || results[row] === null) return total;
      return total + ticketCounts[row];
    }, 0);
  const totalWins = roundWins + (finalPlacement === 1 ? 1 : 0);
  const totalRaces = roundTicketCount * 5 + (finalPlacement === null ? 0 : 1);
  const totalWinRate = totalRaces > 0
    ? (totalWins / totalRaces) * 100
    : null;
  const hasFinalsData = finalPlacement !== null ||
    ([1, 2, 3] as const).some((slot) =>
      buildAssignments.finals?.[slot]?.some((assignment) => assignment.tickets.includes(1)),
    );
  const finalBuilds = ([1, 2, 3] as const).map((slot) =>
    getBuild(getEffectiveBuildId("finals", 1, slot)),
  ) as [StoredUmaBuild | undefined, StoredUmaBuild | undefined, StoredUmaBuild | undefined];

  return (
    <section className="uma-build-results" aria-label="Team results">
      <Summary
        finalPlacement={finalPlacement}
        finalBuildPlacements={finalBuildPlacements}
        finalBuilds={finalBuilds}
        hasFinalsData={hasFinalsData}
        canAddFinals={resultAvailability.finals}
        finalsOpeningDate={resultOpeningDates?.finals ?? null}
        summaryBuilds={summaryBuilds}
        totalWinRate={totalWinRate}
        totalWins={totalWins}
        totalRaces={totalRaces}
        canShowBuildWinRates={canShowBuildWinRates}
        umaList={umaList}
        skillList={skillList}
        showSupportCards={showSupportCards}
        onEditFinals={() => setIsFinalsEditorOpen(true)}
      />
      {resultGroups.map((group) => (
        <Group
          key={group.title}
          group={group}
          results={results}
          ticketCounts={ticketCounts}
          resultAvailability={resultAvailability}
          resultOpeningDates={resultOpeningDates}
          collapsed={collapsedGroups[group.title] ?? false}
          umaList={umaList}
          availableBuilds={availableBuilds}
          onToggleCollapsed={(title) =>
            setCollapsedGroups((current) => ({
              ...current,
              [title]: !(current[title] ?? false),
            }))}
          onAddTicket={addTicket}
          onRemoveTicket={onRemoveTicket}
          onSaveTicket={onSaveTicket}
          getTicketBuildResults={getTicketBuildResults}
          getBuild={getBuild}
        />
      ))}
      {isFinalsEditorOpen ? (
        <FinalsEditor
          hasFinalsData={hasFinalsData}
          canAddFinals={resultAvailability.finals}
          finalPlacement={finalPlacement}
          finalBuildPlacements={finalBuildPlacements}
          availableBuilds={availableBuilds}
          selectableBuilds={selectableBuilds}
          umaList={umaList}
          getBuild={getBuild}
          getEffectiveBuildId={getEffectiveBuildId}
          onSaveFinals={(buildIds, placements, placement) => {
            onSaveFinals(buildIds, placements, placement);
            setIsFinalsEditorOpen(false);
          }}
          onClose={() => setIsFinalsEditorOpen(false)}
        />
      ) : null}
    </section>
  );
}
