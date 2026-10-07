import { config } from "../../lib/config";
import { normalizeStrategyName } from "../../components/UmaBuild/utils";
import type { StoredUmaBuild } from "../../types/UmaBuild";

interface BuildResponse {
  event: string;
  id: string;
  data: Record<string, unknown>;
  deletedAt?: string | null;
}

export type BuildFetchResult = {
  builds: StoredUmaBuild[];
  deletedIds: string[];
  migratedStrategyIds: string[];
};

function toStoredBuild(response: BuildResponse): StoredUmaBuild | null {
  if (typeof response.event !== "string" || typeof response.id !== "string" ||
      !response.data || typeof response.data !== "object" ||
      Array.isArray(response.data)) return null;
  const data = response.data;
  const forcedSkillPositions = data.forcedSkillPositions;
  const supportCards = data.supportCards;
  if (
    typeof data.outfitId !== "string" ||
    (data.name !== undefined && data.name !== null &&
      typeof data.name !== "string") ||
    typeof data.starCount !== "number" ||
    (data.uniqueLv !== undefined && typeof data.uniqueLv !== "number") ||
    typeof data.speed !== "number" || typeof data.stamina !== "number" ||
    typeof data.power !== "number" || typeof data.guts !== "number" ||
    typeof data.wisdom !== "number" || typeof data.strategy !== "string" ||
    typeof data.distanceAptitude !== "string" ||
    typeof data.surfaceAptitude !== "string" ||
    typeof data.strategyAptitude !== "string" || typeof data.mood !== "number" ||
    (data["build-type"] !== undefined &&
      data["build-type"] !== null &&
      data["build-type"] !== "standard" &&
      data["build-type"] !== "plan") ||
    (data.create_time !== undefined && data.create_time !== null &&
      typeof data.create_time !== "number" &&
      typeof data.create_time !== "string") ||
    !Array.isArray(data.skills) ||
    !data.skills.every((skill) => typeof skill === "string") ||
    (forcedSkillPositions !== undefined && forcedSkillPositions !== null &&
      (typeof forcedSkillPositions !== "object" ||
        Array.isArray(forcedSkillPositions) ||
        !Object.values(forcedSkillPositions).every((position) =>
          typeof position === "number" && Number.isFinite(position)
        ))) ||
    (supportCards !== undefined && supportCards !== null && (
      !Array.isArray(supportCards) ||
      !supportCards.every((card) =>
        card && typeof card === "object" &&
        typeof card.position === "number" &&
        typeof card.support_card_id === "number" &&
        typeof card.limit_break_count === "number"
      )
    ))
  ) return null;
  return {
    ...data,
    name: typeof data.name === "string" ? data.name : "",
    "build-type": data["build-type"] === "plan" ? "plan" : "standard",
    uniqueLv: typeof data.uniqueLv === "number" ? data.uniqueLv : 3,
    create_time: typeof data.create_time === "number" ||
        typeof data.create_time === "string"
      ? data.create_time
      : undefined,
    strategy: normalizeStrategyName(data.strategy),
    skills: data.skills,
    forcedSkillPositions: forcedSkillPositions && typeof forcedSkillPositions === "object"
      ? forcedSkillPositions as Record<string, number>
      : {},
    supportCards: Array.isArray(supportCards) ? supportCards as StoredUmaBuild["supportCards"] : [],
    lastUpdate: typeof data.lastUpdate === "number" ? data.lastUpdate : 0,
    event: response.event,
    id: response.id,
  } as StoredUmaBuild;
}

function toBuildResponse(build: StoredUmaBuild): BuildResponse {
  const { event, id, ...data } = build;
  return {
    event,
    id,
    data: { ...data, strategy: normalizeStrategyName(data.strategy) },
  };
}

export async function fetchBuilds(event: string): Promise<BuildFetchResult> {
  if (!config.apiBaseUrl) {
    return { builds: [], deletedIds: [], migratedStrategyIds: [] };
  }
  const url = `${config.apiBaseUrl}/builds`;
  const response = await fetch(
    url,
    { credentials: "include" },
  );
  if (!response.ok) {
    throw new Error(
      `Failed to fetch builds (${response.status}) from ${url}: ${await response.text()}`,
    );
  }
  const payload: unknown = await response.json();
  const records = Array.isArray(payload) ? payload : [payload];

  const builds: StoredUmaBuild[] = [];
  const deletedIds: string[] = [];
  const migratedStrategyIds: string[] = [];
  records.forEach((record) => {
    if (!record || typeof record !== "object") return;
    const response = record as BuildResponse;
    if (response.event !== event || typeof response.id !== "string") return;
    if (response.deletedAt !== null && response.deletedAt !== undefined) {
      deletedIds.push(response.id);
      return;
    }
    if (response.data?.strategy === "Sashi") {
      migratedStrategyIds.push(response.id);
    }
    const build = toStoredBuild(response);
    if (build) {
      builds.push(build);
    } else {
      console.warn(
        `Skipping malformed build from backend (event: ${event}, id: ${response.id})`,
      );
    }
  });
  return { builds, deletedIds, migratedStrategyIds };
}

export async function postBuilds(builds: StoredUmaBuild[]): Promise<void> {
  if (builds.length === 0) return;
  if (!config.apiBaseUrl) return;

  const url = `${config.apiBaseUrl}/builds`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(builds.map(toBuildResponse)),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to save build (${response.status}) at ${url}: ${await response.text()}`,
    );
  }
}

export async function deleteBuild(event: string, id: string): Promise<void> {
  if (!config.apiBaseUrl) return;
  await new Promise<void>((resolve) => setTimeout(resolve, 2_000));
  const url = `${config.apiBaseUrl}/builds/delete`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ event, id }),
  });
  if (!response.ok) {
    throw new Error(
      `Failed to delete build (${response.status}) at ${url}: ${await response.text()}`,
    );
  }
}
