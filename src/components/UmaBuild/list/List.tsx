import { useEffect, useRef, useState } from "react";
import { useEvent } from "../../../contexts/EventContext";
import { useAuth } from "../../../contexts/AuthContext";
import UmaImage from "../../UmaImage";
import UmaBuildDisplay from "../display/Display";
import type { StoredUmaBuild } from "../../../types/UmaBuild";
import type { UmaEntry } from "../../../types/UmaEntry";
import type { SkillEntry } from "../../../types/SkillEntry";
import { ensureDataLoaded } from "../../../lib/data";
import { normalizeSkillData } from "../../../features/planner/skillData";
import {
  createBuildRepository,
  createTeamRepository,
  normalizeStoredTeam,
} from "../../../features/planner/plannerRepository";
import { deleteBuild } from "../../../features/planner/buildApi";
import "../../../styles/Builds.css";
import { aptitudeRankImages, getStatRank, sortBuildsNewestFirst, statFields, strategyIcons } from "../utils";

export default function Builds() {
  const { selectedEvent } = useEvent();
  const { user } = useAuth();
  const [builds, setBuilds] = useState<StoredUmaBuild[]>([]);
  const [umaList, setUmaList] = useState<UmaEntry[]>([]);
  const [skillList, setSkillList] = useState<SkillEntry[]>([]);
  const [detailsBuild, setDetailsBuild] = useState<StoredUmaBuild | null>(null);
  const detailsDialogRef = useRef<HTMLDialogElement | null>(null);

  async function handleDelete(build: StoredUmaBuild) {
    if (!selectedEvent) return;
    if (!window.confirm(`Delete "${build.name || "Unnamed build"}"?`)) return;

    try {
      if (user) {
        await deleteBuild(build.event, build.id);
      }
      const teamRepository = createTeamRepository();
      const storedTeam = await teamRepository.getByKey(selectedEvent);
      if (storedTeam) {
        const team = normalizeStoredTeam(storedTeam, selectedEvent);
        const updatedTeam = {
          ...team,
          uma1: team.uma1 === build.id ? null : team.uma1,
          uma2: team.uma2 === build.id ? null : team.uma2,
          uma3: team.uma3 === build.id ? null : team.uma3,
        };
        if (
          updatedTeam.uma1 !== team.uma1 ||
          updatedTeam.uma2 !== team.uma2 ||
          updatedTeam.uma3 !== team.uma3
        ) {
          await teamRepository.put(updatedTeam);
        }
      }
      await createBuildRepository().deleteByKey([build.event, build.id]);
      setBuilds((current) => current.filter((entry) => entry.id !== build.id));
    } catch (error) {
      console.error("Error deleting saved build:", error);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadBuilds() {
      if (!selectedEvent) {
        setBuilds([]);
        return;
      }

      try {
        const [storedBuilds, data] = await Promise.all([
          createBuildRepository().getAll(),
          ensureDataLoaded(),
        ]);
        if (cancelled) {
          return;
        }

        setBuilds(sortBuildsNewestFirst(storedBuilds.filter(
          (build) => build.event === selectedEvent && build.outfitId !== "",
        )));
        setUmaList((data.outfits as UmaEntry[] | undefined) ?? []);
        setSkillList(normalizeSkillData(data.skills));
      } catch (error) {
        console.error("Error loading saved builds:", error);
      }
    }

    void loadBuilds();
    return () => {
      cancelled = true;
    };
  }, [selectedEvent]);

  function getCreateTime(build: StoredUmaBuild) {
    if (build.create_time === undefined) return null;
    const date = new Date(
      typeof build.create_time === "number" && build.create_time < 1_000_000_000_000
        ? build.create_time * 1000
        : build.create_time,
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }

  useEffect(() => {
    const dialog = detailsDialogRef.current;
    if (!dialog || !detailsBuild) return;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [detailsBuild]);

  return (
    <section className="builds-page">
      <header className="builds-page__header">
        <h1>Saved builds</h1>
        <p>
          {selectedEvent
            ? `Builds for ${selectedEvent}`
            : "Select an event to view builds."}
        </p>
      </header>
      {builds.length === 0 ? (
        <p className="builds-page__empty">No saved builds available.</p>
      ) : (
        <div className="builds-grid">
          {builds.map((build) => {
            const uma = umaList.find(
              (entry) => String(entry.id) === build.outfitId,
            );
            const createdTime = getCreateTime(build);
            return (
              <article className="build-card" key={build.id}>
                <button
                  className="build-card__delete"
                  type="button"
                  aria-label={`Delete ${build.name || "Unnamed build"}`}
                  onClick={() => void handleDelete(build)}
                >
                  🗑
                </button>
                <div className="build-card__main">
                  {uma ? <UmaImage uma={uma} alt="" /> : null}
                  <div>
                    <h2>{build.name || "Unnamed build"}</h2>
                    {uma ? <p>{uma.outfitTitle}</p> : null}
                    {uma ? <p>{uma.baseCharacterName}</p> : null}
                  </div>
                  <div className="build-card__actions">
                    {createdTime ? (
                      <time className="build-card__created-time build-card__created-time--saved" dateTime={createdTime.toISOString()}>
                        <span>{createdTime.toLocaleDateString()}</span>
                        <span>{createdTime.toLocaleTimeString()}</span>
                      </time>
                    ) : null}
                    <button className="build-card__details-button" type="button" onClick={() => setDetailsBuild(build)}>
                      Details
                    </button>
                  </div>
                </div>
                <div className="build-card__aptitudes" aria-label="Aptitudes">
                  <span>
                    <span>Surface</span>
                    <img src={`/icons/statrank/rank_${String(aptitudeRankImages[build.surfaceAptitude]).padStart(2, "0")}.png`} alt={`Rank ${build.surfaceAptitude}`} />
                  </span>
                  <span>
                    <span>Distance</span>
                    <img src={`/icons/statrank/rank_${String(aptitudeRankImages[build.distanceAptitude]).padStart(2, "0")}.png`} alt={`Rank ${build.distanceAptitude}`} />
                  </span>
                  <span>
                    <span>Style</span>
                    <img src={`/icons/statrank/rank_${String(aptitudeRankImages[build.strategyAptitude]).padStart(2, "0")}.png`} alt={`Rank ${build.strategyAptitude}`} />
                    {strategyIcons[build.strategy] ? <img src={`/icons/style/${strategyIcons[build.strategy]}.webp`} alt={build.strategy} /> : null}
                  </span>
                </div>
                <div className="build-card__stats" aria-label="Stats">
                  {statFields.map((field) => (
                    <span key={field}>
                      {field}
                      <span className="build-card__stat-value">
                        <img src={`/icons/statrank/rank_${String(getStatRank(build[field])).padStart(2, "0")}.png`} alt={`${field} rank`} />
                        <strong>{build[field]}</strong>
                      </span>
                    </span>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {detailsBuild ? (
        <dialog
          ref={detailsDialogRef}
          className="build-card__details-dialog"
          onCancel={() => setDetailsBuild(null)}
          onClose={() => setDetailsBuild(null)}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDetailsBuild(null);
          }}
        >
          <button className="build-card__details-close" type="button" aria-label="Close details" onClick={() => setDetailsBuild(null)}>×</button>
          <UmaBuildDisplay
            teamNumber={1}
            build={detailsBuild}
            availableBuilds={[]}
            umaList={umaList}
            skillList={skillList}
            onSelectBuild={() => undefined}
          />
        </dialog>
      ) : null}
    </section>
  );
}
