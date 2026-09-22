import { useEffect, useState } from "react";
import "../../styles/PvpPlanner.css";
import { useEvent } from "../../contexts/PvpEventContext";
import UmaSelect from "../../components/UmaSelect";
import UmaImage from "../../components/UmaImage";
import RaceDisplay from "../../components/RaceDisplay";
import { IndexedDbRepository } from "../../components/indexedDbRepository";
import UmaBuild from "../../components/UmaBuild";
import { ensureDataLoaded } from "../../lib/data";
import type { UmaEntry } from "../../types/UmaEntry";
import type { RaceEntry } from "../../types/RaceEntry";
import type { UmaBuild as UmaBuildData } from "../../types/UmaBuild";
import type { SkillEntry } from "../../types/SkillEntry";

type EventTeam = {
  event: string;
  uma1: number | null;
  uma2: number | null;
  uma3: number | null;
  uma1Build: UmaBuildData;
  uma2Build: UmaBuildData;
  uma3Build: UmaBuildData;
};

function createDefaultBuild(outfitId = ""): UmaBuildData {
  return {
    outfitId,
    starCount: 3,
    uniqueLv: 1,
    speed: 1200,
    stamina: 1200,
    power: 800,
    guts: 400,
    wisdom: 400,
    strategy: "Senkou",
    distanceAptitude: "S",
    surfaceAptitude: "A",
    strategyAptitude: "A",
    mood: 0,
    skills: [],
    forcedSkillPositions: {},
  };
}

const emptyUmas: EventTeam = {
  event: "",
  uma1: null,
  uma2: null,
  uma3: null,
  uma1Build: createDefaultBuild(),
  uma2Build: createDefaultBuild(),
  uma3Build: createDefaultBuild(),
};

function createRaceRepository() {
  return new IndexedDbRepository<RaceEntry>({
    databaseName: "RaceDB",
    version: 2,
    storeName: "races",
    keyPath: "eventTitle",
    indexes: [
      {
        name: "eventTitle",
        unique: true,
      },
    ],
  });
}

function createTeamRepository() {
  return new IndexedDbRepository<EventTeam>({
    databaseName: "TeamDB",
    version: 1,
    storeName: "teams",
    keyPath: "event",
  });
}

