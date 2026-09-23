import { useEffect, useState } from "react";
import { useEvent } from "../../contexts/PvpEventContext";
import UmaImage from "../../components/UmaImage";
import type { StoredUmaBuild } from "../../types/UmaBuild";
import type { UmaEntry } from "../../types/UmaEntry";
import { ensureDataLoaded } from "../../lib/data";
import { createBuildRepository } from "../../features/pvp-planner/pvpPlannerRepository";
import "../../styles/Builds.css";

export default function Builds() {
  const { selectedEvent } = useEvent();
  const [builds, setBuilds] = useState<StoredUmaBuild[]>([]);
  const [umaList, setUmaList] = useState<UmaEntry[]>([]);

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

        setBuilds(storedBuilds.filter(
          (build) => build.event === selectedEvent && build.outfitId !== "",
        ));
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
