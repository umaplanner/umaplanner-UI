import { useCallback, useEffect, useRef, useState } from "react";
import type {
  StoredUmaBuild,
  UmaBuild as UmaBuildData,
} from "../../types/UmaBuild";
import {
  createBuildRepository,
  createResultsRepository,
  createTeamRepository,
  normalizeStoredResults,
  normalizeStoredTeam,
} from "./plannerRepository";
import {
  createEmptyTeam,
  createDefaultBuild,
  hasDuplicateBaseUmaIds,
  type EventTeam,
  type TeamState,
  type InitialTeamBuildIds,
} from "./plannerTypes";
import {
  createEmptyEventResults,
  type EventResults,
} from "./resultsTypes";
import {
  getLegacyEventResults,
} from "./resultsNormalization";
import { createResultActions } from "./resultActions";
import { deleteBuild, fetchBuilds, postBuilds } from "./buildApi";
import { fetchTeams, postTeams } from "./teamApi";
import {
  fetchAllResults,
  fetchCurrentEventResults,
  postResults,
} from "./resultsApi";
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
  const resultsSyncTimerRef = useRef<number | undefined>(undefined);
  const pendingResultsRef = useRef(new Map<string, EventResults>());
  const resultsRef = useRef<EventResults | null>(null);
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
  const [eventResults, setEventResults] = useState<EventResults>(() => createEmptyEventResults());
  const [loadedEvent, setLoadedEvent] = useState<string | null>(null);
  const isTeamLoading = Boolean(selectedEvent) &&
    (isAuthLoading || loadedEvent !== selectedEvent);

  useEffect(() => {
    umasRef.current = umas;
  }, [umas]);

  useEffect(() => {
    resultsRef.current = eventResults;
  }, [eventResults]);

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

  function scheduleResultsSync(results: EventResults) {
    if (!userRef.current) return;
    pendingResultsRef.current.set(results.event, results);
    if (resultsSyncTimerRef.current !== undefined) {
      window.clearTimeout(resultsSyncTimerRef.current);
    }
    resultsSyncTimerRef.current = window.setTimeout(() => {
      resultsSyncTimerRef.current = undefined;
      pendingResultsRef.current.clear();
      if (userRef.current) {
        void createResultsRepository().getAll().then((storedResults) => {
          if (userRef.current && storedResults.length > 0) {
            return postResults(storedResults);
          }
        }).catch((error) => {
          console.error("Error syncing results to backend:", error);
        });
      }
    }, SYNC_DEBOUNCE_MS);
  }

  async function migrateLegacyResults(event: string, sources: unknown[]) {
    const repository = createResultsRepository();
    const storedResults = await repository.getByKey(event);
    if (storedResults) return normalizeStoredResults(storedResults, event);

    const migratedResults = sources
      .map((source) => getLegacyEventResults(source, event))
      .filter((results): results is EventResults => results !== null)
      .sort((left, right) => right.lastUpdate - left.lastUpdate)[0];
    if (!migratedResults) return null;

    await repository.put(migratedResults);
    scheduleResultsSync(migratedResults);
    if (resultsRef.current?.event === event) {
      resultsRef.current = migratedResults;
      setEventResults(migratedResults);
    }
    return migratedResults;
  }

  useEffect(() => () => {
    flushBuildSync();
    if (teamSyncTimerRef.current !== undefined) {
      window.clearTimeout(teamSyncTimerRef.current);
    }
    if (resultsSyncTimerRef.current !== undefined) {
      window.clearTimeout(resultsSyncTimerRef.current);
    }
    teamSyncTimerRef.current = undefined;
    pendingTeamsRef.current.clear();
    teamSyncGenerationRef.current.clear();
    pendingResultsRef.current.clear();
  }, [flushBuildSync]);

  useEffect(() => {
    void buildRepository.ready().catch((error) => {
      console.error("Error initializing build database:", error);
    });
  }, [buildRepository]);

  const refreshBuilds = useCallback(async (event: string) => {
    const builds = await buildRepository.getAll();
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
      const localBuilds = (await buildRepository.getAll())
        .filter((build) => build.event === event && build.outfitId !== "")
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
    await migrateLegacyResults(event, [localTeam, remoteSnapshot?.legacyResults]);
    if (localTeam && getLegacyEventResults(localTeam, event)) {
      const normalizedLocalTeam = normalizeStoredTeam(localTeam, event);
      if (!await teamHasDuplicateBaseUmas(normalizedLocalTeam)) {
        await repository.put(normalizedLocalTeam);
      }
    }
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

  const syncAllRemoteResults = useCallback(async (): Promise<void> => {
    if (!userRef.current) return;

    const repository = createResultsRepository();
    const [storedRecords, remoteResults] = await Promise.all([
      repository.getAll(),
      fetchAllResults(),
    ]);
    const localResults = storedRecords.map((result) =>
      normalizeStoredResults(result, result.event)
    );
    const localByEvent = new Map(
      localResults.map((result) => [result.event, result]),
    );
    const remoteByEvent = new Map(
      remoteResults.map((result) => [result.event, result]),
    );
    const newerRemoteResults = remoteResults.filter((remoteResult) => {
      const localResult = localByEvent.get(remoteResult.event);
      return !localResult || remoteResult.lastUpdate > localResult.lastUpdate;
    });

    if (newerRemoteResults.length > 0) {
      await repository.addMany(newerRemoteResults);
      const currentEventResult = newerRemoteResults.find(
        (result) => resultsRef.current?.event === result.event,
      );
      if (currentEventResult) {
        resultsRef.current = currentEventResult;
        setEventResults(currentEventResult);
      }
    }

    const localResultToSync = localResults.find((localResult) => {
      const remoteResult = remoteByEvent.get(localResult.event);
      return !remoteResult || localResult.lastUpdate > remoteResult.lastUpdate;
    });
    if (localResultToSync) {
      scheduleResultsSync(localResultToSync);
    }
  }, []);

  const syncRemoteSelectedResult = useCallback(async (
    event: string,
  ): Promise<void> => {
    if (!userRef.current) return;

    const repository = createResultsRepository();
    const [storedResults, remoteResults] = await Promise.all([
      repository.getByKey(event),
      fetchCurrentEventResults(event),
    ]);
    const localResults = storedResults
      ? normalizeStoredResults(storedResults, event)
      : null;

    if (remoteResults && (
      !localResults ||
      remoteResults.lastUpdate > localResults.lastUpdate
    )) {
      await repository.put(remoteResults);
      if (resultsRef.current?.event === event) {
        resultsRef.current = remoteResults;
        setEventResults(remoteResults);
      }
      return;
    }

    if (localResults) {
      if (!remoteResults || localResults.lastUpdate > remoteResults.lastUpdate) {
        scheduleResultsSync(localResults);
      }
      if (resultsRef.current?.event === event) {
        resultsRef.current = localResults;
        setEventResults(localResults);
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthLoading || !user || !selectedEvent) return;
    const event = selectedEvent;
    const interval = window.setInterval(() => {
      void syncRemoteBuilds(event);
      void syncRemoteTeam(event).catch((error) => {
        console.error("Error fetching teams from backend:", error);
      });
      void syncRemoteSelectedResult(event).catch((error) => {
        console.error("Error fetching results from backend:", error);
      });
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [isAuthLoading, selectedEvent, syncRemoteBuilds, syncRemoteTeam, syncRemoteSelectedResult, user]);

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
      const emptyResults = createEmptyEventResults();
      resultsRef.current = emptyResults;
      setEventResults(emptyResults);
      return;
    }
    const event = selectedEvent;
    const initialResults = createEmptyEventResults(event);
    resultsRef.current = initialResults;
    setEventResults(initialResults);

    let cancelled = false;

    async function fetchTeam() {
      try {
        await buildRepository.ready();
        const repository = createTeamRepository();
        const resultsRepository = createResultsRepository();
        const storedTeam = await repository.getByKey(event);
        if (cancelled) {
          return;
        }

        const migratedResults = await migrateLegacyResults(event, [storedTeam]);
        if (storedTeam && getLegacyEventResults(storedTeam, event)) {
          const normalizedStoredTeam = normalizeStoredTeam(storedTeam, event);
          if (!await teamHasDuplicateBaseUmas(normalizedStoredTeam)) {
            await repository.put(normalizedStoredTeam);
          }
        }
        const storedResults = migratedResults ??
          await resultsRepository.getByKey(event);
        const normalizedTeam = normalizeStoredTeam(storedTeam ?? createEmptyTeam(event), event);
        let loadedResults = normalizeStoredResults(storedResults, event);
        const teamBuildIds: EventResults["initialBuildIds"] = [
          normalizedTeam.uma1,
          normalizedTeam.uma2,
          normalizedTeam.uma3,
        ];
        if (
          loadedResults.initialBuildIds.every((buildId) => buildId === null) &&
          teamBuildIds.some((buildId) => buildId !== null)
        ) {
          loadedResults = { ...loadedResults, initialBuildIds: teamBuildIds };
          await resultsRepository.put(loadedResults);
          if (user) scheduleResultsSync(loadedResults);
        }
        resultsRef.current = loadedResults;
        setEventResults(loadedResults);

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
        if (storedTeam || !user) {
          setLoadedEvent(event);
        }

        if (storedTeam) {
          const storedBuilds = await buildRepository.getAll();
          await Promise.all(
            storedBuilds
              .filter((build) => build.event === event && build.outfitId === "")
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
              await syncAllRemoteResults().catch((error) => {
                console.error("Error fetching results from backend:", error);
              });
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
    teamHasDuplicateBaseUmas,
    syncRemoteBuilds,
    syncRemoteTeam,
    syncAllRemoteResults,
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
          lastUpdate: Date.now(),
        };
        if (updatedTeam.uma1 !== team.uma1 || updatedTeam.uma2 !== team.uma2 || updatedTeam.uma3 !== team.uma3) {
          if (!await teamHasDuplicateBaseUmas(updatedTeam)) {
            await teamRepository.put(updatedTeam);
            if (user) scheduleTeamSync(updatedTeam);
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
      lastUpdate: Date.now(),
    };

    if (
      generation !== (teamSyncGenerationRef.current.get(event) ?? 0) ||
      selectedEvent !== event
    ) return;
    await repository.put(updatedTeam);
    if (user) {
      scheduleTeamSync(updatedTeam);
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
    const currentResults = resultsRef.current;
    if (currentResults?.event === event) {
      const initialBuildIds = currentResults.initialBuildIds.map(
        (buildId, index) => buildId ?? buildIds[index],
      ) as InitialTeamBuildIds;
      if (
        initialBuildIds.some(
          (buildId, index) => buildId !== currentResults.initialBuildIds[index],
        )
      ) {
        saveEventResults({ ...currentResults, initialBuildIds });
      }
    }
  }

  function saveEventResults(nextResults: EventResults) {
    if (
      !selectedEvent ||
      nextResults.event !== selectedEvent
    ) return;

    const updatedResults: EventResults = {
      ...nextResults,
      lastUpdate: Date.now(),
    };
    resultsRef.current = updatedResults;
    setEventResults(updatedResults);
    void createResultsRepository().put(updatedResults).then(() => {
      if (userRef.current) scheduleResultsSync(updatedResults);
    }).catch((error) => {
      console.error("Error saving event results:", error);
    });
  }


  const resultActions = createResultActions({
    selectedEvent,
    allBuilds,
    getCurrentResults: () => resultsRef.current,
    saveEventResults,
  });

  return {
    ...resultActions,
    umas,
    isTeamLoading,
    allBuilds,
    eventResults,
    saveBuild,
    removeBuild,
    swapTeamBuild,
  };
}
