import { useEffect, useState } from "react";
import { ensureDataLoaded } from "../../lib/data";
import type { RaceEntry } from "../../types/RaceEntry";
import type { SkillEntry } from "../../types/SkillEntry";
import type { UmaEntry } from "../../types/UmaEntry";
import { createRaceRepository } from "./pvpPlannerRepository";
import { normalizeSkillData } from "./skillData";

export function usePvpPlannerData(selectedEvent: string | null) {
  const [raceEntry, setRaceEntry] = useState<RaceEntry>();
  const [umaList, setUmaList] = useState<UmaEntry[]>([]);
  const [skillList, setSkillList] = useState<SkillEntry[]>([]);

  useEffect(() => {
    if (!selectedEvent) {
      setRaceEntry(undefined);
      return;
    }
    const event = selectedEvent;

    let cancelled = false;

    async function fetchRaceEntry() {
      try {
        const eventDetails = await createRaceRepository().getSingle(
          "eventTitle",
          event,
        );
        if (cancelled) {
          return;
        }

        if (eventDetails === undefined) {
          console.log(`No race details found for ${event} in IndexedDB`);
          setRaceEntry(undefined);
          return;
        }

        setRaceEntry(eventDetails);
        console.log(`${event} race details loaded from IndexedDB`);
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

  return { raceEntry, umaList, skillList };
}
