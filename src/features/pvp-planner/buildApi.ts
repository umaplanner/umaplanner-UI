import { config } from "../../lib/config";
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
};

function toStoredBuild(response: BuildResponse): StoredUmaBuild | null {
  if (typeof response.event !== "string" || typeof response.id !== "string" ||
      !response.data || typeof response.data !== "object") return null;
  const data = response.data;
  if (
    typeof data.outfitId !== "string" || typeof data.name !== "string" ||
    typeof data.starCount !== "number" || typeof data.uniqueLv !== "number" ||
    typeof data.speed !== "number" || typeof data.stamina !== "number" ||
    typeof data.power !== "number" || typeof data.guts !== "number" ||
    typeof data.wisdom !== "number" || typeof data.strategy !== "string" ||
    typeof data.distanceAptitude !== "string" ||
    typeof data.surfaceAptitude !== "string" ||
    typeof data.strategyAptitude !== "string" || typeof data.mood !== "number" ||
    !Array.isArray(data.skills) ||
    !data.skills.every((skill) => typeof skill === "string") ||
    !data.forcedSkillPositions || typeof data.forcedSkillPositions !== "object"
  ) return null;
  return {
    ...data,
    skills: data.skills,
    forcedSkillPositions: data.forcedSkillPositions as Record<string, number>,
    lastUpdate: typeof data.lastUpdate === "number" ? data.lastUpdate : 0,
    event: response.event,
    id: response.id,
  } as StoredUmaBuild;
}

function toBuildResponse(build: StoredUmaBuild): BuildResponse {
  const { event, id, ...data } = build;
  return { event, id, data };
}

export async function fetchBuilds(event: string): Promise<BuildFetchResult> {
  if (!config.apiBaseUrl) return { builds: [], deletedIds: [] };
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
  records.forEach((record) => {
    if (!record || typeof record !== "object") return;
    const response = record as BuildResponse;
    if (response.event !== event || typeof response.id !== "string") return;
    if (response.deletedAt !== null && response.deletedAt !== undefined) {
      deletedIds.push(response.id);
      return;
    }
    const build = toStoredBuild(response);
    if (build) builds.push(build);
  });
  return { builds, deletedIds };
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
