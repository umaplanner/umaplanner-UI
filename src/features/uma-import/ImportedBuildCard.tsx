import { useState } from "react";
import type { ImportedUmaBuild, StoredUmaBuild } from "../../types/UmaBuild";
import { getImportedSkillIds } from "../../types/UmaBuild";
import type { UmaEntry } from "../../types/UmaEntry";
import type { SkillEntry } from "../../types/SkillEntry";
import BuildCard from "../../components/UmaBuild/list/BuildCard";
import EditableBuildName from "../../components/UmaBuild/list/EditableBuildName";
import {
  getAptitudeRank,
  getUniqueBuildNameForEvent,
  hasRunawaySkill,
  runawayStrategy,
  runningStyleNames,
} from "../../components/UmaBuild/utils";

interface ImportedBuildCardProps {
  build: ImportedUmaBuild;
  uma: UmaEntry | undefined;
  groundType: string | undefined;
  distanceType: string | undefined;
  skillList: SkillEntry[];
  currentEvent: string;
  savedBuilds: StoredUmaBuild[];
  onSaveBuild: (
    build: StoredUmaBuild,
    name: string,
    buildId?: string | null,
  ) => Promise<string | null>;
  onRemoveBuild: (buildId: string) => Promise<boolean>;
}

function getCreateTime(build: StoredUmaBuild) {
  if (build.create_time === undefined) {
    return null;
  }

  const date = new Date(
    typeof build.create_time === "number" && build.create_time < 1_000_000_000_000
      ? build.create_time * 1000
      : build.create_time,
  );
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

export default function ImportedBuildCard({
  build,
  uma,
  groundType,
  distanceType,
  skillList,
  currentEvent,
  savedBuilds,
  onSaveBuild,
  onRemoveBuild,
}: ImportedBuildCardProps) {
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedBuildId, setSavedBuildId] = useState<string | null>(null);
  const strategyName = runningStyleNames[build.running_style];
  const ground = groundType?.toLowerCase() === "dirt" ? "dirt" : "turf";
  const distance = {
    sprint: "short",
    short: "short",
    mile: "mile",
    medium: "middle",
    middle: "middle",
    long: "long",
  }[distanceType?.trim().toLowerCase() ?? ""] ?? "middle";
  const style = strategyName?.toLowerCase() === "senkou"
    ? "senko"
    : strategyName?.toLowerCase() ?? "nige";
  const groundRank = Number(build[`proper_ground_${ground}` as keyof ImportedUmaBuild]);
  const distanceRank = Number(build[`proper_distance_${distance}` as keyof ImportedUmaBuild]);
  const styleRank = Number(build[`proper_running_style_${style}` as keyof ImportedUmaBuild]);
  const rawCreatedTime = build.created_time ?? build.create_time;
  const createdTime = rawCreatedTime === undefined
    ? null
    : new Date(
      typeof rawCreatedTime === "number" && rawCreatedTime < 1_000_000_000_000
        ? rawCreatedTime * 1000
        : rawCreatedTime,
    );
  const importedSkillIds = getImportedSkillIds(build.skill_array);
  const strategy = hasRunawaySkill(skillList, importedSkillIds)
    ? runawayStrategy
    : strategyName ?? "";
  const displayBuild: StoredUmaBuild = {
    id: `imported-${build.card_id}`,
    event: "imported",
    name: build.name ?? "",
    lastUpdate: 0,
    outfitId: String(build.card_id),
    "build-type": build["build-type"] ?? "standard",
    create_time: build.created_time ?? build.create_time,
    starCount: 0,
    uniqueLv: 0,
    speed: build.speed,
    stamina: build.stamina,
    power: build.power,
    guts: build.guts,
    wisdom: build.wiz,
    strategy,
    distanceAptitude: getAptitudeRank(distanceRank),
    surfaceAptitude: getAptitudeRank(groundRank),
    strategyAptitude: getAptitudeRank(styleRank),
    mood: 0,
    skills: importedSkillIds,
    forcedSkillPositions: {},
    supportCards: build.support_card_list?.map((card) => ({
      position: card.position,
      support_card_id: card.support_card_id,
      limit_break_count: card.limit_break_count,
    })),
  };
  const savedBuild = savedBuilds.find((entry) =>
    entry.event === currentEvent &&
    getCreateTime(entry) !== null &&
    getCreateTime(entry) === getCreateTime(displayBuild));
  const displayName = savedBuild?.name;
  const isAlreadySaved = Boolean(currentEvent) && (
    savedBuildId !== null ||
    savedBuilds.some((savedBuild) =>
      savedBuild.event === currentEvent &&
      getCreateTime(savedBuild) !== null &&
      getCreateTime(savedBuild) === getCreateTime(displayBuild))
  );

  async function handleSaveBuild() {
    setSaveError(null);
    const eventBuilds = savedBuilds.filter((saved) => saved.event === currentEvent);
    const name = getUniqueBuildNameForEvent(
      uma?.baseCharacterName ?? `Uma ${build.card_id}`,
      eventBuilds,
    );
    const savedId = await onSaveBuild(displayBuild, name);
    if (savedId) setSavedBuildId(savedId);
    else setSaveError("Unable to save this build for the current CM.");
  }

  async function handleRemoveBuild() {
    const buildId = savedBuild?.id ?? savedBuildId;
    if (!buildId) return;
    setSaveError(null);
    if (await onRemoveBuild(buildId)) setSavedBuildId(null);
    else setSaveError("Unable to remove this build from the current CM.");
  }

  async function renameSavedBuild(name: string) {
    if (!savedBuild) return "Unable to save build name.";
    const normalizedName = name.trim().toLowerCase();
    if (savedBuilds.some((entry) =>
      entry.id !== savedBuild.id &&
      entry.event === currentEvent &&
      entry.name.trim().toLowerCase() === normalizedName
    )) {
      return "already exists";
    }
    const savedId = await onSaveBuild(displayBuild, name, savedBuild.id);
    return savedId ? null : "Unable to save build name.";
  }

  return (
    <BuildCard
      testId="imported-build"
      build={displayBuild}
      uma={uma}
      skillList={skillList}
      title={displayName
        ? <EditableBuildName name={displayName} onRename={renameSavedBuild} />
        : uma?.outfitTitle || `Uma ${build.card_id}`}
      subtitleLines={[
        ...(!displayName && build.name ? [build.name] : []),
        ...(displayName && uma ? [uma.outfitTitle] : []),
        ...(uma ? [uma.baseCharacterName] : []),
      ]}
      createdTime={createdTime && !Number.isNaN(createdTime.getTime()) ? createdTime : null}
      footerAction={(
        <div className="build-card__save">
          <button
            type="button"
            disabled={!currentEvent}
            onClick={() => void (isAlreadySaved ? handleRemoveBuild() : handleSaveBuild())}
            className={isAlreadySaved ? "build-card__remove-button" : undefined}
          >
            {isAlreadySaved
              ? `Remove ${displayName ?? build.name ?? "build"} from current event`
              : "Save build to current event"}
          </button>
          {saveError ? <span className="build-card__save-error" role="alert">{saveError}</span> : null}
        </div>
      )}
    />
  );
}
