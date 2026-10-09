import { useEffect, useRef, useState } from "react";
import type { UmaBuild as UmaBuildData } from "../../types/UmaBuild";
import { useEvent } from "../../contexts/EventContext";
import UmaBuild from "../../components/UmaBuild/editor/BuildEditor";
import UmaBuildDisplay from "../../components/UmaBuild/display/Display";
import UmaBuildList from "../../components/UmaBuild/list/List";
import UmaBuildResults from "../../components/UmaBuild/results/Results";
import RaceDisplay from "../../components/RaceDisplay";
import "../../styles/Planner.css";
import { usePlannerData } from "./usePlannerData";
import { useTeam } from "./useTeam";
import {
  createDefaultBuild,
  hasDuplicateBaseUmaIds,
  type InitialTeamBuildIds,
  type UmaSlot,
} from "./plannerTypes";
import {
  findSkill,
  getUmaUniqueSkillId,
  getUniqueBuildNameForEvent,
  runawayStrategy,
  umaHasRunawaySkill,
} from "../../components/UmaBuild/utils";
import {
  getNextResultOpeningAt,
  getResultAvailability,
  getResultOpeningDates,
} from "./resultSchedule";

export default function Planner() {
  const [buildMode, setBuildMode] = useState<"display" | "edit" | "builds" | "results">("display");
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [showSupportCards, setShowSupportCards] = useState(true);
  const [editingBuild] = useState<UmaSlot>(1);
  const [editingBuildDraft, setEditingBuildDraft] = useState<{
    slot: UmaSlot;
    build: UmaBuildData;
    name: string;
    id: string | null;
    isSavedBuild: boolean;
  } | null>(null);
  const [displayBuildIds, setDisplayBuildIds] = useState<Array<string | null>>([
    null,
    null,
    null,
  ]);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [focusedTeamSlot, setFocusedTeamSlot] = useState<UmaSlot | null>(1);
  const { selectedEvent } = useEvent();
  const initialEvent = useRef(selectedEvent);
  const hasInitializedBuildMode = useRef(false);
  const { raceEntry, umaList, skillList, supportCardList } = usePlannerData(selectedEvent);
  const activeRaceEntry = raceEntry?.eventTitle === selectedEvent
    ? raceEntry
    : undefined;
  const resultAvailability = getResultAvailability(activeRaceEntry, currentTime);
  const resultOpeningDates = getResultOpeningDates(activeRaceEntry);
  const {
    umas,
    allBuilds,
    eventResults,
    isTeamLoading,
    saveBuild,
    swapTeamBuild,
    saveTicketResult,
    removeTicketResult,
    updateResultRoundExcluded,
    saveFinalsResult,
  } = useTeam(selectedEvent);
  useEffect(() => {
    const nextOpening = getNextResultOpeningAt(activeRaceEntry);
    if (!nextOpening) return;

    const timeout = window.setTimeout(
      () => setCurrentTime(new Date()),
      Math.max(0, nextOpening.getTime() - Date.now()),
    );
    return () => window.clearTimeout(timeout);
  }, [activeRaceEntry, currentTime]);
  useEffect(() => {
    if (hasInitializedBuildMode.current) {
      return;
    }
    if (selectedEvent !== initialEvent.current) {
      hasInitializedBuildMode.current = true;
      return;
    }
    if (!initialEvent.current || activeRaceEntry?.eventTitle !== initialEvent.current) {
      return;
    }

    setBuildMode(resultAvailability.round1Day1 ? "results" : "display");
    hasInitializedBuildMode.current = true;
  }, [activeRaceEntry, resultAvailability.round1Day1, selectedEvent]);
  useEffect(() => {
    setDisplayBuildIds(([1, 2, 3] as const).map((slot) => umas[`uma${slot}`]));
  }, [umas]);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const mobileQuery = window.matchMedia("(max-width: 760px)");
    const updateViewport = () => {
      setIsMobileViewport(mobileQuery.matches);
      if (mobileQuery.matches) {
        setFocusedTeamSlot((focused) => focused ?? 1);
      } else {
        setFocusedTeamSlot(null);
      }
    };
    updateViewport();
    mobileQuery.addEventListener("change", updateViewport);
    return () => mobileQuery.removeEventListener("change", updateViewport);
  }, []);
  useEffect(() => {
    setFocusedTeamSlot(1);
  }, [selectedEvent]);
  const displayBuilds = displayBuildIds.map((buildId, index) => ({
    teamNumber: (index + 1) as UmaSlot,
    build: allBuilds.find((entry) => entry.id === buildId) ?? null,
  }));
  const focusedTeamBuild = displayBuilds.find(
    ({ teamNumber }) => teamNumber === focusedTeamSlot,
  );
  const selectTeamBuild = (teamNumber: UmaSlot, buildId: string | null) => {
    const nextIds = [...displayBuildIds] as InitialTeamBuildIds;
    nextIds[teamNumber - 1] = buildId;
    setDisplayBuildIds(nextIds);
    if (buildId === null) {
      setFocusedTeamSlot((focused) => focused === teamNumber ? null : focused);
    }
    void swapTeamBuild(nextIds).catch((error) => {
      console.error("Error swapping team build:", error);
    });
  };
  const hasDuplicateDisplayedUmas = hasDuplicateBaseUmaIds(
    displayBuilds.map(({ build }) => build),
  );
  const selectedBuild = umas[`uma${editingBuild}Build`];
  const selectedUma = selectedBuild.outfitId === ""
    ? null
    : umaList.find((uma) => String(uma.id) === selectedBuild.outfitId) ?? null;
  const editorBuild = editingBuildDraft?.slot === editingBuild
    ? editingBuildDraft.build
    : selectedBuild;
  const editorUma = editorBuild.outfitId === ""
    ? null
    : umaList.find((uma) => String(uma.id) === editorBuild.outfitId) ?? null;
  const editorBuildId = editingBuildDraft?.slot === editingBuild
    ? editingBuildDraft.id
    : umas[`uma${editingBuild}`];
  const editorBuildIsSaved = editingBuildDraft?.slot === editingBuild
    ? editingBuildDraft.isSavedBuild
    : editorBuildId !== null;
  const editProps = {
    teamNumber: editingBuild,
    buildId: editorBuildId,
    isSavedBuild: editorBuildIsSaved,
    value: editorBuild,
    umaList,
    selectedUma: editorUma,
    skillList,
    supportCardList,
    uniqueSkillId: getUmaUniqueSkillId(editorUma),
    onSelectUma: (uma: typeof selectedUma) => {
      const outfitId = uma ? String(uma.id) : "";
      const changedUma = outfitId !== editorBuild.outfitId;
      const previousUniqueSkillId = getUmaUniqueSkillId(editorUma);
      const isPreviousUniqueSkill = (skillId: string) =>
        previousUniqueSkillId !== undefined &&
        (findSkill(skillList, skillId)?.id ?? skillId) === String(previousUniqueSkillId);
      const skills = changedUma
        ? editorBuild.skills.filter((skillId) => !isPreviousUniqueSkill(skillId))
        : editorBuild.skills;
      const forcedSkillPositions = changedUma
        ? Object.fromEntries(
            Object.entries(editorBuild.forcedSkillPositions).filter(
              ([skillId]) => !isPreviousUniqueSkill(skillId),
            ),
          )
        : editorBuild.forcedSkillPositions;
      setEditingBuildDraft({
        slot: editingBuild,
        build: {
          ...editorBuild,
          outfitId,
          skills,
          forcedSkillPositions,
          strategy: umaHasRunawaySkill(uma, skillList) ? runawayStrategy : editorBuild.strategy,
        },
        name: !changedUma && editingBuildDraft?.slot === editingBuild
          ? editingBuildDraft.name
          : !changedUma ? umas[`uma${editingBuild}BuildName`] : "",
        id: changedUma ? crypto.randomUUID() : editingBuildDraft?.slot === editingBuild
          ? editingBuildDraft.id
          : umas[`uma${editingBuild}`],
        isSavedBuild: !changedUma && editorBuildIsSaved,
      });
    },
    buildName: editingBuildDraft?.slot === editingBuild
      ? editingBuildDraft.name
      : umas[`uma${editingBuild}BuildName`],
    onChange: (build: typeof selectedBuild) => {
      setEditingBuildDraft({
        slot: editingBuild,
        build,
        name: editingBuildDraft?.slot === editingBuild
          ? editingBuildDraft.name
          : umas[`uma${editingBuild}BuildName`],
        id: editingBuildDraft?.slot === editingBuild
          ? editingBuildDraft.id
          : umas[`uma${editingBuild}`],
        isSavedBuild: editorBuildIsSaved,
      });
    },
    onNewBuild: () => {
      setEditingBuildDraft({
        slot: editingBuild,
        build: createDefaultBuild(),
        name: "",
        id: null,
        isSavedBuild: false,
      });
    },
    onBuildLoaded: (build: UmaBuildData) => {
      setEditingBuildDraft({
        slot: editingBuild,
        build,
        name: "",
        id: crypto.randomUUID(),
        isSavedBuild: false,
      });
    },
    savedBuilds: allBuilds,
    onSelectSavedBuild: (buildId: string) => {
      const savedBuild = allBuilds.find((build) => build.id === buildId);
      if (savedBuild) {
        setEditingBuildDraft({
          slot: editingBuild,
          build: savedBuild,
          name: savedBuild.name,
          id: savedBuild.id,
          isSavedBuild: true,
        });
      }
    },
    onCopySavedBuild: (buildId: string) => {
      const savedBuild = allBuilds.find((build) => build.id === buildId);
      if (savedBuild) {
        setEditingBuildDraft({
          slot: editingBuild,
          build: savedBuild,
          name: "",
          id: crypto.randomUUID(),
          isSavedBuild: false,
        });
      }
    },
    onSaveBuild: async (build: UmaBuildData, name: string) => {
      const requestedName = name.trim();
      const umaName = umaList.find((uma) => String(uma.id) === build.outfitId)?.baseCharacterName ?? "Uma";
      const saveName = requestedName || getUniqueBuildNameForEvent(umaName, allBuilds);
      const existingNames = new Set(
        allBuilds.map((savedBuild) => savedBuild.name.trim().toLowerCase()),
      );
      if (!editorBuildIsSaved && requestedName && existingNames.has(requestedName.toLowerCase())) {
        return;
      }
      const savedId = await saveBuild(
        build,
        saveName,
        editorBuildId,
      );
      if (savedId) {
        setEditingBuildDraft({
          slot: editingBuild,
          build,
          name: saveName,
          id: savedId,
          isSavedBuild: true,
        });
      }
    },
  };

  return (
    <div className="planner">
      <RaceDisplay raceEntry={raceEntry} />
      <div className="uma-build-mode" role="group" aria-label="Build mode">
        <button
          type="button"
          aria-pressed={buildMode === "results"}
          onClick={() => setBuildMode("results")}
        >
          Results
        </button>
        <button
          type="button"
          aria-pressed={buildMode === "display"}
          onClick={() => setBuildMode("display")}
        >
          Team
        </button>
        <button
          type="button"
          aria-pressed={buildMode === "edit"}
          onClick={() => setBuildMode("edit")}
        >
          Edit
        </button>
        <button
          type="button"
          aria-pressed={buildMode === "builds"}
          onClick={() => setBuildMode("builds")}
        >
          Builds
        </button>
      </div>
      <section
        className="uma-build-area"
        aria-label="Build selected Uma"
        aria-busy={isTeamLoading && buildMode !== "builds"}
        inert={isTeamLoading && buildMode !== "builds"}
      >
        {buildMode === "builds" ? (
          <UmaBuildList onSaveBuild={saveBuild} />
        ) : buildMode === "results" ? (
          <UmaBuildResults
            key={selectedEvent}
            event={selectedEvent}
            results={eventResults.results}
            resultAvailability={resultAvailability}
            resultOpeningDates={resultOpeningDates}
            buildAssignments={eventResults.buildAssignments}
            ticketBuildResults={eventResults.ticketBuildResults}
            ticketCounts={eventResults.ticketCounts}
            initialBuildIds={eventResults.initialBuildIds}
            finalPlacement={eventResults.finalPlacement}
            finalBuildPlacements={eventResults.finalBuildPlacements}
            availableBuilds={allBuilds}
            umaList={umaList}
            skillList={skillList}
            showSupportCards={showSupportCards}
            onSaveTicket={saveTicketResult}
            onRemoveTicket={removeTicketResult}
            onToggleRoundExcluded={updateResultRoundExcluded}
            onSaveFinals={saveFinalsResult}
          />
        ) : buildMode === "display" ? (
          <div className="uma-build-display">
            <label className="uma-build-display__support-toggle">
              <input
                type="checkbox"
                checked={showSupportCards}
                onChange={(event) => setShowSupportCards(event.target.checked)}
              />
              Show support cards
            </label>
            {hasDuplicateDisplayedUmas ? (
              <p className="uma-build-display__duplicate-warning" role="alert">
                This team cannot be saved while it contains multiple builds for
                the same Uma.
              </p>
            ) : null}
            <div className="uma-build-display-grid">
              {displayBuilds.map(({ teamNumber, build }) => (
                <UmaBuildDisplay
                  key={teamNumber}
                  teamNumber={teamNumber}
                  build={build}
                  availableBuilds={allBuilds}
                  umaList={umaList}
                  skillList={skillList}
                  showSupportCards={showSupportCards}
                  compactText
                  showCopyButton={false}
                  showSwapButton={!isMobileViewport}
                  mobileSummary={isMobileViewport}
                  mobileDetailsFocused={isMobileViewport && focusedTeamSlot === teamNumber}
                  onToggleMobileDetails={isMobileViewport ? () => {
                    setFocusedTeamSlot((focused) =>
                      focused === teamNumber ? null : teamNumber
                    );
                  } : undefined}
                  onSelectBuild={(buildId) => selectTeamBuild(teamNumber, buildId)}
                />
              ))}
            </div>
            {isMobileViewport && focusedTeamBuild ? (
              <section
                className="uma-build-display__focused-details"
                aria-label={`Uma ${focusedTeamBuild.teamNumber} build details`}
                aria-live="polite"
              >
                <UmaBuildDisplay
                  key={focusedTeamBuild.teamNumber}
                  teamNumber={focusedTeamBuild.teamNumber}
                  build={focusedTeamBuild.build}
                  availableBuilds={allBuilds}
                  umaList={umaList}
                  skillList={skillList}
                  showSupportCards={showSupportCards}
                  compactText
                  canClearBuild
                  onSelectBuild={(buildId) =>
                    selectTeamBuild(focusedTeamBuild.teamNumber, buildId)
                  }
                />
              </section>
            ) : null}
          </div>
        ) : <UmaBuild {...editProps} teamNumber={editingBuild} />}
      </section>
    </div>
  );
}
