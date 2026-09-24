import type { SkillEntry } from "../../types/SkillEntry";

export function normalizeSkillData(data: unknown): SkillEntry[] {
  const dataset =
    data && typeof data === "object" && "data" in data
      ? (data as { data: unknown }).data
      : data;
  const records = Array.isArray(dataset)
    ? dataset
    : dataset && typeof dataset === "object"
      ? Object.entries(dataset).map(([id, entry]) =>
          entry && typeof entry === "object"
            ? { id, ...entry }
            : { id, name: String(entry) },
        )
      : [];

  return records.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const record = entry as Record<string, unknown>;
    const name = [record.name, record.skillName, record.title, record.text]
      .find(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0,
      );
    if (!name) {
      return [];
    }

    return [
      {
        id: String(record.id ?? record.skillId ?? index),
        name,
        groupId: getSkillGroupId(record),
        iconId: getSkillIconId(record),
        isGeneralSkill: getSkillGeneralFlag(record),
        displayOrder: getSkillDisplayOrder(record, index),
        rarity: getSkillRarity(record),
      },
    ];
  }).sort((left, right) => left.displayOrder - right.displayOrder);
}

function getRawSkillRecord(record: Record<string, unknown>) {
  const raw = record.raw;
  return typeof raw === "string"
    ? parseRawSkill(raw)
    : raw && typeof raw === "object"
      ? (raw as Record<string, unknown>)
      : null;
}

function getSkillGroupId(record: Record<string, unknown>): string | null {
  const rawRecord = getRawSkillRecord(record);
  const groupId = rawRecord?.group_id ?? record["raw/group_id"] ?? record.group_id;

  return groupId === undefined || groupId === null ? null : String(groupId);
}

function getSkillIconId(record: Record<string, unknown>): number {
  const iconId = findSkillIconId(record);
  return typeof iconId === "number" && Number.isFinite(iconId)
    ? iconId
    : Number(iconId) || 0;
}

function getSkillGeneralFlag(record: Record<string, unknown>): boolean {
  const raw = getRawSkillRecord(record);
  const generalFlag =
    raw?.is_general_skill ??
    raw?.isGeneralSkill ??
    record["raw/is_general_skill"] ??
    record.is_general_skill ??
    record.isGeneralSkill;
  return generalFlag === 1 || generalFlag === "1" || generalFlag === true;
}

function getSkillDisplayOrder(record: Record<string, unknown>, fallback: number): number {
  const raw = getRawSkillRecord(record);
  const displayOrder =
    raw?.disp_order ??
    raw?.dispOrder ??
    record["raw/disp_order"] ??
    record.disp_order ??
    record.dispOrder;
  const numericOrder = Number(displayOrder);

  return Number.isFinite(numericOrder) ? numericOrder : fallback;
}

function getSkillRarity(record: Record<string, unknown>): number {
  const raw = getRawSkillRecord(record);
  const rarity = raw?.rarity ?? record["raw/rarity"] ?? record.rarity;
  const numericRarity = Number(rarity);

  return Number.isFinite(numericRarity) ? numericRarity : 0;
}

function findSkillIconId(value: unknown, depth = 0): unknown {
  if (depth > 4 || !value || typeof value !== "object") {
    return undefined;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const iconId = findSkillIconId(entry, depth + 1);
      if (iconId !== undefined) {
        return iconId;
      }
    }
    return undefined;
  }

  for (const [key, entry] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normalizedKey === "iconid" || normalizedKey.endsWith("iconid")) {
      return entry;
    }

    const nestedValue = typeof entry === "string" ? parseRawSkill(entry) : entry;
    const iconId = findSkillIconId(nestedValue, depth + 1);
    if (iconId !== undefined) {
      return iconId;
    }
  }

  return undefined;
}

function parseRawSkill(raw: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
