import { useEffect, useRef, useState } from "react";
import { copyElementAsPng } from "../../lib/copyElementAsPng";
import CopyIcon from "../../components/CopyIcon";
import {
  resolveResultBuildId,
  teamResultRows,
} from "../planner/plannerTypes";
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
} from "../planner/plannerTypes";
import type { StoredUmaBuild } from "../../types/UmaBuild";
import type { SkillEntry } from "../../../types/SkillEntry";
import type { UmaEntry } from "../../../types/UmaEntry";
import { useResultCollapsePreferences } from "../../components/Preferences";
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
import ResultImage from "./ResultImage";
import type {
  ResultImageDayBuild,
  ResultImageDay,
  ResultImageSummary,
} from "./ResultImage";
import "../../styles/Builds.css";
import "../../styles/UmaBuildResults.css";

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
  const [isCopyingImage, setIsCopyingImage] = useState(false);
  const [summaryCopyStatus, setSummaryCopyStatus] = useState("");
  const [dayCopyStatus, setDayCopyStatus] = useState<{
    row: TeamRaceResultRow;
    message: string;
  } | null>(null);
  const fullImageRef = useRef<HTMLElement | null>(null);
  const roundsImageRef = useRef<HTMLElement | null>(null);
  const dayImageRefs = useRef(new Map<TeamRaceResultRow, HTMLElement>());
  const summaryStatusTimeout = useRef<number | null>(null);
  const dayStatusTimeout = useRef<number | null>(null);
  const lineupSource = { buildAssignments, ticketCounts, initialBuildIds };

  useEffect(() => () => {
    if (summaryStatusTimeout.current !== null) {
      window.clearTimeout(summaryStatusTimeout.current);
    }
    if (dayStatusTimeout.current !== null) {
      window.clearTimeout(dayStatusTimeout.current);
    }
  }, []);

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
  const getUmaForBuild = (build: StoredUmaBuild | undefined) =>
    build
      ? umaList.find((entry) => String(entry.id) === build.outfitId) ?? null
      : null;
  const imageDays: ResultImageDay[] = resultGroups.flatMap((group) =>
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
        ticketNumbers: Set<TeamTicket>;
      }>();
      const tickets = Array.from({ length: count }, (_, index) => {
        const ticket = (index + 1) as TeamTicket;
        const builds = getTicketBuildResults(row, ticket);
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
            ticketNumbers: new Set<TeamTicket>(),
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
      const buildStats: ResultImageDayBuild[] = Array.from(dayBuilds.values(), (build) => {
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
  const canCopyFullSummary = imageDays.length > 0 || hasFinalsData;
  const imageSummary: ResultImageSummary = {
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
  };

  function showCopyStatus(
    target: "summary" | { row: TeamRaceResultRow },
    message: string,
  ) {
    if (target === "summary") {
      if (summaryStatusTimeout.current !== null) {
        window.clearTimeout(summaryStatusTimeout.current);
      }
      setSummaryCopyStatus(message);
      summaryStatusTimeout.current = window.setTimeout(() => {
        setSummaryCopyStatus("");
        summaryStatusTimeout.current = null;
      }, 5000);
      return;
    }

    if (dayStatusTimeout.current !== null) {
      window.clearTimeout(dayStatusTimeout.current);
    }
    setDayCopyStatus({ row: target.row, message });
    dayStatusTimeout.current = window.setTimeout(() => {
      setDayCopyStatus(null);
      dayStatusTimeout.current = null;
    }, 5000);
  }

  function clearCopyStatus(target: "summary" | { row: TeamRaceResultRow }) {
    if (target === "summary") {
      if (summaryStatusTimeout.current !== null) {
        window.clearTimeout(summaryStatusTimeout.current);
        summaryStatusTimeout.current = null;
      }
      setSummaryCopyStatus("");
      return;
    }

    if (dayStatusTimeout.current !== null) {
      window.clearTimeout(dayStatusTimeout.current);
      dayStatusTimeout.current = null;
    }
    setDayCopyStatus(null);
  }

  async function copyImage(
    node: HTMLElement | null,
    filename: string,
    target: "summary" | { row: TeamRaceResultRow },
  ) {
    if (!node || isCopyingImage) return;
    setIsCopyingImage(true);
    clearCopyStatus(target);

    try {
      const result = await copyElementAsPng(node, filename);
      showCopyStatus(target, result === "copied"
        ? "Image copied to clipboard."
        : result === "fallback-download"
          ? "Clipboard unavailable; PNG downloaded instead."
          : "PNG downloaded.");
    } catch (error) {
      showCopyStatus(
        target,
        `Could not create the image: ${error instanceof Error ? error.message : "Unknown error."}`,
      );
    } finally {
      setIsCopyingImage(false);
    }
  }

  const eventFileName = event.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "results";

  return (
    <section className="uma-build-results" aria-label="Team results">
      <Summary
        imageActions={
          <div className="uma-build-results__image-actions" aria-label="Export summary images">
            {summaryCopyStatus ? (
              <span role="status" aria-live="polite">{summaryCopyStatus}</span>
            ) : null}
            <button
              type="button"
              aria-label="Copy summary image"
              disabled={!canCopyFullSummary || isCopyingImage}
              onClick={() =>
                void copyImage(fullImageRef.current, `${eventFileName}-summary.png`, "summary")}
            >
              <span>Summary</span>
              <CopyIcon />
            </button>
            <button
              type="button"
              aria-label="Copy rounds and days image"
              disabled={imageDays.length === 0 || isCopyingImage}
              onClick={() =>
                void copyImage(roundsImageRef.current, `${eventFileName}-rounds-and-days.png`, "summary")}
            >
              <span>Rounds &amp; days</span>
              <CopyIcon />
            </button>
          </div>
        }
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
          onCopyDay={(row) => {
            const day = imageDays.find((entry) => entry.row === row);
            if (!day) return;
            const dayFileName = `${eventFileName}-${day.round}-${day.label}`
              .toLowerCase().replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "");
            void copyImage(
              dayImageRefs.current.get(row) ?? null,
              `${dayFileName}.png`,
              { row },
            );
          }}
          dayCopyStatus={dayCopyStatus}
          isCopyingImage={isCopyingImage}
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
      <div className="result-image-stage" aria-hidden="true">
        <ResultImage
          ref={fullImageRef}
          event={event}
          days={[]}
          summary={canCopyFullSummary ? imageSummary : undefined}
        />
        <ResultImage
          ref={roundsImageRef}
          event={event}
          days={imageDays}
        />
        {imageDays.map((day) => (
          <ResultImage
            key={day.row}
            ref={(node) => {
              if (node) dayImageRefs.current.set(day.row, node);
              else dayImageRefs.current.delete(day.row);
            }}
            event={event}
            days={[day]}
          />
        ))}
      </div>
    </section>
  );
}
