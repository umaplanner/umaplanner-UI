import { IndexedDbRepository } from "../../components/indexedDbRepository";
import type { RaceEntry } from "../../types/RaceEntry";
import type { StoredUmaBuild } from "../../types/UmaBuild";
import type { EventTeam } from "./pvpPlannerTypes";
import { createEmptyTeam } from "./pvpPlannerTypes";

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
    version: 1,
    storeName: "teams",
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
    ...createEmptyTeam(event),
    ...storedTeam,
    event,
  };
}
