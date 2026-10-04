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
  supportCards?: SupportCardBuild[];
}

export interface StoredUmaBuild extends UmaBuild {
  id: string;
  event: string;
  name: string;
  lastUpdate: number;
}


export interface SupportCardBuild {
  position: number;
  support_card_id: number;
  limit_break_count: number;
}

export interface SupportCardEntry {
  id: number;
  name?: string;
}

export interface ImportedUmaBuild {
  card_id: number;
  name: string | null;
  created_time?: number | string;
  create_time?: number | string;
  speed: number;
  stamina: number;
  power: number;
  guts: number;
  wiz: number;
  proper_ground_turf: number;
  proper_ground_dirt: number;
  proper_distance_short: number;
  proper_distance_mile: number;
  proper_distance_middle: number;
  proper_distance_long: number;
  proper_running_style_nige: number;
  proper_running_style_senko: number;
  proper_running_style_sashi: number;
  proper_running_style_oikomi: number;
  running_style: number;
  skill_array: unknown[];
  support_card_list?: SupportCardBuild[];
}

export interface StoredImportedUmaBuild extends ImportedUmaBuild {
  id: string;
  importedAt: number;
}

export function isImportedUmaBuild(value: unknown): value is ImportedUmaBuild {
  if (!value || typeof value !== "object") return false;
  const build = value as Partial<ImportedUmaBuild>;
  return (
    typeof build.card_id === "number" &&
    (typeof build.name === "string" || build.name === null) &&
    (build.created_time === undefined || typeof build.created_time === "number" || typeof build.created_time === "string") &&
    (build.create_time === undefined || typeof build.create_time === "number" || typeof build.create_time === "string") &&
    typeof build.speed === "number" &&
    typeof build.stamina === "number" &&
    typeof build.power === "number" &&
    typeof build.guts === "number" &&
    typeof build.wiz === "number" &&
    typeof build.proper_ground_turf === "number" &&
    typeof build.proper_ground_dirt === "number" &&
    typeof build.proper_distance_short === "number" &&
    typeof build.proper_distance_mile === "number" &&
    typeof build.proper_distance_middle === "number" &&
    typeof build.proper_distance_long === "number" &&
    typeof build.proper_running_style_nige === "number" &&
    typeof build.proper_running_style_senko === "number" &&
    typeof build.proper_running_style_sashi === "number" &&
    typeof build.proper_running_style_oikomi === "number" &&
    typeof build.running_style === "number" &&
    Array.isArray(build.skill_array) &&
    (build.support_card_list === undefined ||
      Array.isArray(build.support_card_list) &&
      build.support_card_list.every((card) =>
        card && typeof card.position === "number" &&
        typeof card.support_card_id === "number" &&
        typeof card.limit_break_count === "number"
      ))
  );
}

export function getImportedSkillIds(skills: unknown[]) {
  return skills.flatMap((skill) => {
    if (!skill || typeof skill !== "object") return [];
    const skillId = (skill as { skill_id?: unknown }).skill_id;
    return typeof skillId === "number" || typeof skillId === "string"
      ? [String(skillId)]
      : [];
  });
}
