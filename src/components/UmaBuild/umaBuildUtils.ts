import type { SkillEntry } from "../../types/SkillEntry";
import type { UmaEntry } from "../../types/UmaEntry";

export const aptitudeOptions = ["S", "A", "B", "C", "D", "E", "F", "G"];
export const aptitudeRankImages: Record<string, number> = {
  S: 14, A: 12, B: 10, C: 8, D: 6, E: 4, F: 2, G: 0,
};
export const strategyOptions = ["Nige", "Senkou", "Sashi", "Oikomi", "Oonige"];
export const strategyIcons: Record<string, string> = {
  Nige: "front", Senkou: "pace", Sashi: "late", Oikomi: "end",
};
export const statFields = ["speed", "stamina", "power", "guts", "wisdom"] as const;

export function getStatRank(stat: number) {
  const value = Math.max(0, stat);
  if (value < 400) return Math.floor(value / 50);
  if (value < 1100) return 8 + Math.floor((value - 400) / 100);
  if (value < 1150) return 16;
  if (value <= 1200) return 17;
  if (value < 1210) return 18;
  return Math.min(97, 19 + Math.floor((value - 1210) / 10));
}

export function findSkill(skillList: SkillEntry[], skillId: string) {
  return skillList.find((skill) => skill.id === skillId) ??
    skillList.find((skill) => skill.name === skillId);
}

export function getUmaUniqueSkillId(uma: UmaEntry | null | undefined) {
  if (!uma) return undefined;
  const charaId = String(uma.charaId);
  const outfitNumber = Number(String(uma.id).slice(-1));
  if (!/^\d+$/.test(charaId) || !Number.isInteger(outfitNumber)) {
    return undefined;
  }
  return Number(`${charaId[0]}${outfitNumber - 1}${charaId.slice(1)}1`);
}
