import type {
  CountedId,
  CountedOutfit,
  CountedTeam,
  RunningStyleOverview,
} from "./types";

export const RUNNING_STYLE_TABS = [
  { key: "Oonige", name: "Runaway" },
  { key: "Nige", name: "Front" },
  { key: "Senkou", name: "Pace" },
  { key: "Sasi", name: "Late" },
  { key: "Oikomi", name: "End" },
] as const;

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function getId(value: unknown): string | undefined {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  const record = asRecord(value);
  const id = record?.outfitId ?? record?.outfit_id ?? record?.id;
  return typeof id === "string" || typeof id === "number"
    ? String(id)
    : undefined;
}

function getCount(value: unknown): number {
  const record = asRecord(value);
  const count = record?.count ?? record?.instances;
  return typeof count === "number" && Number.isFinite(count) && count >= 0
    ? Math.floor(count)
    : 1;
}

function normalizeCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 1;
}

function sortCountedIds(items: CountedId[]): CountedId[] {
  return [...items].sort((left, right) =>
    right.count - left.count || left.id.localeCompare(right.id, undefined, { numeric: true }),
  );
}

export function getCountedIds(value: unknown): CountedId[] {
  const record = asRecord(value);
  if (!record) return [];
  return sortCountedIds(Object.entries(record).map(([id, count]) => ({
    id,
    count: normalizeCount(count),
  })));
}

function getAverageStats(value: unknown): Record<string, number> {
  const record = asRecord(value);
  if (!record) return {};
  return Object.fromEntries(
    Object.entries(record).filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === "number" && Number.isFinite(entry[1]),
    ),
  );
}

export function getRunningStyles(value: unknown): RunningStyleOverview[] {
  const record = asRecord(value);
  return Array.isArray(record?.runningStyles)
    ? record.runningStyles.flatMap((entry) => {
        const styleRecord = asRecord(entry);
        if (typeof styleRecord?.style !== "string") return [];
        return [{
          style: styleRecord.style,
          count: normalizeCount(styleRecord.count),
          outfits: getCountedIds(styleRecord.outfits),
          skills: getCountedIds(styleRecord.skills),
          supportCards: getCountedIds(styleRecord.supportCards),
          averageStats: getAverageStats(styleRecord.averageStats),
        }];
      })
    : [];
}

export function getStyleCountedSupportCards(styles: RunningStyleOverview[]): CountedId[] {
  const counts = new Map<string, number>();
  for (const style of styles) {
    for (const card of style.supportCards) {
      counts.set(
        card.id,
        (counts.get(card.id) ?? 0) + Math.min(card.count, style.count),
      );
    }
  }
  return [...counts].map(([id, count]) => ({ id, count }));
}

function getTeamIds(value: unknown): string[] {
  const record = asRecord(value);
  const members = Array.isArray(value)
    ? value
    : Array.isArray(record?.outfits)
      ? record.outfits
      : Array.isArray(record?.umas)
        ? record.umas
        : record
          ? [record.uma1, record.uma2, record.uma3]
          : [];

  return members.flatMap((member) => {
    const id = getId(member);
    return id ? [id] : [];
  });
}

export function getOverviewRows(data: unknown): {
  outfits: CountedOutfit[];
  teams: CountedTeam[];
} {
  const record = asRecord(data);
  const rawTeams = Array.isArray(record?.teams)
    ? record.teams
    : Array.isArray(record?.teamSetups)
      ? record.teamSetups
      : [];

  const teamCounts = new Map<string, CountedTeam>();
  const outfitCounts = new Map<string, number>();

  for (const team of rawTeams) {
    const ids = getTeamIds(team);
    if (ids.length === 0) continue;

    const count = getCount(team);
    const key = JSON.stringify([...ids].sort());
    const existing = teamCounts.get(key);
    teamCounts.set(key, {
      members: ids.map((id) => ({ id, label: id })),
      count: (existing?.count ?? 0) + count,
    });

    for (const id of ids) {
      outfitCounts.set(id, (outfitCounts.get(id) ?? 0) + count);
    }
  }

  const rawOutfits = record?.outfits;
  if (Array.isArray(rawOutfits) && rawOutfits.length > 0) {
    outfitCounts.clear();
    for (const outfit of rawOutfits) {
      const id = getId(outfit);
      if (!id) continue;
      outfitCounts.set(id, (outfitCounts.get(id) ?? 0) + getCount(outfit));
    }
  } else if (asRecord(rawOutfits)) {
    outfitCounts.clear();
    for (const [id, count] of Object.entries(asRecord(rawOutfits) ?? {})) {
      outfitCounts.set(id, normalizeCount(count));
    }
  }

  let teams = [...teamCounts.values()].sort((a, b) => b.count - a.count);
  const styleCombinations = asRecord(record?.runningStyleCombinations);
  if (teams.length === 0 && styleCombinations) {
    teams = Object.entries(styleCombinations).map(([combination, count]) => ({
      members: combination
        .split(",")
        .map((label) => label.trim())
        .filter(Boolean)
        .map((label) => ({ label })),
      count: normalizeCount(count),
    })).sort((a, b) => b.count - a.count);
  }

  return {
    outfits: [...outfitCounts].map(([id, count]) => ({ id, count })),
    teams,
  };
}

export function formatCount(count: number): string {
  return count.toLocaleString();
}

export function formatBuildCount(count: number): string {
  return `${formatCount(count)} ${count === 1 ? "build" : "builds"} taken into account`;
}

export function formatPercent(count: number, total: number): string {
  if (total <= 0) return "0%";
  return `${((count / total) * 100).toLocaleString(undefined, {
    maximumFractionDigits: 1,
  })}%`;
}
