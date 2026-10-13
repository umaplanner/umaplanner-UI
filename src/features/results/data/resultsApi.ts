import { config } from "../../../lib/config";
import { normalizeEventResults, serializeEventResults } from "./resultsCodec";
import { isLegacyEventResults, migrateLegacyEventResults } from "./resultsMigration";
import type { EventResults } from "../domain/resultsTypes";

function toEventResults(record: unknown): EventResults | null {
  if (!record || typeof record !== "object") return null;

  const envelope = record as Record<string, unknown>;
  if (typeof envelope.event !== "string") return null;

  const data = envelope.data && typeof envelope.data === "object" &&
      !Array.isArray(envelope.data)
    ? { ...(envelope.data as Record<string, unknown>), event: envelope.event }
    : envelope;

  const current = normalizeEventResults(data, envelope.event);
  if (current.event === envelope.event && !("results" in data) && (
    "round1Day1" in data || "round1Day2" in data ||
    "round2Day1" in data || "round2Day2" in data || "finals" in data
  )) return current;

  return isLegacyEventResults(data)
    ? migrateLegacyEventResults(data, envelope.event)
    : null;
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
  const payload = results.map((result) => ({
    event: result.event,
    data: serializeEventResults(result),
  }));

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
