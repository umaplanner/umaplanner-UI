import { useEffect, useState } from "react";
import "../../styles/PvpPlanner.css";
import { useEvent } from "../../contexts/PvpEventContext";
import UmaSelect from "../../components/UmaSelect";
import RaceDisplay from "../../components/RaceDisplay";
import { IndexedDbRepository } from "../../components/indexedDbRepository";
import { ensureDataLoaded } from "../../lib/data";
import type { UmaEntry } from "../../types/UmaEntry";
import type { RaceEntry } from "../../types/RaceEntry";

type EventTeam = {
  event: string;
  uma1: number | null;
  uma2: number | null;
  uma3: number | null;
};

const emptyUmas: EventTeam = {
  event: "",
  uma1: null,
  uma2: null,
  uma3: null,
};

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
          return;
        }

        const newTeam: EventTeam = {
          event: selectedEvent,
          uma1: null,
          uma2: null,
          uma3: null,
        };

        await db.put(newTeam);

        if (!cancelled) {
          setUmas(newTeam);
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

        if (!cancelled) {
          setUmaList(data);
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
      [key]: selectedUma?.id ?? null,
    };

    setUmas(updatedUmas);

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
