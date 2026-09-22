export interface UmaBuild {
  outfitId: string;
  starCount: number;
  uniqueLv: number;
  speed: number;
  stamina: number;
  power: number;
  guts: number;
  wisdom: number;
  strategy: string;
  distanceAptitude: string;
  surfaceAptitude: string;
  strategyAptitude: string;
  mood: number;
  skills: string[];
  forcedSkillPositions: Record<string, number>;
}
