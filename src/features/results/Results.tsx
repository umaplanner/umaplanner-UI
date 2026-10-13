import { useEffect, useRef, useState } from "react";
import { copyElementAsPng } from "../../lib/copyElementAsPng";
import CopyIcon from "../../components/CopyIcon";
import {
  resolveResultBuildId,
} from "./domain/resultsTypes";
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
} from "./domain/resultsTypes";
import type { StoredUmaBuild } from "../../types/UmaBuild";
import type { SkillEntry } from "../../types/SkillEntry";
import type { UmaEntry } from "../../types/UmaEntry";
import { useResultCollapsePreferences } from "../../components/Preferences";
import FinalsEditor from "./ResultsFinalsEditor";
import Group from "./ResultsGroup";
import type {
  EffectiveResultBuildLookup,
  ResultBuildLookup,
  ResultGroup,
} from "./domain/types";
import Summary from "./ResultsSummary";
import ResultImage from "./ResultsImage";
import { getResultImageData } from "./domain/resultImageSelectors";
import {
  getFinalBuilds,
  getResultBuildSummaries,
  getResultTotals,
  getTicketBuildResults as selectTicketBuildResults,
  hasFinalsData as selectHasFinalsData,
} from "./domain/resultSelectors";
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

  const getTicketBuildResults = (row: TeamRaceResultRow, ticket: TeamTicket) =>
    selectTicketBuildResults(
      { buildAssignments, ticketBuildResults, ticketCounts, initialBuildIds },
      row,
      ticket,
    );

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

  const summaryBuilds = getResultBuildSummaries({
    results,
    buildAssignments,
    ticketBuildResults,
    ticketCounts,
    initialBuildIds,
    finalPlacement,
    finalBuildPlacements,
  }, availableBuilds);

  const canShowBuildWinRates =
    results.round1Day1 !== null || results.round1Day2 !== null ||
    results.round2Day1 !== null || results.round2Day2 !== null;
    const { totalWins, totalRaces, totalWinRate } = getResultTotals({
      results,
      ticketCounts,
      finalPlacement,
    });
    const hasFinalsData = selectHasFinalsData({ buildAssignments, finalPlacement });
    const finalBuilds = getFinalBuilds(
      { buildAssignments, ticketCounts, initialBuildIds },
      availableBuilds,
    );
  const { days: imageDays, summary: imageSummary } = getResultImageData({
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
  });
  const canCopyFullSummary = imageDays.length > 0 || hasFinalsData;

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
