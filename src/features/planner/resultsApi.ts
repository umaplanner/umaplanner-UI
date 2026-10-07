import { config } from "../../lib/config";
import {
  isTeamBuildAssignments,
  isTeamResults,
  isTeamTicketBuildResults,
  normalizeEventResults,
  type EventResults,
} from "./plannerTypes";

function toEventResults(record: unknown): EventResults | null {
  if (!record || typeof record !== "object") return null;
  const envelope = record as Record<string, unknown>;
  if (typeof envelope.event !== "string") return null;
  const data = envelope.data && typeof envelope.data === "object" &&
      !Array.isArray(envelope.data)
    ? { ...(envelope.data as Record<string, unknown>), event: envelope.event }
    : envelope;
  const assignments = data.buildAssignments ?? data.buildOverrides;
  if (
    !isTeamResults(data.results) ||
    (assignments !== undefined && !isTeamBuildAssignments(assignments)) ||
    (
      data.ticketBuildResults !== undefined &&
      !isTeamTicketBuildResults(data.ticketBuildResults)
    )
  ) {
    return null;
  }
  return normalizeEventResults(data, envelope.event);
}

export async function fetchAllResults(): Promise<EventResults[]> {
  if (!config.apiBaseUrl) return [];
  const url = `${config.apiBaseUrl}/results`;
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch results (${response.status}) from ${url}: ${await response.text()}`,
    );
  }
  const payload: unknown = await response.json();
  const records = Array.isArray(payload) ? payload : [payload];
  return records.flatMap((record) => {
    const results = toEventResults(record);
    return results ? [results] : [];
  });
}

export async function fetchCurrentEventResults(
  event: string,
): Promise<EventResults | null> {
  if (!config.apiBaseUrl) return null;
  const url = `${config.apiBaseUrl}/results/${encodeURIComponent(event)}`;
  const response = await fetch(url, { credentials: "include" });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(
      `Failed to fetch results (${response.status}) from ${url}: ${await response.text()}`,
    );
  }
  const results = toEventResults(await response.json());
  return results?.event === event ? results : null;
}

export async function postResults(results: EventResults[]): Promise<void> {
  if (results.length === 0 || !config.apiBaseUrl) return;
  const url = `${config.apiBaseUrl}/results`;
  const payload = results.map(({ event, ...data }) => ({ event, data }));
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(
      `Failed to save results (${response.status}) at ${url}: ${await response.text()}`,
    );
  }
}
