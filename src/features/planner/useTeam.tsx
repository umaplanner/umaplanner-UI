import { useCallback, useEffect, useRef, useState } from "react";
import type {
  StoredUmaBuild,
  UmaBuild as UmaBuildData,
} from "../../types/UmaBuild";
import {
  createBuildRepository,
  createTeamRepository,
  normalizeStoredTeam,
} from "./plannerRepository";
import {
  createEmptyTeam,
  createDefaultBuild,
  type EventTeam,
  type TeamState,
} from "./plannerTypes";
import {
  hasDuplicateBaseUmaIds,
  type InitialTeamBuildIds,
} from "../results/domain/resultsTypes";
import { deleteBuild, fetchBuilds, postBuilds } from "./buildApi";
import { fetchTeams, postTeams } from "./teamApi";
import { postAnonymousTeam } from "./anonymousTeamApi";
import { useAuth } from "../../contexts/AuthContext";
import {
  normalizeStrategyName,
  sortBuildsNewestFirst,
} from "../../components/UmaBuild/utils";

const SYNC_DEBOUNCE_MS = 2_000;

export function useTeam(selectedEvent: string | null) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const userRef = useRef(user);
  const selectedEventRef = useRef(selectedEvent);
  selectedEventRef.current = selectedEvent;
  const umasRef = useRef<TeamState | null>(null);
  const syncTimerRef = useRef<number | undefined>(undefined);
  const pendingBuildsRef = useRef(new Map<string, StoredUmaBuild>());
  const teamSyncTimerRef = useRef<number | undefined>(undefined);
  const pendingTeamsRef = useRef(new Map<string, EventTeam>());
  const teamSyncGenerationRef = useRef(new Map<string, number>());
  const anonymousTeamSyncTimerRef = useRef<number | undefined>(undefined);
  const pendingAnonymousTeamsRef = useRef(new Map<string, EventTeam>());
  const [buildRepository] = useState(() => createBuildRepository());
  const [umas, setUmas] = useState<TeamState>({
    ...createEmptyTeam(),
    uma1Build: createDefaultBuild(),
    uma2Build: createDefaultBuild(),
    uma3Build: createDefaultBuild(),
    uma1BuildName: "",
    uma2BuildName: "",
    uma3BuildName: "",
  });
  const [allBuilds, setAllBuilds] = useState<StoredUmaBuild[]>([]);
  const [loadedEvent, setLoadedEvent] = useState<string | null>(null);
  const isTeamLoading = Boolean(selectedEvent) &&
    (isAuthLoading || loadedEvent !== selectedEvent);

  useEffect(() => {
    umasRef.current = umas;
  }, [umas]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const flushBuildSync = useCallback(() => {
    if (syncTimerRef.current !== undefined) {
      window.clearTimeout(syncTimerRef.current);
      syncTimerRef.current = undefined;
    }
    const builds = Array.from(pendingBuildsRef.current.values());
    pendingBuildsRef.current.clear();
    if (userRef.current && builds.length > 0) {
      void postBuilds(builds).catch((error) => {
        console.error("Error syncing build to backend:", error);
      });
    }
  }, []);

  const scheduleBuildSync = useCallback((build: StoredUmaBuild) => {
    if (!userRef.current) return;
    pendingBuildsRef.current.set(`${build.event}:${build.id}`, build);
    if (syncTimerRef.current !== undefined) {
      window.clearTimeout(syncTimerRef.current);
    }

    syncTimerRef.current = window.setTimeout(() => {
      syncTimerRef.current = undefined;
      flushBuildSync();
    }, SYNC_DEBOUNCE_MS);
  }, [flushBuildSync]);

  const teamHasDuplicateBaseUmas = useCallback(async (
    team: EventTeam,
  ): Promise<boolean> => {
    const builds = await Promise.all(
      ([team.uma1, team.uma2, team.uma3] as const).map((buildId) =>
        buildId === null
          ? undefined
          : buildRepository.getByKey([team.event, buildId])
      ),
    );
    return hasDuplicateBaseUmaIds(builds);
  }, [buildRepository]);

  const scheduleTeamSync = useCallback((team: EventTeam) => {
    if (!userRef.current) return;
    const generation = teamSyncGenerationRef.current.get(team.event) ?? 0;
    void teamHasDuplicateBaseUmas(team).then((hasDuplicates) => {
      if (
        hasDuplicates ||
        generation !== (teamSyncGenerationRef.current.get(team.event) ?? 0) ||
        !userRef.current
      ) return;
      pendingTeamsRef.current.set(team.event, team);
      if (teamSyncTimerRef.current !== undefined) {
        window.clearTimeout(teamSyncTimerRef.current);
      }
      teamSyncTimerRef.current = window.setTimeout(() => {
        teamSyncTimerRef.current = undefined;
        const pendingTeams = Array.from(pendingTeamsRef.current.entries());
        pendingTeamsRef.current.clear();
        void Promise.all(pendingTeams.map(async ([event, pendingTeam]) => {
          const pendingGeneration = teamSyncGenerationRef.current.get(event) ?? 0;
          return await teamHasDuplicateBaseUmas(pendingTeam) ||
              pendingGeneration !== (teamSyncGenerationRef.current.get(event) ?? 0)
            ? null
            : pendingTeam;
        })).then((validTeams) => {
          const teams = validTeams.filter((pendingTeam) => pendingTeam !== null);
          if (userRef.current && teams.length > 0) {
            void postTeams(teams).catch((error) => {
              console.error("Error syncing teams to backend:", error);
            });
          }
        }).catch((error) => {
          console.error("Error validating teams before backend sync:", error);
        });
      }, SYNC_DEBOUNCE_MS);
    }).catch((error) => {
      console.error("Error validating team before backend sync:", error);
    });
  }, [teamHasDuplicateBaseUmas]);

  const scheduleAnonymousTeamSync = useCallback((team: EventTeam) => {
    if (userRef.current || isAuthLoading) return;
    pendingAnonymousTeamsRef.current.set(team.event, team);
    if (anonymousTeamSyncTimerRef.current !== undefined) {
      window.clearTimeout(anonymousTeamSyncTimerRef.current);
    }

    anonymousTeamSyncTimerRef.current = window.setTimeout(() => {
      anonymousTeamSyncTimerRef.current = undefined;
      const pendingTeams = Array.from(pendingAnonymousTeamsRef.current.values());
      pendingAnonymousTeamsRef.current.clear();
      void Promise.all(pendingTeams.map(async (pendingTeam) => {
        const buildIds = [pendingTeam.uma1, pendingTeam.uma2, pendingTeam.uma3];
        const storedBuilds = await Promise.all(buildIds.map((buildId) =>
          buildId === null
            ? undefined
            : buildRepository.getByKey([pendingTeam.event, buildId])
        ));
        if (storedBuilds.some((build, index) =>
          buildIds[index] !== null && build === undefined
        )) {
          throw new Error(
            `Cannot sync anonymous team for ${pendingTeam.event}: a selected build is missing.`,
          );
        }

        return {
          team: pendingTeam,
          builds: storedBuilds.filter(
            (build): build is StoredUmaBuild => build !== undefined,
          ),
        };
      })).then(async (contributions) => {
        if (userRef.current) return;
        await Promise.all(contributions.map(({ team, builds }) =>
          postAnonymousTeam(team, builds)
        ));
      }).catch((error) => {
        console.error("Error syncing anonymous teams to backend:", error);
      });
    }, SYNC_DEBOUNCE_MS);
  }, [buildRepository, isAuthLoading]);

  function invalidatePendingTeamSync(event: string): number {
    const generation = (teamSyncGenerationRef.current.get(event) ?? 0) + 1;
    teamSyncGenerationRef.current.set(event, generation);
    pendingTeamsRef.current.delete(event);
    if (pendingTeamsRef.current.size === 0 && teamSyncTimerRef.current !== undefined) {
      window.clearTimeout(teamSyncTimerRef.current);
      teamSyncTimerRef.current = undefined;
    }
    return generation;
  }

  useEffect(() => () => {
    flushBuildSync();
    if (teamSyncTimerRef.current !== undefined) {
      window.clearTimeout(teamSyncTimerRef.current);
    }
    teamSyncTimerRef.current = undefined;
    pendingTeamsRef.current.clear();
    teamSyncGenerationRef.current.clear();
  }, [flushBuildSync]);

  useEffect(() => {
    void buildRepository.ready().catch((error) => {
      console.error("Error initializing build database:", error);
    });
  }, [buildRepository]);

  const refreshBuilds = useCallback(async (event: string) => {
    const builds = await buildRepository.getAllFromIndex("event", event);
    const normalizedBuilds: StoredUmaBuild[] = [];
    for (const build of builds) {
      const strategy = normalizeStrategyName(build.strategy);
      if (strategy === build.strategy) {
        normalizedBuilds.push(build);
        continue;
      }

      const migratedBuild: StoredUmaBuild = {
        ...build,
        strategy,
        lastUpdate: Math.max(
          Date.now(),
          Number.isFinite(build.lastUpdate) ? build.lastUpdate + 1 : Date.now(),
        ),
      };
      await buildRepository.put(migratedBuild);
      scheduleBuildSync(migratedBuild);
      normalizedBuilds.push(migratedBuild);
    }
    if (selectedEventRef.current === event) {
      setAllBuilds(
        sortBuildsNewestFirst(normalizedBuilds.filter(
          (build) => build.event === event && build.outfitId !== "",
        )),
      );
    }
  }, [buildRepository, scheduleBuildSync]);

  const syncRemoteBuilds = useCallback(async (event: string): Promise<boolean> => {
    if (!userRef.current) return true;

    try {
      const {
        builds: remoteBuilds,
        deletedIds,
        migratedStrategyIds,
      } = await fetchBuilds(event);
      const migratedStrategyIdSet = new Set(migratedStrategyIds);
      for (const deletedId of deletedIds) {
        await buildRepository.deleteByKey([event, deletedId]);
      }
      const localBuilds = (await buildRepository.getAllFromIndex("event", event))
        .filter((build) => build.outfitId !== "")
        .map((build) => ({
          ...build,
          lastUpdate: Number.isFinite(build.lastUpdate) ? build.lastUpdate : 0,
        }));
      const localById = new Map(localBuilds.map((build) => [build.id, build]));
      for (const deletedId of deletedIds) {
        localById.delete(deletedId);
      }
      const buildsToSync: StoredUmaBuild[] = [];

      for (const remoteBuild of remoteBuilds) {
        const localBuild = localById.get(remoteBuild.id);
        if (!localBuild || remoteBuild.lastUpdate > localBuild.lastUpdate) {
          await buildRepository.put(remoteBuild);
          if (migratedStrategyIdSet.has(remoteBuild.id)) {
            scheduleBuildSync(remoteBuild);
          }
        } else if (localBuild.lastUpdate > remoteBuild.lastUpdate) {
          buildsToSync.push(localBuild);
        } else if (migratedStrategyIdSet.has(remoteBuild.id)) {
          scheduleBuildSync(remoteBuild);
        }
        localById.delete(remoteBuild.id);
      }
      for (const localBuild of localById.values()) {
        buildsToSync.push(localBuild);
      }
      for (const build of buildsToSync) {
        scheduleBuildSync(build);
      }
      await refreshBuilds(event);
      const currentTeam = umasRef.current;
      if (currentTeam?.event === event) {
        const displayedBuilds = await Promise.all(
          ([1, 2, 3] as const).map(async (slot) => {
            const buildId = currentTeam[`uma${slot}`];
            return buildId === null
              ? undefined
              : buildRepository.getByKey([event, buildId]);
          }),
        );
        setUmas((current) => ({
          ...current,
          uma1Build: displayedBuilds[0] ?? createDefaultBuild(),
          uma2Build: displayedBuilds[1] ?? createDefaultBuild(),
          uma3Build: displayedBuilds[2] ?? createDefaultBuild(),
          uma1BuildName: displayedBuilds[0]?.name ?? "",
          uma2BuildName: displayedBuilds[1]?.name ?? "",
          uma3BuildName: displayedBuilds[2]?.name ?? "",
        }));
      }
      return true;
    } catch (error) {
      console.error("Error fetching builds from backend:", error);
      return false;
    }
  }, [buildRepository, refreshBuilds, scheduleBuildSync]);

  const syncRemoteTeam = useCallback(async (
    event: string,
  ): Promise<EventTeam | null> => {
    if (!userRef.current) return null;
    const repository = createTeamRepository();
    const localTeam = await repository.getByKey(event);
    const remoteSnapshot = (await fetchTeams(event))[0];
    const remoteTeam = remoteSnapshot?.team;
    if (remoteTeam && remoteSnapshot?.legacyResults) {
      scheduleTeamSync(remoteTeam);
    }

    if (remoteTeam && (!localTeam || remoteTeam.lastUpdate > normalizeStoredTeam(localTeam, event).lastUpdate)) {
      if (!await teamHasDuplicateBaseUmas(remoteTeam)) {
        await repository.put(remoteTeam);
      }
      const currentTeam = umasRef.current;
      if (currentTeam?.event === event) {
        const displayedBuilds = await Promise.all(
          ([1, 2, 3] as const).map(async (slot) => {
            const buildId = remoteTeam[`uma${slot}`];
            return buildId === null
              ? undefined
              : buildRepository.getByKey([event, buildId]);
          }),
        );
        setUmas({
          ...currentTeam,
          ...remoteTeam,
          uma1Build: displayedBuilds[0] ?? createDefaultBuild(),
          uma2Build: displayedBuilds[1] ?? createDefaultBuild(),
          uma3Build: displayedBuilds[2] ?? createDefaultBuild(),
          uma1BuildName: displayedBuilds[0]?.name ?? "",
          uma2BuildName: displayedBuilds[1]?.name ?? "",
          uma3BuildName: displayedBuilds[2]?.name ?? "",
        });
      }
      return remoteTeam;
    }
    if (localTeam && (!remoteTeam || normalizeStoredTeam(localTeam, event).lastUpdate > remoteTeam.lastUpdate)) {
      const normalizedLocalTeam = normalizeStoredTeam(localTeam, event);
      scheduleTeamSync(normalizedLocalTeam);
      return normalizedLocalTeam;
    }
    return remoteTeam ?? null;
  }, [buildRepository, scheduleTeamSync, teamHasDuplicateBaseUmas]);

  useEffect(() => {
    if (isAuthLoading || !user || !selectedEvent) return;
    const event = selectedEvent;
    const interval = window.setInterval(() => {
      void syncRemoteBuilds(event);
      void syncRemoteTeam(event).catch((error) => {
        console.error("Error fetching teams from backend:", error);
      });
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [isAuthLoading, selectedEvent, syncRemoteBuilds, syncRemoteTeam, user]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!selectedEvent) {
      setLoadedEvent(null);
      setUmas({
        ...createEmptyTeam(),
        uma1Build: createDefaultBuild(),
        uma2Build: createDefaultBuild(),
        uma3Build: createDefaultBuild(),
        uma1BuildName: "",
        uma2BuildName: "",
        uma3BuildName: "",
      });
      setAllBuilds([]);
      return;
    }
    const event = selectedEvent;

    let cancelled = false;

    async function fetchTeam() {
      try {
        await buildRepository.ready();
        const repository = createTeamRepository();
        const storedTeam = await repository.getByKey(event);
        if (cancelled) {
          return;
        }

        const normalizedTeam = normalizeStoredTeam(storedTeam ?? createEmptyTeam(event), event);

        let emptyTeamToPersist: EventTeam | null = null;
        if (storedTeam) {
          const buildEntries = await Promise.all(
            ([1, 2, 3] as const).map(async (slot) => {
              const buildId = normalizedTeam[`uma${slot}`];
              if (buildId === null) {
                return undefined;
              }

              const storedBuild = await buildRepository.getByKey([event, buildId]);
              if (storedBuild) {
                return { slot, build: storedBuild };
              }
              return undefined;
            }),
          );
          if (cancelled) {
            return;
          }
          const loadedTeam: TeamState = {
            ...normalizedTeam,
            uma1Build: buildEntries[0]?.build ?? createDefaultBuild(),
            uma2Build: buildEntries[1]?.build ?? createDefaultBuild(),
            uma3Build: buildEntries[2]?.build ?? createDefaultBuild(),
            uma1BuildName: buildEntries[0]?.build.name ?? "",
            uma2BuildName: buildEntries[1]?.build.name ?? "",
            uma3BuildName: buildEntries[2]?.build.name ?? "",
          };
          umasRef.current = loadedTeam;
          setUmas(loadedTeam);
        } else {
          const teamRecord = createEmptyTeam(event);
          const newTeam: TeamState = {
            ...teamRecord,
            uma1Build: createDefaultBuild(),
            uma2Build: createDefaultBuild(),
            uma3Build: createDefaultBuild(),
            uma1BuildName: "",
            uma2BuildName: "",
            uma3BuildName: "",
          };
          umasRef.current = newTeam;
          setUmas(newTeam);
          if (user) {
            emptyTeamToPersist = teamRecord;
          } else {
            await repository.put(teamRecord);
          }
        }

        await refreshBuilds(event);
        if (cancelled) {
          return;
        }
        if (!user && storedTeam) {
          scheduleAnonymousTeamSync(normalizedTeam);
        }
        if (storedTeam || !user) {
          setLoadedEvent(event);
        }

        if (storedTeam) {
          const storedBuilds = await buildRepository.getAllFromIndex("event", event);
          await Promise.all(
            storedBuilds
              .filter((build) => build.outfitId === "")
              .map((build) => buildRepository.deleteByKey([build.event, build.id])),
          );
        }

        if (user) {
          try {
            const buildsFetched = await syncRemoteBuilds(event);
            if (buildsFetched) {
              const remoteTeam = await syncRemoteTeam(event);
              if (!remoteTeam && emptyTeamToPersist) {
                await repository.put(emptyTeamToPersist);
                scheduleTeamSync(emptyTeamToPersist);
              }
            }
          } finally {
            if (!storedTeam && !cancelled) {
              setLoadedEvent(event);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching team:", error);
        if (!cancelled) {
          setLoadedEvent(event);
        }
      }
    }

    void fetchTeam();
    return () => {
      cancelled = true;
    };
  }, [
    selectedEvent,
    user,
    isAuthLoading,
    buildRepository,
    refreshBuilds,
    scheduleTeamSync,
    scheduleAnonymousTeamSync,
    teamHasDuplicateBaseUmas,
    syncRemoteBuilds,
    syncRemoteTeam,
  ]);


  async function saveBuild(
    build: UmaBuildData,
    name: string,
    buildId: string | null = null,
  ): Promise<string | null> {
    if (!selectedEvent || build.outfitId === "" || name.trim() === "") {
      return null;
    }

    const event = selectedEvent;
    const id = buildId ?? crypto.randomUUID();
    try {
      const existingBuilds = await buildRepository.getAllFromIndex("event", event);
      const normalizedName = name.trim().toLowerCase();
      if (existingBuilds.some((existingBuild) =>
        existingBuild.id !== id &&
        existingBuild.name.trim().toLowerCase() === normalizedName
      )) {
        return null;
      }
      const storedBuild: StoredUmaBuild = {
        ...build,
        uniqueLv: typeof build.uniqueLv === "number" &&
            Number.isFinite(build.uniqueLv)
          ? build.uniqueLv
          : 3,
        strategy: normalizeStrategyName(build.strategy),
        "build-type": build["build-type"] ?? "standard",
        event,
        id,
        name: name.trim(),
        lastUpdate: Date.now(),
      };
      await buildRepository.put(storedBuild);
      if (userRef.current) {
        scheduleBuildSync(storedBuild);
      } else {
        const storedTeam = await createTeamRepository().getByKey(event);
        if (
          storedTeam &&
          [storedTeam.uma1, storedTeam.uma2, storedTeam.uma3].includes(id)
        ) {
          const normalizedTeam = normalizeStoredTeam(storedTeam, event);
          const team = {
            ...normalizedTeam,
            lastUpdate: Math.max(Date.now(), normalizedTeam.lastUpdate + 1),
          };
          await createTeamRepository().put(team);
          scheduleAnonymousTeamSync(team);
        }
      }
      await refreshBuilds(event);
      return id;
    } catch (error) {
      console.error("Error saving Uma build:", error);
      return null;
    }
  }

  async function removeBuild(buildId: string): Promise<boolean> {
    if (!selectedEvent || !buildId) return false;
    const event = selectedEvent;
    try {
      await buildRepository.deleteByKey([event, buildId]);
      const teamRepository = createTeamRepository();
      const storedTeam = await teamRepository.getByKey(event);
      if (storedTeam) {
        const team = normalizeStoredTeam(storedTeam, event);
        const updatedTeam = {
          ...team,
          uma1: team.uma1 === buildId ? null : team.uma1,
          uma2: team.uma2 === buildId ? null : team.uma2,
          uma3: team.uma3 === buildId ? null : team.uma3,
          lastUpdate: Math.max(Date.now(), team.lastUpdate + 1),
        };
        if (updatedTeam.uma1 !== team.uma1 || updatedTeam.uma2 !== team.uma2 || updatedTeam.uma3 !== team.uma3) {
          if (!await teamHasDuplicateBaseUmas(updatedTeam)) {
            await teamRepository.put(updatedTeam);
            if (user) scheduleTeamSync(updatedTeam);
            else scheduleAnonymousTeamSync(updatedTeam);
          }
          setUmas((current) => ({ ...current, ...updatedTeam }));
        }
      }
      if (user) {
        try {
          await deleteBuild(event, buildId);
        } catch (error) {
          if (error instanceof Error && error.message.includes("(404)")) {
            console.warn("Saved build was already absent from the remote service:", buildId);
          } else {
            throw error;
          }
        }
      }
      await refreshBuilds(event);
      return true;
    } catch (error) {
      console.error("Error removing Uma build:", error);
      return false;
    }
  }

  async function swapTeamBuild(buildIds: InitialTeamBuildIds): Promise<void> {
    if (!selectedEvent) return;
    const event = selectedEvent;
    const generation = invalidatePendingTeamSync(event);
    const selectedBuilds = await Promise.all(
      buildIds.map((buildId) =>
        buildId === null
          ? undefined
          : buildRepository.getByKey([event, buildId])
      ),
    );
    if (
      selectedEvent !== event ||
      generation !== (teamSyncGenerationRef.current.get(event) ?? 0) ||
      buildIds.some((buildId, index) =>
        buildId !== null && selectedBuilds[index] === undefined
      ) ||
      hasDuplicateBaseUmaIds(selectedBuilds)
    ) return;

    const repository = createTeamRepository();
    const storedTeam = await repository.getByKey(event);
    const team = normalizeStoredTeam(storedTeam ?? createEmptyTeam(event), event);
    const updatedTeam: EventTeam = {
      ...team,
      uma1: buildIds[0],
      uma2: buildIds[1],
      uma3: buildIds[2],
      lastUpdate: Math.max(Date.now(), team.lastUpdate + 1),
    };

    if (
      generation !== (teamSyncGenerationRef.current.get(event) ?? 0) ||
      selectedEvent !== event
    ) return;
    await repository.put(updatedTeam);
    if (user) {
      scheduleTeamSync(updatedTeam);
    } else {
      scheduleAnonymousTeamSync(updatedTeam);
    }
    setUmas((current) => ({
      ...current,
      ...updatedTeam,
      uma1Build: selectedBuilds[0] ?? createDefaultBuild(),
      uma2Build: selectedBuilds[1] ?? createDefaultBuild(),
      uma3Build: selectedBuilds[2] ?? createDefaultBuild(),
      uma1BuildName: selectedBuilds[0]?.name ?? "",
      uma2BuildName: selectedBuilds[1]?.name ?? "",
      uma3BuildName: selectedBuilds[2]?.name ?? "",
    }));
  }

  return {
    umas,
    isTeamLoading,
    allBuilds,
    saveBuild,
    removeBuild,
    swapTeamBuild,
  };
}
