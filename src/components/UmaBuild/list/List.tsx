import { useEffect, useState } from "react";
import { useEvent } from "../../../contexts/EventContext";
import { useAuth } from "../../../contexts/AuthContext";
import type { StoredUmaBuild, UmaBuild as UmaBuildData } from "../../../types/UmaBuild";
import type { UmaEntry } from "../../../types/UmaEntry";
import type { SkillEntry } from "../../../types/SkillEntry";
import { ensureDataLoaded, getCachedDataset } from "../../../lib/data";
import { normalizeSkillData } from "../../../features/planner/skillData";
import {
  createBuildRepository,
  createTeamRepository,
  normalizeStoredTeam,
} from "../../../features/planner/plannerRepository";
import { deleteBuild } from "../../../features/planner/buildApi";
import SavedBuildCard from "./SavedBuildCard";
import VirtualizedBuildGrid from "../../VirtualizedBuildGrid";
import "../../../styles/Builds.css";
import { sortBuildsNewestFirst } from "../utils";

interface Props {
  onSaveBuild: (
    build: UmaBuildData,
    name: string,
    buildId: string | null,
  ) => Promise<string | null>;
}

export default function Builds({ onSaveBuild }: Props) {
  const { selectedEvent } = useEvent();
  const { user } = useAuth();
  const [builds, setBuilds] = useState<StoredUmaBuild[]>([]);
  const [umaList, setUmaList] = useState<UmaEntry[]>([]);
  const [skillList, setSkillList] = useState<SkillEntry[]>([]);
  const [loadedEvent, setLoadedEvent] = useState<string | null>(null);
  const isLoading = Boolean(selectedEvent) && loadedEvent !== selectedEvent;

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

  async function saveBuildName(build: StoredUmaBuild, nextName: string) {
    const name = nextName.trim();
    if (!name) {
      return "Build name cannot be empty.";
    }
    if (builds.some((entry) =>
      entry.id !== build.id &&
      entry.name.trim().toLowerCase() === name.toLowerCase()
    )) {
      return "already exists";
    }
    if (name === build.name) return null;
    try {
      const savedId = await onSaveBuild(build, name, build.id);
      if (!savedId) {
        return "Unable to save build name.";
      }
      const updatedBuild = { ...build, name, lastUpdate: Date.now() };
      setBuilds((current) => current.map((entry) =>
        entry.id === build.id ? updatedBuild : entry,
      ));
      return null;
    } catch (error) {
      console.error("Error renaming saved build:", error);
      return "Unable to save build name.";
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadBuilds() {
      if (!selectedEvent) {
        setBuilds([]);
        setLoadedEvent(null);
        return;
      }
      const event = selectedEvent;

      try {
        const [storedBuilds, cachedOutfits, cachedSkills] = await Promise.all([
          createBuildRepository().getAllFromIndex("event", event),
          getCachedDataset<UmaEntry[]>("outfits"),
          getCachedDataset<unknown>("skills"),
        ]);
        if (cancelled) {
          return;
        }

        setBuilds(sortBuildsNewestFirst(storedBuilds.filter(
          (build) => build.outfitId !== "",
        )));
        setUmaList(cachedOutfits ?? []);
        setSkillList(normalizeSkillData(cachedSkills));
        setLoadedEvent(event);

        try {
          const data = await ensureDataLoaded();
          if (cancelled) {
            return;
          }
          setUmaList((data.outfits as UmaEntry[] | undefined) ?? []);
          setSkillList(normalizeSkillData(data.skills));
        } catch (error) {
          console.error("Error refreshing saved build data:", error);
        }
      } catch (error) {
        console.error("Error loading saved builds:", error);
        if (!cancelled) {
          setLoadedEvent(event);
        }
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

  return (
    <section className="builds-page">
      <header className="builds-page__header">
        <h1>Saved builds</h1>
        <span className="builds-page__name-info">
          <button
            className="builds-page__name-info-button"
            type="button"
            aria-label="Build name editing information"
            aria-describedby="build-name-editing-info"
          >
            <span aria-hidden="true">i</span>
          </button>
          <span
            className="builds-page__name-info-tooltip"
            id="build-name-editing-info"
            role="tooltip"
          >
            Click a build name to change it.
          </span>
        </span>
      </header>
      {isLoading ? (
        <p className="builds-page__empty" role="status">
          Loading saved builds...
        </p>
      ) : builds.length === 0 ? (
        <p className="builds-page__empty">No saved builds available.</p>
      ) : (
        <VirtualizedBuildGrid
          items={builds}
          resetKey={selectedEvent}
          getKey={(build) => build.id}
          renderItem={(build) => {
            const uma = umaList.find(
              (entry) => String(entry.id) === build.outfitId,
            );
            return (
              <SavedBuildCard
                key={build.id}
                build={build}
                uma={uma}
                skillList={skillList}
                createdTime={getCreateTime(build)}
                onDelete={() => void handleDelete(build)}
                onRename={(name) => saveBuildName(build, name)}
              />
            );
          }}
        />
      )}
    </section>
  );
}
