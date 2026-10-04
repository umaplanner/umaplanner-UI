import { useEffect, useRef, useState } from "react";
import type { ImportedUmaBuild, StoredUmaBuild } from "../../types/UmaBuild";
import { getImportedSkillIds } from "../../types/UmaBuild";
import type { UmaEntry } from "../../types/UmaEntry";
import type { SkillEntry } from "../../types/SkillEntry";
import UmaImage from "../../components/UmaImage";
import UmaBuildDisplay from "../../components/UmaBuild/UmaBuildDisplay";
import {
  getAptitudeRank,
  getAptitudeRankImage,
  getStatRank,
  runningStyleNames,
  strategyIcons,
} from "../../components/UmaBuild/umaBuildUtils";

interface ImportedBuildCardProps {
  build: ImportedUmaBuild;
  uma: UmaEntry | undefined;
  groundType: string | undefined;
  distanceType: string | undefined;
  skillList: SkillEntry[];
  currentEvent: string;
  savedBuilds: StoredUmaBuild[];
  onSaveBuild: (build: StoredUmaBuild, name: string) => Promise<string | null>;
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
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedBuildId, setSavedBuildId] = useState<string | null>(null);
  const detailsDialogRef = useRef<HTMLDialogElement | null>(null);
  const strategyName = runningStyleNames[build.running_style];
  const strategyIcon = strategyName ? strategyIcons[strategyName] : undefined;
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
  const getRankImage = (rank: number) =>
    `/icons/statrank/rank_${String(getAptitudeRankImage(rank)).padStart(2, "0")}.png`;
  const rawCreatedTime = build.created_time ?? build.create_time;
  const createdTime = rawCreatedTime === undefined
    ? null
    : new Date(
      typeof rawCreatedTime === "number" && rawCreatedTime < 1_000_000_000_000
        ? rawCreatedTime * 1000
        : rawCreatedTime,
    );
  const importedSkillIds = getImportedSkillIds(build.skill_array);
  const displayBuild: StoredUmaBuild = {
    id: `imported-${build.card_id}`,
    event: "imported",
    name: build.name ?? "",
    lastUpdate: 0,
    outfitId: String(build.card_id),
    create_time: build.created_time ?? build.create_time,
    starCount: 0,
    uniqueLv: 0,
    speed: build.speed,
    stamina: build.stamina,
    power: build.power,
    guts: build.guts,
    wisdom: build.wiz,
    strategy: strategyName ?? "",
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
  const isAlreadySaved = Boolean(currentEvent) && (
    savedBuildId !== null ||
    savedBuilds.some((savedBuild) =>
      savedBuild.event === currentEvent &&
      getCreateTime(savedBuild) !== null &&
      getCreateTime(savedBuild) === getCreateTime(displayBuild))
  );
  const savedBuild = savedBuilds.find((entry) =>
    entry.event === currentEvent &&
    getCreateTime(entry) !== null &&
    getCreateTime(entry) === getCreateTime(displayBuild));

  async function handleSaveBuild() {
    const name = window.prompt("Enter a name for this build:", build.name ?? "")?.trim();
    if (!name) {
      return;
    }
    setSaveError(null);
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

  useEffect(() => {
    const dialog = detailsDialogRef.current;
    if (!dialog || !isDetailsOpen) return;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [isDetailsOpen]);

  return (
    <article className="build-card" data-testid="imported-build">
      {createdTime && !Number.isNaN(createdTime.getTime()) ? (
        <time className="build-card__created-time" dateTime={createdTime.toISOString()}>
          <span>{createdTime.toLocaleDateString()}</span>
          <span>{createdTime.toLocaleTimeString()}</span>
        </time>
      ) : null}
      <div className="build-card__main">
        {uma ? <UmaImage uma={uma} alt="" /> : null}
        <div>
          <h2>{uma?.outfitTitle ?? `Uma ${build.card_id}`}</h2>
          {build.name ? <p>{build.name}</p> : null}
          {uma ? <p>{uma.baseCharacterName}</p> : null}
        </div>
      </div>
      <div className="build-card__aptitudes" aria-label="Aptitudes">
        <span>Surface <img src={getRankImage(groundRank)} alt={`Rank ${getAptitudeRank(groundRank)}`} /></span>
        <span>Distance <img src={getRankImage(distanceRank)} alt={`Rank ${getAptitudeRank(distanceRank)}`} /></span>
        <span>
          Style
          <img src={getRankImage(styleRank)} alt={`Rank ${getAptitudeRank(styleRank)}`} />
          {strategyIcon ? <img src={`/icons/style/${strategyIcon}.webp`} alt={strategyName} /> : null}
          <button className="build-card__details-button" type="button" onClick={() => setIsDetailsOpen(true)}>
            Details
          </button>
        </span>
      </div>
      <div className="build-card__stats" aria-label="Stats">
        {[
          ["Speed", build.speed],
          ["Stamina", build.stamina],
          ["Power", build.power],
          ["Guts", build.guts],
          ["Wisdom", build.wiz],
        ].map(([label, value]) => (
          <span key={label}>
            {label}
            <span className="build-card__stat-value">
              <img src={`/icons/statrank/rank_${String(getStatRank(Number(value))).padStart(2, "0")}.png`} alt={`${label} rank`} />
              <strong>{value}</strong>
            </span>
          </span>
        ))}
      </div>
      <div className="build-card__save">
        <button
          type="button"
          disabled={!currentEvent}
          onClick={() => void (isAlreadySaved ? handleRemoveBuild() : handleSaveBuild())}
          className={isAlreadySaved ? "build-card__remove-button" : undefined}
        >
          {isAlreadySaved ? "Remove build from current CM" : "Save build to current CM"}
        </button>
        {saveError ? <span className="build-card__save-error" role="alert">{saveError}</span> : null}
      </div>
      {isDetailsOpen ? (
        <dialog
          ref={detailsDialogRef}
          className="build-card__details-dialog"
          onCancel={() => setIsDetailsOpen(false)}
          onClose={() => setIsDetailsOpen(false)}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsDetailsOpen(false);
            }
          }}
        >
          <button className="build-card__details-close" type="button" aria-label="Close details" onClick={() => setIsDetailsOpen(false)}>×</button>
          <UmaBuildDisplay teamNumber={1} build={displayBuild} availableBuilds={[]} umaList={uma ? [uma] : []} skillList={skillList} onSelectBuild={() => undefined} />
        </dialog>
      ) : null}
    </article>
  );
}
