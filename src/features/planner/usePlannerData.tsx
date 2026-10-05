import { useEffect, useState } from "react";
import { ensureDataLoaded } from "../../lib/data";
import type { RaceEntry } from "../../types/RaceEntry";
import type { SkillEntry } from "../../types/SkillEntry";
import type { UmaEntry } from "../../types/UmaEntry";
import type { SupportCardEntry } from "../../types/UmaBuild";
import { createRaceRepository } from "./plannerRepository";
import { normalizeSkillData } from "./skillData";

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
        const loadedData = await ensureDataLoaded();
        const data = (loadedData.outfits as UmaEntry[] | undefined) ?? [];
        const skills = normalizeSkillData(loadedData.skills);
        const rawSupportCards = loadedData.supportCards ?? loadedData.support_cards;
        const supportCards = Array.isArray(rawSupportCards)
          ? rawSupportCards.flatMap((entry) => {
            if (!entry || typeof entry !== "object") return [];
            const record = entry as Record<string, unknown>;
            const id = Number(record.id ?? record.support_card_id ?? record.card_id);
            return Number.isFinite(id)
              ? [{ id, name: typeof record.name === "string" ? record.name : undefined }]
              : [];
          })
          : [];

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
