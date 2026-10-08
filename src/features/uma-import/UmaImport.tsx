import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { useEvent } from "../../contexts/EventContext";
import { ensureDataLoaded } from "../../lib/data";
import type { UmaEntry } from "../../types/UmaEntry";
import type { SkillEntry } from "../../types/SkillEntry";
import { isImportedUmaBuild, type ImportedUmaBuild } from "../../types/UmaBuild";
import { normalizeSkillData } from "../planner/skillData";
import { usePlannerData } from "../planner/usePlannerData";
import { useTeam } from "../planner/useTeam";
import ImportedBuildCard from "./ImportedBuildCard";
import { loadStoredBuilds, saveImportedBuilds } from "./importedBuildRepository";
import "../../styles/Builds.css";

function getBuildDate(build: ImportedUmaBuild) {
  const rawDate = build.created_time ?? build.create_time;
  if (rawDate === undefined) {
    return Number.NEGATIVE_INFINITY;
  }

  const date = new Date(
    typeof rawDate === "number" && rawDate < 1_000_000_000_000
      ? rawDate * 1000
      : rawDate,
  );
  return Number.isNaN(date.getTime()) ? Number.NEGATIVE_INFINITY : date.getTime();
}

export default function UmaImport() {
  const { selectedEvent } = useEvent();
  const { raceEntry } = usePlannerData(selectedEvent);
  const { allBuilds, saveBuild, removeBuild } = useTeam(selectedEvent);
  const [builds, setBuilds] = useState<ImportedUmaBuild[]>([]);
  const [umaList, setUmaList] = useState<UmaEntry[]>([]);
  const [skillList, setSkillList] = useState<SkillEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadPageData() {
      try {
        const [data, storedBuilds] = await Promise.all([ensureDataLoaded(), loadStoredBuilds()]);
        if (!cancelled) {
          setUmaList((data.outfits as UmaEntry[] | undefined) ?? []);
          setSkillList(normalizeSkillData(data.skills));
          setBuilds(storedBuilds);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError("Unable to load imported builds.");
          console.error("Error loading imported builds:", caughtError);
        }
      }
    }
    void loadPageData();
    return () => { cancelled = true; };
  }, []);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every(isImportedUmaBuild)) {
        throw new Error("The JSON must contain a non-empty list of Uma builds.");
      }
      const importedBuilds = parsed.map((build) => ({
        ...build,
        "build-type": build["build-type"] ?? "standard",
      }));
      await saveImportedBuilds(importedBuilds, Date.now());
      setBuilds(importedBuilds);
      setError(null);
    } catch (caughtError) {
      const message = caughtError instanceof Error
        ? caughtError.message
        : "Unable to read the selected JSON file.";
      setError(message);
      setBuilds([]);
    }
  }

  const sortedBuilds = [...builds].sort((left, right) => getBuildDate(right) - getBuildDate(left));
  const normalizedSearch = search.trim().toLowerCase();
  const filteredBuilds = sortedBuilds.filter((build) => {
    const uma = umaList.find((entry) => entry.id === build.card_id);
    return `${build.name ?? ""} ${uma?.outfitTitle ?? ""} ${uma?.baseCharacterName ?? ""}`
      .toLowerCase()
      .includes(normalizedSearch);
  });

  return (
    <section className="builds-page">
      <header className="builds-page__header">
        <h1>Imports</h1>
        <p>Import your UmaExtractor JSON export.</p>
        <label>
          Import JSON
          <input type="file" accept="application/json,.json" onChange={handleFileChange} />
        </label>
        {error ? <p role="alert">{error}</p> : null}
      </header>
      {builds.length > 0 ? (
        <input
          className="builds-page__search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by build, outfit, or character"
          aria-label="Search imported builds"
        />
      ) : null}
      {builds.length === 0 ? (
        <p className="builds-page__empty">No builds imported.</p>
      ) : filteredBuilds.length === 0 ? (
        <p className="builds-page__empty">No imported builds match your search.</p>
      ) : (
        <div className="builds-grid">
          {filteredBuilds.map((build, index) => (
            <ImportedBuildCard
              key={`${build.card_id}-${index}`}
              build={build}
              uma={umaList.find((entry) => entry.id === build.card_id)}
              groundType={raceEntry?.groundType}
              distanceType={raceEntry?.distanceType}
              skillList={skillList}
              currentEvent={selectedEvent}
              savedBuilds={allBuilds}
              onSaveBuild={(storedBuild, name, buildId) =>
                saveBuild(storedBuild, name, buildId)
              }
              onRemoveBuild={removeBuild}
            />
          ))}
        </div>
      )}
    </section>
  );
}
