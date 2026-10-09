import { useEffect, useState } from "react";
import { ensureDataLoaded, getCachedDataset } from "../../lib/data";
import type { RaceEntry } from "../../types/RaceEntry";
import type { SkillEntry } from "../../types/SkillEntry";
import type { UmaEntry } from "../../types/UmaEntry";
import type { SupportCardEntry } from "../../types/UmaBuild";
import { createRaceRepository } from "./plannerRepository";
import { normalizeSkillData } from "./skillData";
import { normalizeSupportCardList } from "./supportCardData";

export function usePlannerData(selectedEvent: string | null) {
  const [raceEntry, setRaceEntry] = useState<RaceEntry>();
  const [umaList, setUmaList] = useState<UmaEntry[]>([]);
  const [skillList, setSkillList] = useState<SkillEntry[]>([]);
  const [supportCardList, setSupportCardList] = useState<SupportCardEntry[]>([]);

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
        const [cachedOutfits, cachedSkills, cachedSupportCards, cachedLegacySupportCards] =
          await Promise.all([
            getCachedDataset<UmaEntry[]>("outfits"),
            getCachedDataset<unknown>("skills"),
            getCachedDataset<unknown>("supportCards"),
            getCachedDataset<unknown>("support_cards"),
          ]);
        if (cancelled) {
          return;
        }
        if (cachedOutfits) setUmaList(cachedOutfits);
        if (cachedSkills !== null) setSkillList(normalizeSkillData(cachedSkills));
        if (cachedSupportCards !== null || cachedLegacySupportCards !== null) {
          setSupportCardList(
            normalizeSupportCardList(cachedSupportCards ?? cachedLegacySupportCards),
          );
        }

        const loadedData = await ensureDataLoaded();
        const data = (loadedData.outfits as UmaEntry[] | undefined) ?? [];
        const skills = normalizeSkillData(loadedData.skills);
        const supportCards = normalizeSupportCardList(loadedData);

        if (!cancelled) {
          setUmaList(data);
          setSkillList(skills);
          setSupportCardList(supportCards);
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

  return { raceEntry, umaList, skillList, supportCardList };
}