export default function PvpPlanner() {
  const { selectedEvent } = useEvent();

  const [raceEntry, setRaceEntry] = useState<RaceEntry>();
  const [umaList, setUmaList] = useState<UmaEntry[]>([]);
  const [skillList, setSkillList] = useState<SkillEntry[]>([]);
  const [umas, setUmas] = useState<EventTeam>(emptyUmas);
  const [activeBuild, setActiveBuild] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    if (!selectedEvent) {
      setRaceEntry(undefined);
      return;
    }

    let cancelled = false;

    async function fetchRaceEntry() {
      try {
        const db = createRaceRepository();

        const eventDetails = await db.getSingle(
          "eventTitle",
          selectedEvent
        );

        if (cancelled) {
          return;
        }

        if (eventDetails === undefined) {
          console.log(
            `No race details found for ${selectedEvent} in IndexedDB`
          );
          setRaceEntry(undefined);
          return;
        }

        setRaceEntry(eventDetails);

        console.log(
          `${selectedEvent} race details loaded from IndexedDB`
        );
      } catch (error) {
        console.error("Error fetching race entry:", error);
      }
    }

    void fetchRaceEntry();

    return () => {
      cancelled = true;
    };
  }, [selectedEvent]);

  useEffect(() => {
    if (!selectedEvent) {
      setUmas(emptyUmas);
      setActiveBuild(1);
      return;
    }

    let cancelled = false;

    async function fetchTeam() {
      try {
        const db = createTeamRepository();

        const storedTeam = await db.getByKey(selectedEvent);

        if (cancelled) {
          return;
        }

        if (storedTeam) {
          const legacyTeam = storedTeam as EventTeam & {
            uma1Customization?: UmaBuildData;
            uma2Customization?: UmaBuildData;
            uma3Customization?: UmaBuildData;
          };
          const normalizedTeam = {
            ...emptyUmas,
            ...storedTeam,
            uma1Build: storedTeam.uma1Build ?? legacyTeam.uma1Customization ?? createDefaultBuild(),
            uma2Build: storedTeam.uma2Build ?? legacyTeam.uma2Customization ?? createDefaultBuild(),
            uma3Build: storedTeam.uma3Build ?? legacyTeam.uma3Customization ?? createDefaultBuild(),
          };
          setUmas(normalizedTeam);
          setActiveBuild(normalizedTeam.uma1 ? 1 : normalizedTeam.uma2 ? 2 : normalizedTeam.uma3 ? 3 : 1);
          return;
        }

        const newTeam: EventTeam = {
          event: selectedEvent,
          uma1: null,
          uma2: null,
          uma3: null,
          uma1Build: createDefaultBuild(),
          uma2Build: createDefaultBuild(),
          uma3Build: createDefaultBuild(),
        };

        await db.put(newTeam);

        if (!cancelled) {
          setUmas(newTeam);
          setActiveBuild(1);
        }
      } catch (error) {
        console.error("Error fetching team:", error);
      }
    }

    void fetchTeam();

    return () => {
      cancelled = true;
    };
  }, [selectedEvent]);

  useEffect(() => {
    let cancelled = false;

    async function loadUmaList() {
      try {
        const loadedData = await ensureDataLoaded();
        const data = (loadedData.outfits as UmaEntry[] | undefined) ?? [];
        const skills = normalizeSkillData(loadedData.skills);

        if (!cancelled) {
          setUmaList(data);
          setSkillList(skills);
        }
      } catch (error) {
        console.error("Error fetching UMA variants:", error);
      }
    }

    void loadUmaList();

    return () => {
      cancelled = true;
    };
  }, []);

  function normalizeSkillData(data: unknown): SkillEntry[] {
    const dataset =
      data && typeof data === "object" && "data" in data
        ? (data as { data: unknown }).data
        : data;
    const records = Array.isArray(dataset)
      ? dataset
      : dataset && typeof dataset === "object"
        ? Object.entries(dataset).map(([id, entry]) => (
            entry && typeof entry === "object"
              ? { id, ...entry }
              : { id, name: String(entry) }
          ))
        : [];

    return records.flatMap((entry, index) => {
      if (!entry || typeof entry !== "object") {
        return [];
      }

      const record = entry as Record<string, unknown>;
      const name = [record.name, record.skillName, record.title, record.text]
        .find((value): value is string => typeof value === "string" && value.trim().length > 0);
      if (!name) {
        return [];
      }

      return [{
        id: String(record.id ?? record.skillId ?? index),
        name,
        groupId: getSkillGroupId(record),
        iconId: getSkillIconId(record),
        isGeneralSkill: getSkillGeneralFlag(record),
      }];
    });
  }

  function getRawSkillRecord(record: Record<string, unknown>) {
    const raw = record.raw;
    return typeof raw === "string"
      ? parseRawSkill(raw)
      : raw && typeof raw === "object"
        ? (raw as Record<string, unknown>)
        : null;
  }

  function getSkillGroupId(record: Record<string, unknown>): string | null {
    const rawRecord = getRawSkillRecord(record);
    const groupId =
      rawRecord?.group_id ??
      record["raw/group_id"] ??
      record.group_id;

    if (groupId !== undefined && groupId !== null) {
      return groupId === null || groupId === undefined ? null : String(groupId);
    }

    return null;
  }

  function getSkillIconId(record: Record<string, unknown>): number {
    const iconId = findSkillIconId(record);
    return typeof iconId === "number" && Number.isFinite(iconId)
      ? iconId
      : Number(iconId) || 0;
  }

  function getSkillGeneralFlag(record: Record<string, unknown>): boolean {
    const generalFlag = findSkillField(record, "isgeneralskill");
    return generalFlag === 1 || generalFlag === "1" || generalFlag === true;
  }

  function findSkillField(value: unknown, fieldName: string, depth = 0): unknown {
    if (depth > 4 || !value || typeof value !== "object") {
      return undefined;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        const result = findSkillField(entry, fieldName, depth + 1);
        if (result !== undefined) {
          return result;
        }
      }
      return undefined;
    }

    for (const [key, entry] of Object.entries(value)) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (normalizedKey === fieldName) {
        return entry;
      }

      const nestedValue = typeof entry === "string"
        ? parseRawSkill(entry)
        : entry;
      const result = findSkillField(nestedValue, fieldName, depth + 1);
      if (result !== undefined) {
        return result;
      }
    }

    return undefined;
  }

  function findSkillIconId(value: unknown, depth = 0): unknown {
    if (depth > 4 || !value || typeof value !== "object") {
      return undefined;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        const iconId = findSkillIconId(entry, depth + 1);
        if (iconId !== undefined) {
          return iconId;
        }
      }
      return undefined;
    }

    for (const [key, entry] of Object.entries(value)) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (normalizedKey === "iconid" || normalizedKey.endsWith("iconid")) {
        return entry;
      }

      if (typeof entry === "string") {
        const parsedEntry = parseRawSkill(entry);
        if (parsedEntry) {
          const iconId = findSkillIconId(parsedEntry, depth + 1);
          if (iconId !== undefined) {
            return iconId;
          }
        }
      } else {
        const iconId = findSkillIconId(entry, depth + 1);
        if (iconId !== undefined) {
          return iconId;
        }
      }
    }

    return undefined;
  }

  function parseRawSkill(raw: string): Record<string, unknown> | null {
    try {
      const parsed: unknown = JSON.parse(raw);
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  async function handleInputChange(
    key: keyof Pick<EventTeam, "uma1" | "uma2" | "uma3">,
    selectedUma: UmaEntry | null
  ) {
    if (!selectedEvent) {
      return;
    }

    const buildKey = `${key}Build` as "uma1Build" | "uma2Build" | "uma3Build";
    const currentBuild = umas[buildKey];
    const currentUma = getSelectedUma(umas[key]);
    const previousUniqueSkill = currentUma?.uniqueSkillId === undefined
      ? undefined
      : skillList.find((skill) => skill.id === String(currentUma.uniqueSkillId));
    const preservedBuild: UmaBuildData = {
      ...currentBuild,
      outfitId: selectedUma ? String(selectedUma.id) : "",
      skills: currentBuild.skills.filter(
        (skill) =>
          !(skill in currentBuild.forcedSkillPositions) &&
          skill !== previousUniqueSkill?.id,
      ),
      forcedSkillPositions: Object.fromEntries(
        Object.entries(currentBuild.forcedSkillPositions).filter(
          ([skill]) => skill !== previousUniqueSkill?.id,
        ),
      ),
    };
    const updatedUmas: EventTeam = {
      ...umas,
      event: selectedEvent,
      [key]: selectedUma?.id ?? null,
      [buildKey]: preservedBuild,
    };

    setUmas(updatedUmas);
    if (selectedUma) {
      setActiveBuild(Number(key.slice(-1)) as 1 | 2 | 3);
    }

    try {
      const db = createTeamRepository();

      await db.put(updatedUmas);
    } catch (error) {
      console.error("Error saving team:", error);
    }
  }

  function getSelectedUma(id: number | null): UmaEntry | null {
    if (id === null) {
      return null;
    }

    return umaList.find((uma) => uma.id === id) ?? null;
  }

  async function handleBuildChange(
    key: "uma1Build" | "uma2Build" | "uma3Build",
    build: UmaBuildData,
  ) {
    if (!selectedEvent) {
      return;
    }

    const updatedUmas = {
      ...umas,
      event: selectedEvent,
      [key]: build,
    };

    setUmas(updatedUmas);

    try {
      await createTeamRepository().put(updatedUmas);
    } catch (error) {
      console.error("Error saving Uma build:", error);
    }
  }

  return (
    <div className="planner">
      <RaceDisplay raceEntry={raceEntry} />

      <nav className="uma-selection" aria-label="Uma selections">
        {([1, 2, 3] as const).map((teamNumber) => {
          const umaKey = `uma${teamNumber}` as "uma1" | "uma2" | "uma3";
          const selectedUma = getSelectedUma(umas[umaKey]);

          return (
            <button
              className={`uma-selection__tab ${activeBuild === teamNumber ? "uma-selection__tab--active" : ""}`}
              key={teamNumber}
              type="button"
              aria-pressed={activeBuild === teamNumber}
              onClick={() => setActiveBuild(teamNumber)}
            >
              {selectedUma ? (
                <>
                  <UmaImage uma={selectedUma} alt="" />
                  <span>
                    <strong>{selectedUma.outfitTitle}</strong>
                    <small>{selectedUma.baseCharacterName}</small>
                  </span>
                </>
              ) : (
                <span>Uma {teamNumber}</span>
              )}
            </button>
          );
        })}
      </nav>

      {activeBuild && (
        <section className="uma-build-area" aria-label="Build selected Uma">
          <UmaBuild
            teamNumber={activeBuild}
            value={umas[`uma${activeBuild}Build`]}
            skillList={skillList}
            uniqueSkillId={getSelectedUma(umas[`uma${activeBuild}`])?.uniqueSkillId}
            selector={
              <UmaSelect
                teamNumber={activeBuild}
                umaList={umaList}
                value={getSelectedUma(umas[`uma${activeBuild}`])}
                onChange={(selected) => {
                  void handleInputChange(
                    `uma${activeBuild}` as "uma1" | "uma2" | "uma3",
                    selected,
                  );
                }}
              />
            }
            onChange={(build) => {
              void handleBuildChange(
                `uma${activeBuild}Build`,
                build,
              );
            }}
          />
        </section>
      )}
    </div>
  );
}
