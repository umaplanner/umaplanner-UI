import { useEffect, useState } from "react";
import type { SkillEntry } from "../../types/SkillEntry";
import type { UmaBuild as UmaBuildData } from "../../types/UmaBuild";
import { createTeamRepository, normalizeStoredTeam } from "./pvpPlannerRepository";
import {
  createEmptyTeam,
  type BuildKey,
  type EventTeam,
  type UmaKey,
  type UmaSlot,
} from "./pvpPlannerTypes";
import type { UmaEntry } from "../../types/UmaEntry";

export function usePvpTeam(
  selectedEvent: string | null,
  skillList: SkillEntry[],
  umaList: UmaEntry[],
) {
  const [umas, setUmas] = useState<EventTeam>(createEmptyTeam());
  const [activeBuild, setActiveBuild] = useState<UmaSlot>(1);

  useEffect(() => {
    if (!selectedEvent) {
      setUmas(createEmptyTeam());
      setActiveBuild(1);
      return;
    }
    const event = selectedEvent;

    let cancelled = false;

    async function fetchTeam() {
      try {
        const repository = createTeamRepository();
        const storedTeam = await repository.getByKey(event);
        if (cancelled) {
          return;
        }

        if (storedTeam) {
          const normalizedTeam = normalizeStoredTeam(storedTeam, event);
          setUmas(normalizedTeam);
          setActiveBuild(
            normalizedTeam.uma1 ? 1 : normalizedTeam.uma2 ? 2 : normalizedTeam.uma3 ? 3 : 1,
          );
          return;
        }

        const newTeam = createEmptyTeam(event);
        await repository.put(newTeam);
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

  async function selectUma(key: UmaKey, selectedUma: UmaEntry | null) {
    if (!selectedEvent) {
      return;
    }
    const event = selectedEvent;

    const buildKey = `${key}Build` as BuildKey;
    const currentBuild = umas[buildKey];
    const currentUma = umas[key] === null
      ? null
      : umaList.find((uma) => uma.id === umas[key]) ?? null;
    const previousUniqueSkillId = currentUma?.uniqueSkillId === undefined
      ? undefined
      : skillList.find((skill) => skill.id === String(currentUma.uniqueSkillId))?.id;
    const preservedBuild: UmaBuildData = {
      ...currentBuild,
      outfitId: selectedUma ? String(selectedUma.id) : "",
      skills: currentBuild.skills.filter(
        (skill) =>
          !(skill in currentBuild.forcedSkillPositions) &&
          skill !== previousUniqueSkillId,
      ),
      forcedSkillPositions: Object.fromEntries(
        Object.entries(currentBuild.forcedSkillPositions).filter(
          ([skill]) => skill !== previousUniqueSkillId,
        ),
      ),
    };
    const updatedUmas: EventTeam = {
      ...umas,
      event,
      [key]: selectedUma?.id ?? null,
      [buildKey]: preservedBuild,
    };

    setUmas(updatedUmas);
    if (selectedUma) {
      setActiveBuild(Number(key.slice(-1)) as UmaSlot);
    }

    try {
      await createTeamRepository().put(updatedUmas);
    } catch (error) {
      console.error("Error saving team:", error);
    }
  }

  async function updateBuild(key: BuildKey, build: UmaBuildData) {
    if (!selectedEvent) {
      return;
    }
    const event = selectedEvent;

    const updatedUmas = { ...umas, event, [key]: build };
    setUmas(updatedUmas);

    try {
      await createTeamRepository().put(updatedUmas);
    } catch (error) {
      console.error("Error saving Uma build:", error);
    }
  }

  return {
    umas,
    activeBuild,
    setActiveBuild,
    selectUma,
    updateBuild,
  };
}
