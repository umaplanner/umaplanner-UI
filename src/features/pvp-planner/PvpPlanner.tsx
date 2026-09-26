import { useEffect, useState } from "react";
import type { UmaBuild as UmaBuildData } from "../../types/UmaBuild";
import { useEvent } from "../../contexts/PvpEventContext";
import UmaBuild from "../../components/UmaBuild/UmaBuild";
import UmaBuildDisplay from "../../components/UmaBuild/UmaBuildDisplay";
import UmaBuildList from "../../components/UmaBuild/UmaBuildList";
import RaceDisplay from "../../components/RaceDisplay";
import "../../styles/PvpPlanner.css";
import { usePvpPlannerData } from "./usePvpPlannerData";
import { usePvpTeam } from "./usePvpTeam";
import { createDefaultBuild, type UmaSlot } from "./pvpPlannerTypes";
import { getUmaUniqueSkillId } from "../../components/UmaBuild/umaBuildUtils";

export default function PvpPlanner() {
  const [buildMode, setBuildMode] = useState<"display" | "edit" | "builds">("display");
  const [editingBuild] = useState<UmaSlot>(1);
  const [editingBuildDraft, setEditingBuildDraft] = useState<{
    slot: UmaSlot;
    build: UmaBuildData;
    name: string;
    id: string | null;
  } | null>(null);
  const [displayBuildIds, setDisplayBuildIds] = useState<Array<string | null>>([
    null,
    null,
    null,
  ]);
  const { selectedEvent } = useEvent();
  const { raceEntry, umaList, skillList } = usePvpPlannerData(selectedEvent);
  const {
    umas,
    allBuilds,
    saveBuild,
    swapTeamBuild,
  } = usePvpTeam(selectedEvent);
  useEffect(() => {
    setDisplayBuildIds(([1, 2, 3] as const).map((slot) => umas[`uma${slot}`]));
  }, [umas]);
  const displayBuilds = displayBuildIds.map((buildId, index) => ({
    teamNumber: (index + 1) as UmaSlot,
    build: allBuilds.find((entry) => entry.id === buildId) ?? null,
  }));
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
  const editProps = {
    teamNumber: editingBuild,
    buildId: editingBuildDraft?.slot === editingBuild
      ? editingBuildDraft.id
      : umas[`uma${editingBuild}`],
    value: editorBuild,
    umaList,
    selectedUma: editorUma,
    skillList,
    uniqueSkillId: getUmaUniqueSkillId(editorUma),
    onSelectUma: (uma: typeof selectedUma) => {
      setEditingBuildDraft({
        slot: editingBuild,
        build: { ...editorBuild, outfitId: uma ? String(uma.id) : "" },
        name: editingBuildDraft?.slot === editingBuild
          ? editingBuildDraft.name
          : umas[`uma${editingBuild}BuildName`],
        id: editingBuildDraft?.slot === editingBuild
          ? editingBuildDraft.id
          : umas[`uma${editingBuild}`],
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
      });
    },
    onNewBuild: () => {
      setEditingBuildDraft({
        slot: editingBuild,
        build: createDefaultBuild(),
        name: "",
        id: null,
      });
    },
    onBuildLoaded: (build: UmaBuildData) => {
      setEditingBuildDraft({
        slot: editingBuild,
        build,
        name: "",
        id: crypto.randomUUID(),
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
        });
      }
    },
    onSaveBuild: async (build: UmaBuildData, name: string) => {
      const currentBuildId = editingBuildDraft?.slot === editingBuild
        ? editingBuildDraft.id
        : umas[`uma${editingBuild}`];
      const duplicate = allBuilds.find(
        (savedBuild) =>
          savedBuild.name === name &&
          savedBuild.id !== currentBuildId,
      );
      const id = duplicate?.id ??
        currentBuildId;
      const savedId = await saveBuild(
        build,
        name,
        id,
      );
      if (savedId) {
        setEditingBuildDraft({
          slot: editingBuild,
          build,
          name,
          id: savedId,
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
          aria-pressed={buildMode === "display"}
          onClick={() => setBuildMode("display")}
        >
          Display
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
      <section className="uma-build-area" aria-label="Build selected Uma">
        {buildMode === "builds" ? (
          <UmaBuildList />
        ) : buildMode === "display" ? (
          <div className="uma-build-display-grid">
            {displayBuilds.map(({ teamNumber, build }) => (
              <UmaBuildDisplay
                key={teamNumber}
                teamNumber={teamNumber}
                build={build}
                availableBuilds={allBuilds}
                umaList={umaList}
                skillList={skillList}
                onSelectBuild={(buildId) => {
                  setDisplayBuildIds((currentIds) => {
                    const nextIds = [...currentIds];
                    nextIds[teamNumber - 1] = buildId;
                    return nextIds;
                  });
                  void swapTeamBuild(teamNumber, buildId).catch((error) => {
                    console.error("Error swapping team build:", error);
                  });
                }}
              />
            ))}
          </div>
        ) : <UmaBuild {...editProps} teamNumber={editingBuild} />}
      </section>
    </div>
  );
}
