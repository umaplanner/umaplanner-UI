export interface SkillEntry {
  id: string;
  name: string;
  groupId: string | null;
  iconId: number;
  isGeneralSkill: boolean;
  displayOrder: number;
  rarity: number;
}
