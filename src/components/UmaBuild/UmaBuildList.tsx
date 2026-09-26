import { useEffect, useState } from "react";
import { useEvent } from "../../contexts/PvpEventContext";
import { useAuth } from "../../contexts/AuthContext";
import UmaImage from "../../components/UmaImage";
import type { StoredUmaBuild } from "../../types/UmaBuild";
import type { UmaEntry } from "../../types/UmaEntry";
import { ensureDataLoaded } from "../../lib/data";
import {
  createBuildRepository,
  createTeamRepository,
  normalizeStoredTeam,
} from "../../features/pvp-planner/pvpPlannerRepository";
import { deleteBuild } from "../../features/pvp-planner/buildApi";
import "../../styles/Builds.css";
import { sortBuildsNewestFirst } from "./umaBuildUtils";

export default function Builds() {
  const { selectedEvent } = useEvent();
  const { user } = useAuth();
  const [builds, setBuilds] = useState<StoredUmaBuild[]>([]);
  const [umaList, setUmaList] = useState<UmaEntry[]>([]);

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
      } catch (error) {
        console.error("Error loading saved builds:", error);
      }
    }

    void loadBuilds();
    return () => {
      cancelled = true;
    };
  }, [selectedEvent]);

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
                  </div>
                </div>
                <div className="build-card__aptitudes" aria-label="Aptitudes">
                  <span>Surface <strong>{build.surfaceAptitude}</strong></span>
                  <span>Distance <strong>{build.distanceAptitude}</strong></span>
                  <span>Style <strong>{build.strategyAptitude}</strong></span>
                </div>
                <div className="build-card__stats" aria-label="Stats">
                  <span>Speed <strong>{build.speed}</strong></span>
                  <span>Stamina <strong>{build.stamina}</strong></span>
                  <span>Power <strong>{build.power}</strong></span>
                  <span>Guts <strong>{build.guts}</strong></span>
                  <span>Wisdom <strong>{build.wisdom}</strong></span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
