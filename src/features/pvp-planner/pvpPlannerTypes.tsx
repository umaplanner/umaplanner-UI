import type { UmaBuild as UmaBuildData } from "../../types/UmaBuild";

export type UmaSlot = 1 | 2 | 3;
export type UmaKey = "uma1" | "uma2" | "uma3";
export type BuildKey = "uma1Build" | "uma2Build" | "uma3Build";

export type EventTeam = {
  event: string;
  uma1: string | null;
  uma2: string | null;
  uma3: string | null;
  lastUpdate: number;
};

export type PvpTeamState = EventTeam & {
  uma1Build: UmaBuildData;
  uma2Build: UmaBuildData;
  uma3Build: UmaBuildData;
  uma1BuildName: string;
  uma2BuildName: string;
  uma3BuildName: string;
};

export function createDefaultBuild(outfitId = ""): UmaBuildData {
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

export function createEmptyTeam(event = ""): EventTeam {
  return {
    event,
    uma1: null,
    uma2: null,
    uma3: null,
    lastUpdate: 0,
  };
}
