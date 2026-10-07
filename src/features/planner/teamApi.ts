import { config } from "../../lib/config";
import {
  getLegacyEventResults,
  type EventResults,
  type EventTeam,
} from "./plannerTypes";

export interface FetchedTeam {
  team: EventTeam;
  legacyResults: EventResults | null;
}

function toStoredTeam(value: unknown): FetchedTeam | null {
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
    team: {
      event: data.event,
      uma1: data.uma1 as string | null,
      uma2: data.uma2 as string | null,
      uma3: data.uma3 as string | null,
      lastUpdate: typeof data.lastUpdate === "number" ? data.lastUpdate : 0,
    },
    legacyResults: getLegacyEventResults(data, data.event),
  };
}

export async function fetchTeams(event: string): Promise<FetchedTeam[]> {
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
    const snapshot = toStoredTeam(record);
    return snapshot && snapshot.team.event === event ? [snapshot] : [];
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
