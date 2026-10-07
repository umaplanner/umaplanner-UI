import { useState } from "react";
import {
  isTeamResultRoundExcluded,
  resolveResultBuildId,
  teamResultRows,
} from "../../../features/planner/plannerTypes";
import type {
  InitialTeamBuildIds,
  TeamBuildAssignments,
  TeamFinalBuildPlacements,
  TeamFinalPlacement,
  TeamRaceResultRow,
  TeamResultRound,
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
  TicketEditor as TicketEditorState,
} from "./types";
import Summary from "./Summary";
import TicketEditor from "./TicketEditor";
import "../../../styles/Builds.css";
import "../../../styles/UmaBuildResults.css";

interface Props {
  event: string;
  results: TeamResults;
  resultAvailability?: Record<TeamResultRow, boolean>;
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
  onToggleRoundExcluded: (round: TeamResultRound, excluded: boolean) => void;
  onSaveFinals: (
    buildIds: InitialTeamBuildIds,
    buildPlacements: TeamFinalBuildPlacements,
    placement: 1 | 2 | 3,
  ) => void;
}

const resultGroups: ResultGroup[] = [
  {
    title: "Round 2",
    round: "round2",
    rows: [
      { row: "round2Day1", label: "Day 1" },
      { row: "round2Day2", label: "Day 2" },
    ],
  },
  {
    title: "Round 1",
    round: "round1",
    rows: [
      { row: "round1Day1", label: "Day 1" },
      { row: "round1Day2", label: "Day 2" },
    ],
  },
];

export default function Results({
  event,
  results,
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
  onToggleRoundExcluded,
  onSaveFinals,
}: Props) {
  const selectableBuilds = availableBuilds.filter(
    (build) => build["build-type"] !== "plan",
  );
  const { collapsedGroups, setCollapsedGroups } =
    useResultCollapsePreferences(event);
  const [ticketEditor, setTicketEditor] = useState<TicketEditorState | null>(null);
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
    const savedResults = ticketBuildResults[row]?.[ticket];
    if (savedResults) return savedResults;
    return ([1, 2, 3] as const).flatMap((slot) => {
      const buildId = getEffectiveBuildId(row, ticket, slot);
      return buildId ? [{ buildId, slot, wins: null }] : [];
    });
  }

  const summaryBuilds: ResultBuildSummary[] = (() => {
    const byBuild = new Map<string, ResultBuildSummary>();

    for (const row of teamResultRows) {
      if (row === "finals" || results[row] === null) continue;
      for (let index = 0; index < ticketCounts[row]; index += 1) {
        const ticket = (index + 1) as TeamTicket;
        const savedBuildResults = ticketBuildResults[row]?.[ticket];
        const builds = savedBuildResults ?? ([1, 2, 3] as const).flatMap((slot) => {
          const buildId = getEffectiveBuildId(row, ticket, slot);
          return buildId ? [{ buildId, slot, wins: null }] : [];
        });
        for (const ticketBuild of builds) {
          const build = getBuild(ticketBuild.buildId);
          if (!build) continue;

          const summary = byBuild.get(build.id) ?? {
            build,
            wins: 0,
            races: 0,
            slot: ticketBuild.slot,
          };
          if (ticketBuild.wins !== null) summary.wins += ticketBuild.wins;
          summary.races += 1;
          byBuild.set(build.id, summary);
        }
      }
    }

    return Array.from(byBuild.values());
  })();

  const canShowBuildWinRates =
    !isTeamResultRoundExcluded(results, "round1") ||
    !isTeamResultRoundExcluded(results, "round2");
  const totalTicketWins = teamResultRows.reduce((total, row) => {
    if (row === "finals" || results[row] === null) return total;
    return total + (results[row]?.slice(0, ticketCounts[row])
      .reduce((rowTotal, wins) => rowTotal + wins, 0) ?? 0);
  }, 0);
  const totalTicketCount = teamResultRows.reduce((total, row) => {
    if (row === "finals" || results[row] === null) return total;
    return total + ticketCounts[row];
  }, 0);
  const totalWinRate = totalTicketCount > 0
    ? Math.round((totalTicketWins / (totalTicketCount * 5)) * 100)
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
        summaryBuilds={summaryBuilds}
        totalWinRate={totalWinRate}
        totalTicketWins={totalTicketWins}
        totalTicketCount={totalTicketCount}
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
          ticketBuildResults={ticketBuildResults}
          ticketCounts={ticketCounts}
          resultAvailability={resultAvailability}
          collapsed={collapsedGroups[group.title] ?? false}
          excluded={isTeamResultRoundExcluded(results, group.round)}
          umaList={umaList}
          onToggleRoundExcluded={onToggleRoundExcluded}
          onToggleCollapsed={(title) =>
            setCollapsedGroups((current) => ({
              ...current,
              [title]: !(current[title] ?? false),
            }))}
          onEditTicket={setTicketEditor}
          onRemoveTicket={onRemoveTicket}
          getTicketBuildResults={getTicketBuildResults}
          getBuild={getBuild}
        />
      ))}
      {ticketEditor ? (
        <TicketEditor
          editor={ticketEditor}
          results={results}
          ticketBuildResults={ticketBuildResults}
          ticketCounts={ticketCounts as Record<TeamRaceResultRow, TeamTicketCount>}
          availableBuilds={availableBuilds}
          selectableBuilds={selectableBuilds}
          umaList={umaList}
          getBuild={getBuild}
          getEffectiveBuildId={getEffectiveBuildId}
          onSaveTicket={onSaveTicket}
          canAddTicket={resultAvailability[ticketEditor.row]}
          onClose={() => setTicketEditor(null)}
        />
      ) : null}
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
