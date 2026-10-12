import { useEffect, useRef, useState } from "react";
import type { UmaBuild as UmaBuildData } from "../../types/UmaBuild";
import { useEvent } from "../../contexts/EventContext";
import { useAuth } from "../../contexts/AuthContext";
import UmaBuild from "../../components/UmaBuild/editor/BuildEditor";
import TeamPanel from "../../components/UmaBuild/team/TeamPanel";
import UmaBuildList from "../../components/UmaBuild/list/List";
import UmaBuildResults from "../../components/UmaBuild/results/Results";
import RaceDisplay from "../../components/RaceDisplay";
import "../../styles/Planner.css";
import { usePlannerData } from "./usePlannerData";
import { useTeam } from "./useTeam";
import {
  createDefaultBuild,
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

export default function Planner() {
  const [buildMode, setBuildMode] = useState<"team" | "edit" | "builds">("team");
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
  const [teamBuildIds, setTeamBuildIds] = useState<Array<string | null>>([
    null,
    null,
    null,
  ]);
  const { selectedEvent } = useEvent();
  const { user } = useAuth();
  const initialEvent = useRef(selectedEvent);
  const hasInitializedBuildMode = useRef(false);
  const { raceEntry, umaList, skillList, supportCardList } = usePlannerData(selectedEvent);
  const {
    umas,
    allBuilds,
    isTeamLoading,
    saveBuild,
    swapTeamBuild,
  } = useTeam(selectedEvent);
  useEffect(() => {
    setTeamBuildIds(([1, 2, 3] as const).map((slot) => umas[`uma${slot}`]));
  }, [umas]);
  const teamBuilds = teamBuildIds.map((buildId, index) => ({
    teamNumber: (index + 1) as UmaSlot,
    build: allBuilds.find((entry) => entry.id === buildId) ?? null,
  }));
  const selectTeamBuild = (teamNumber: UmaSlot, buildId: string | null) => {
    const nextIds = [...teamBuildIds] as InitialTeamBuildIds;
    nextIds[teamNumber - 1] = buildId;
    setTeamBuildIds(nextIds);
    void swapTeamBuild(nextIds).catch((error) => {
      console.error("Error swapping team build:", error);
    });
  };
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
      {/* {!user && ( */}
      {/*   <p className="anonymous-contribution-notice"> */}
      {/*     While logged out, your selected team and build stats are sent under a */}
      {/*     random browser ID and included in event overview statistics. */}
      {/*   </p> */}
      {/* )} */}
      <div className="uma-build-mode" role="group" aria-label="Build mode">
        <button
          type="button"
          aria-pressed={buildMode === "team"}
          onClick={() => setBuildMode("team")}
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
        ) : buildMode === "team" ? (
          <TeamPanel
            event={selectedEvent}
            builds={teamBuilds}
            availableBuilds={allBuilds}
            umaList={umaList}
            skillList={skillList}
            showSupportCards={showSupportCards}
            onShowSupportCardsChange={setShowSupportCards}
            onSelectBuild={selectTeamBuild}
          />
        ) : <UmaBuild {...editProps} teamNumber={editingBuild} />}
      </section>
    </div>
  );
}
