import { IndexedDbRepository } from "../../../components/indexedDbRepository";
import {
  normalizeEventResults,
  serializeEventResults,
} from "./resultsCodec";
import { isLegacyEventResults, migrateLegacyEventResults } from "./resultsMigration";
import {
  createEmptyEventResults,
  type EventResults,
} from "../domain/resultsTypes";

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
    const isCurrent = "round1Day1" in record || "round1Day2" in record ||
      "round2Day1" in record || "round2Day2" in record || "finals" in record;
    if (isCurrent) return normalizeEventResults(record, event);

    if (!isLegacyEventResults(record)) return createEmptyEventResults(event);

    const results = migrateLegacyEventResults(record, event);
    await repository.put({ event, ...serializeEventResults(results) });
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

export function normalizeStoredResults(
  storedResults: EventResults | undefined,
  event: string,
): EventResults {
  return storedResults
    ? normalizeEventResults(storedResults, event)
    : createEmptyEventResults(event);
}
