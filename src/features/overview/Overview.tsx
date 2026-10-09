import { useState } from "react";
import { normalizeStrategyName } from "../../components/UmaBuild/utils";
import type { RunningStyleOverview } from "./types";
import type { OverviewProps } from "./types";
import GlobalUsage from "./sections/GlobalUsage";
import OutfitsAndTeams from "./sections/OutfitsAndTeams";
import RunningStyle from "./sections/RunningStyle";
import NextUpdateCountdown from "./NextUpdateCountdown";
import {
  asRecord,
  formatBuildCount,
  formatCount,
  getCountedIds,
  getOverviewRows,
  getRunningStyles,
  getStyleCountedSupportCards,
} from "./utils";
import "../../styles/Overview.css";

export default function Overview({
  selectedEvent,
  data,
  umaList,
  skillList,
  supportCardList,
  isLoading,
  error,
  onRefresh,
}: OverviewProps) {
  const [selectedStyle, setSelectedStyle] = useState("Oonige");
  const { outfits, teams } = getOverviewRows(data);
  const dataRecord = asRecord(data);
  const nextUpdate = typeof dataRecord?.nextUpdate === "string"
    ? dataRecord.nextUpdate
    : undefined;
  const runningStyles = getRunningStyles(data);
  const selectedRunningStyle: RunningStyleOverview = runningStyles.find(
    (style) => normalizeStrategyName(style.style) === selectedStyle,
  ) ?? {
    style: selectedStyle,
    count: 0,
    outfits: [],
    skills: [],
    supportCards: [],
    averageStats: {},
  };
  const totalRunningBuilds = runningStyles.reduce(
    (total, style) => total + style.count,
    0,
  );
  const supportCardCounts = (
    runningStyles.length > 0
      ? getStyleCountedSupportCards(runningStyles)
      : getCountedIds(dataRecord?.supportCards)
  ).sort((left, right) =>
    right.count - left.count || left.id.localeCompare(right.id, undefined, { numeric: true }),
  );
  const skillCounts = getCountedIds(dataRecord?.skills);
  const userCount = typeof dataRecord?.userCount === "number" &&
      Number.isFinite(dataRecord.userCount) && dataRecord.userCount >= 0
    ? dataRecord.userCount
    : undefined;
  const hasSupportedData = Array.isArray(dataRecord?.outfits) ||
    asRecord(dataRecord?.outfits) !== undefined ||
    Array.isArray(dataRecord?.teams) ||
    Array.isArray(dataRecord?.teamSetups) ||
    Array.isArray(dataRecord?.runningStyles) ||
    asRecord(dataRecord?.runningStyleCombinations) !== undefined;
  const sortedOutfits = outfits.sort((a, b) => {
    const countDifference = b.count - a.count;
    if (countDifference !== 0) return countDifference;
    const aUma = umaList.find((uma) => String(uma.id) === a.id);
    const bUma = umaList.find((uma) => String(uma.id) === b.id);
    return (aUma?.outfitTitle ?? a.id).localeCompare(bUma?.outfitTitle ?? b.id);
  });

  return (
    <section className="overview-page">
      {!selectedEvent ? (
        <p>Select an event to view its overview.</p>
      ) : (
        <>
          {error && <p role="alert">Unable to fully load overview data: {error}</p>}
          {!isLoading && data !== undefined && !hasSupportedData && (
            <p role="alert">Overview data must include outfits or team setups.</p>
          )}
          {userCount !== undefined || totalRunningBuilds > 0 || nextUpdate ? (
            <div className="overview-summary-row">
              {userCount !== undefined || totalRunningBuilds > 0 ? (
                <p className="overview-build-summary">
                  {userCount !== undefined
                    ? `${formatCount(userCount)} ${userCount === 1 ? "user" : "users"}`
                    : null}
                  {userCount !== undefined && totalRunningBuilds > 0 ? " · " : null}
                  {totalRunningBuilds > 0 ? formatBuildCount(totalRunningBuilds) : null}
                </p>
              ) : null}
              {nextUpdate && (
                <NextUpdateCountdown
                  event={selectedEvent}
                  nextUpdate={nextUpdate}
                  onRefresh={onRefresh}
                />
              )}
            </div>
          ) : null}
          <OutfitsAndTeams
            outfits={sortedOutfits}
            teams={teams}
            umaList={umaList}
            isLoading={isLoading}
          />
          <GlobalUsage
            supportCardCounts={supportCardCounts}
            skillCounts={skillCounts}
            supportCardList={supportCardList}
            skillList={skillList}
            totalRunningBuilds={totalRunningBuilds}
            isLoading={isLoading}
          />
          <RunningStyle
            selectedStyle={selectedStyle}
            onSelectStyle={setSelectedStyle}
            runningStyle={selectedRunningStyle}
            umaList={umaList}
            skillList={skillList}
            supportCardList={supportCardList}
          />
        </>
      )}
    </section>
  );
}
