import { useEffect, useState } from "react";
import "../../styles/PvpPlanner.css";
import { useEvent } from "../../contexts/PvpEventContext";
import UmaSelect from "../../components/UmaSelect";
import RaceDisplay from "../../components/RaceDisplay";
import { IndexedDbRepository } from "../../components/indexedDbRepository";
import type { UmaEntry } from "../../types/UmaEntry";
import type { RaceEntry } from "../../types/RaceEntry";

type EventTeam = {
  event: string;
  uma1: string;
  uma2: string;
  uma3: string;
};

const emptyUmas: EventTeam = {
  event: "",
  uma1: "",
  uma2: "",
  uma3: "",
};

function cacheData<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function getCachedData<T>(key: string): T | null {
  const cached = localStorage.getItem(key);

  if (!cached) {
    return null;
  }

  try {
    return JSON.parse(cached) as T;
  } catch (error) {
    console.error(`Could not parse cached data for key "${key}"`, error);
    return null;
  }
}

function createRaceRepository() {
  return new IndexedDbRepository<RaceEntry>({
    databaseName: "RaceDB",
    version: 1,
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
  const [umas, setUmas] = useState<EventTeam>(emptyUmas);

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
          setUmas(storedTeam);
          console.log(`Loaded ${selectedEvent} team from IndexedDB`);
          return;
        }

        const newTeam: EventTeam = {
          event: selectedEvent,
          uma1: "",
          uma2: "",
          uma3: "",
        };

        await db.put(newTeam);

        if (!cancelled) {
          setUmas(newTeam);
        }

        console.log(`Created empty team for ${selectedEvent}`);
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
    const cachedUmaList = getCachedData<UmaEntry[]>("umaList");

    if (cachedUmaList) {
      setUmaList(cachedUmaList);
      return;
    }

    async function fetchUmaList() {
      try {
        const response = await fetch(
          "http://localhost:5063/umas/variants"
        );

        if (!response.ok) {
          throw new Error(
            `Request failed with status ${response.status}`
          );
        }

        const data = (await response.json()) as UmaEntry[];

        setUmaList(data);
        cacheData("umaList", data);
      } catch (error) {
        console.error("Error fetching UMA variants:", error);
      }
    }

    void fetchUmaList();
  }, []);

  async function handleInputChange(
    key: keyof Pick<EventTeam, "uma1" | "uma2" | "uma3">,
    selectedUma: UmaEntry | null
  ) {
    if (!selectedEvent) {
      return;
    }

    const updatedUmas: EventTeam = {
      ...umas,
      event: selectedEvent,
      [key]: selectedUma?.name ?? "",
    };

    setUmas(updatedUmas);

    try {
      const db = createTeamRepository();

      await db.put(updatedUmas);
    } catch (error) {
      console.error("Error saving team:", error);
    }
  }

  function getSelectedUma(name: string): UmaEntry | null {
    return umaList.find((uma) => uma.name === name) ?? null;
  }

  return (
    <div className="planner">
      <RaceDisplay raceEntry={raceEntry} />

      <div className="uma-select">
        <UmaSelect
          teamNumber={1}
          umaList={umaList}
          value={getSelectedUma(umas.uma1)}
          onChange={(selected) => {
            void handleInputChange("uma1", selected);
          }}
        />

        <UmaSelect
          teamNumber={2}
          umaList={umaList}
          value={getSelectedUma(umas.uma2)}
          onChange={(selected) => {
            void handleInputChange("uma2", selected);
          }}
        />

        <UmaSelect
          teamNumber={3}
          umaList={umaList}
          value={getSelectedUma(umas.uma3)}
          onChange={(selected) => {
            void handleInputChange("uma3", selected);
          }}
        />
      </div>
    </div>
  );
}
