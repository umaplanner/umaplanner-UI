import type { SupportCardEntry } from "../../types/UmaBuild";

export function normalizeSupportCardList(rawSupportCards: unknown): SupportCardEntry[] {
  if (Array.isArray(rawSupportCards)) {
    return rawSupportCards.flatMap((entry) => normalizeSupportCard(entry));
  }
  if (!rawSupportCards || typeof rawSupportCards !== "object") return [];

  const rawRecord = rawSupportCards as Record<string, unknown>;
  if (
    "id" in rawRecord ||
    "support_card_id" in rawRecord ||
    "card_id" in rawRecord
  ) {
    return normalizeSupportCard(rawRecord);
  }
  if (
    "data" in rawRecord &&
    rawRecord.data &&
    typeof rawRecord.data === "object"
  ) {
    return normalizeSupportCardList(rawRecord.data);
  }

  return Object.entries(rawRecord).flatMap(([key, entry]) => {
    if (
      entry &&
      typeof entry === "object" &&
      !Array.isArray(entry) &&
      ("id" in entry || "support_card_id" in entry || "card_id" in entry)
    ) {
      return normalizeSupportCard(entry, key);
    }
    return normalizeSupportCardList(entry);
  });
}

function normalizeSupportCard(
  entry: unknown,
  key?: string,
): SupportCardEntry[] {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
  const record = entry as Record<string, unknown>;
  const id = Number(record.id ?? record.support_card_id ?? record.card_id ?? key);
  return Number.isFinite(id) &&
      typeof record.title === "string" &&
      typeof record.uma === "string"
    ? [{
        id,
        title: record.title,
        uma: record.uma,
      }]
    : [];
}
