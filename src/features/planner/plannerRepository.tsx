import { IndexedDbRepository } from "../../components/indexedDbRepository";
import type { RaceEntry } from "../../types/RaceEntry";
import type { StoredUmaBuild } from "../../types/UmaBuild";
import type { EventResults, EventTeam } from "./plannerTypes";
import { createEmptyEventResults, createEmptyTeam, normalizeEventResults } from "./plannerTypes";

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
  return new IndexedDbRepository<EventResults>({
    databaseName: "TeamResultsDB",
    version: 1,
    storeName: "results",
    keyPath: "event",
  });
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
