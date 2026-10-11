import { IndexedDbRepository } from "../../components/indexedDbRepository";
import type { RaceEntry } from "../../types/RaceEntry";
import type { StoredUmaBuild } from "../../types/UmaBuild";
import type { EventResults, EventTeam } from "./plannerTypes";
import {
  createEmptyEventResults,
  createEmptyTeam,
  normalizeEventResults,
  serializeEventResults,
} from "./plannerTypes";

export function createRaceRepository() {
  return new IndexedDbRepository<RaceEntry>({
    databaseName: "RaceDB",
    version: 2,
    storeName: "races",
    keyPath: "eventTitle",
    indexes: [{ name: "eventTitle", unique: true }],
  });
}

export function createTeamRepository() {
  return new IndexedDbRepository<EventTeam>({
    databaseName: "TeamDB",
    version: 2,
    storeName: "teams",
    keyPath: "event",
  });
}

export function createResultsRepository() {
  const repository = new IndexedDbRepository<Record<string, unknown>>({
    databaseName: "TeamResultsDB",
    version: 1,
    storeName: "results",
    keyPath: "event",
  });
  async function normalizeAndMigrate(
    record: Record<string, unknown>,
    event: string,
  ): Promise<EventResults> {
    const results = normalizeEventResults(record, event);
    const isGroupedRecord = !("results" in record) &&
      (
        "round1Day1" in record ||
        "round1Day2" in record ||
        "round2Day1" in record ||
        "round2Day2" in record ||
        (record.finals !== null && typeof record.finals === "object")
      );
    if (!isGroupedRecord) {
      // REMOVE once all existing TeamResultsDB records have been rewritten.
      await repository.put({
        event,
        ...serializeEventResults(results),
      });
    }
    return results;
  }
  return {
    async getAll() {
      const records = await repository.getAll();
      return (await Promise.all(records.map((record) =>
        typeof record.event === "string"
          ? normalizeAndMigrate(record, record.event)
          : null
      ))).filter((record): record is EventResults => record !== null);
    },
    async getByKey(event: string) {
      const record = await repository.getByKey(event);
      return record ? normalizeAndMigrate(record, event) : undefined;
    },
    put(results: EventResults) {
      return repository.put({
        event: results.event,
        ...serializeEventResults(results),
      });
    },
    addMany(results: EventResults[]) {
      return repository.addMany(results.map((result) => ({
        event: result.event,
        ...serializeEventResults(result),
      })));
    },
  };
}

export function createBuildRepository() {
  return new IndexedDbRepository<StoredUmaBuild>({
    databaseName: "BuildDB",
    version: 2,
    storeName: "builds",
    keyPath: ["event", "id"],
    indexes: [{ name: "event" }],
  });
}

export function normalizeStoredTeam(
  storedTeam: EventTeam,
  event: string,
): EventTeam {
  return {
    event,
    uma1: storedTeam.uma1 ?? null,
    uma2: storedTeam.uma2 ?? null,
    uma3: storedTeam.uma3 ?? null,
    lastUpdate: typeof storedTeam.lastUpdate === "number"
      ? storedTeam.lastUpdate
      : createEmptyTeam(event).lastUpdate,
  };
}

export function normalizeStoredResults(
  storedResults: EventResults | undefined,
  event: string,
): EventResults {
  return storedResults
    ? normalizeEventResults(storedResults, event)
    : createEmptyEventResults(event);
}
