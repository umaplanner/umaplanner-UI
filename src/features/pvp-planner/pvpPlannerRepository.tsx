import { IndexedDbRepository } from "../../components/indexedDbRepository";
import type { RaceEntry } from "../../types/RaceEntry";
import type { UmaBuild as UmaBuildData } from "../../types/UmaBuild";
import type { EventTeam } from "./pvpPlannerTypes";
import { createDefaultBuild, createEmptyTeam } from "./pvpPlannerTypes";

type LegacyEventTeam = EventTeam & {
  uma1Customization?: UmaBuildData;
  uma2Customization?: UmaBuildData;
  uma3Customization?: UmaBuildData;
};

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

export function normalizeStoredTeam(
  storedTeam: EventTeam,
  event: string,
): EventTeam {
  const legacyTeam = storedTeam as LegacyEventTeam;

  return {
    ...createEmptyTeam(event),
    ...storedTeam,
    event,
    uma1Build:
      storedTeam.uma1Build ??
      legacyTeam.uma1Customization ??
      createDefaultBuild(),
    uma2Build:
      storedTeam.uma2Build ??
      legacyTeam.uma2Customization ??
      createDefaultBuild(),
    uma3Build:
      storedTeam.uma3Build ??
      legacyTeam.uma3Customization ??
      createDefaultBuild(),
  };
}
