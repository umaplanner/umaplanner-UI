import { useEffect, useState } from "react";
import "../../styles/PvpPlanner.css";
import { useEvent } from "../../contexts/PvpEventContext";
import UmaSelect from "../../components/UmaSelect";
import type { UmaEntry } from "../../types/UmaEntry";

type SelectedUmas = {
  uma1: string;
  uma2: string;
  uma3: string;
};

function cacheData<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function getCachedData<T>(key: string): T | null {
  const cached = localStorage.getItem(key);

  if (!cached) {
    return null;
  }

  return JSON.parse(cached) as T;
}

const emptyUmas: SelectedUmas = {
  uma1: "",
  uma2: "",
  uma3: "",
};

export default function PvpPlanner() {
  const { selectedEvent } = useEvent();

  const [umaList, setUmaList] = useState<UmaEntry[]>([]);
  const [umas, setUmas] = useState<SelectedUmas>(emptyUmas);

  useEffect(() => {
    if (!selectedEvent) {
      setUmas(emptyUmas);
      return;
    }

    const cachedData = getCachedData<Partial<SelectedUmas>>(selectedEvent);

    const eventUmas: SelectedUmas = {
      uma1: cachedData?.uma1 ?? "",
      uma2: cachedData?.uma2 ?? "",
      uma3: cachedData?.uma3 ?? "",
    };

    setUmas(eventUmas);
    cacheData(selectedEvent, eventUmas);
  }, [selectedEvent]);

  useEffect(() => {
    const cachedUmaList = getCachedData<UmaEntry[]>("umaList");

    if (cachedUmaList) {
      setUmaList(cachedUmaList);
      return;
    }

    fetch("http://localhost:5063/umas/variants")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        return response.json() as Promise<UmaEntry[]>;
      })
      .then((data) => {
        setUmaList(data);
        cacheData("umaList", data);
      })
      .catch((error) => {
        console.error("Error fetching UMA variants:", error);
      });
  }, []);

  function handleInputChange(
    key: keyof SelectedUmas,
    selectedUma: UmaEntry | null
  ) {
    if (!selectedEvent) {
      return;
    }

    setUmas((previousUmas) => {
      const updatedUmas: SelectedUmas = {
        ...previousUmas,
        [key]: selectedUma?.name ?? "",
      };

      cacheData(selectedEvent, updatedUmas);

      return updatedUmas;
    });
  }

  function getSelectedUma(name: string) {
    return umaList.find((uma) => uma.name === name) ?? null;
  }

  return (
    <>
      <div className="planner">
        <div className="uma-select">
          <UmaSelect
            teamNumber={1}
            umaList={umaList}
            value={getSelectedUma(umas.uma1)}
            onChange={(selected) => handleInputChange("uma1", selected)}
          />
          <UmaSelect
            teamNumber={2}
            umaList={umaList}
            value={getSelectedUma(umas.uma2)}
            onChange={(selected) => handleInputChange("uma2", selected)}
          />
          <UmaSelect
            teamNumber={3}
            umaList={umaList}
            value={getSelectedUma(umas.uma3)}
            onChange={(selected) => handleInputChange("uma3", selected)}
          />
        </div>
      </div>
    </>
  );
}
