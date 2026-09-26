import { config } from "../../lib/config";
import type { EventTeam } from "./pvpPlannerTypes";

function toStoredTeam(value: unknown): EventTeam | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (
    typeof data.event !== "string" ||
    (data.uma1 !== null && typeof data.uma1 !== "string") ||
    (data.uma2 !== null && typeof data.uma2 !== "string") ||
    (data.uma3 !== null && typeof data.uma3 !== "string")
  ) {
    return null;
  }
  return {
    event: data.event,
    uma1: data.uma1 as string | null,
    uma2: data.uma2 as string | null,
    uma3: data.uma3 as string | null,
    lastUpdate: typeof data.lastUpdate === "number" ? data.lastUpdate : 0,
  };
}

export async function fetchTeams(event: string): Promise<EventTeam[]> {
  if (!config.apiBaseUrl) return [];
  const url = `${config.apiBaseUrl}/teams`;
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch teams (${response.status}) from ${url}: ${await response.text()}`,
    );
  }
  const payload: unknown = await response.json();
  const records = Array.isArray(payload) ? payload : [payload];
  return records.flatMap((record) => {
    const team = toStoredTeam(record);
    return team && team.event === event ? [team] : [];
  });
}

export async function postTeams(teams: EventTeam[]): Promise<void> {
  if (teams.length === 0 || !config.apiBaseUrl) return;
  const url = `${config.apiBaseUrl}/teams`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(teams),
  });
  if (!response.ok) {
    throw new Error(
      `Failed to save teams (${response.status}) at ${url}: ${await response.text()}`,
    );
  }
}
