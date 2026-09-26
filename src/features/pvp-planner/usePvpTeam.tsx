import { useCallback, useEffect, useRef, useState } from "react";
import type {
  StoredUmaBuild,
  UmaBuild as UmaBuildData,
} from "../../types/UmaBuild";
import {
  createBuildRepository,
  createTeamRepository,
  normalizeStoredTeam,
} from "./pvpPlannerRepository";
import {
  createEmptyTeam,
  createDefaultBuild,
  type EventTeam,
  type PvpTeamState,
} from "./pvpPlannerTypes";
import { fetchBuilds, postBuilds } from "./buildApi";
import { fetchTeams, postTeams } from "./teamApi";
import { useAuth } from "../../contexts/AuthContext";
import { sortBuildsNewestFirst } from "../../components/UmaBuild/umaBuildUtils";

export function usePvpTeam(selectedEvent: string | null) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const userRef = useRef(user);
  const umasRef = useRef<PvpTeamState | null>(null);
  const syncTimerRef = useRef<number | undefined>(undefined);
  const pendingBuildsRef = useRef(new Map<string, StoredUmaBuild>());
  const teamSyncTimerRef = useRef<number | undefined>(undefined);
  const pendingTeamsRef = useRef(new Map<string, EventTeam>());
  const [buildRepository] = useState(() => createBuildRepository());
  const [umas, setUmas] = useState<PvpTeamState>({
    ...createEmptyTeam(),
    uma1Build: createDefaultBuild(),
    uma2Build: createDefaultBuild(),
    uma3Build: createDefaultBuild(),
    uma1BuildName: "",
    uma2BuildName: "",
    uma3BuildName: "",
  });
  const [allBuilds, setAllBuilds] = useState<StoredUmaBuild[]>([]);

  useEffect(() => {
    umasRef.current = umas;
  }, [umas]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  function scheduleBuildSync(build: StoredUmaBuild) {
    if (!userRef.current) return;
    pendingBuildsRef.current.set(`${build.event}:${build.id}`, build);
    if (syncTimerRef.current !== undefined) {
      window.clearTimeout(syncTimerRef.current);
    }

    syncTimerRef.current = window.setTimeout(() => {
      syncTimerRef.current = undefined;
      const builds = Array.from(pendingBuildsRef.current.values());
      pendingBuildsRef.current.clear();
      if (userRef.current) {
        void postBuilds(builds).catch((error) => {
          console.error("Error syncing build to backend:", error);
        });
      }
    }, 10_000);
  }

  function scheduleTeamSync(team: EventTeam) {
    if (!userRef.current) return;
    pendingTeamsRef.current.set(team.event, team);
    if (teamSyncTimerRef.current !== undefined) {
      window.clearTimeout(teamSyncTimerRef.current);
    }
    teamSyncTimerRef.current = window.setTimeout(() => {
      teamSyncTimerRef.current = undefined;
      const teams = Array.from(pendingTeamsRef.current.values());
      pendingTeamsRef.current.clear();
      if (userRef.current) {
        void postTeams(teams).catch((error) => {
          console.error("Error syncing teams to backend:", error);
        });
      }
    }, 10_000);
  }

  useEffect(() => () => {
    if (syncTimerRef.current !== undefined) {
      window.clearTimeout(syncTimerRef.current);
    }
    if (teamSyncTimerRef.current !== undefined) {
      window.clearTimeout(teamSyncTimerRef.current);
    }
    syncTimerRef.current = undefined;
    teamSyncTimerRef.current = undefined;
    pendingBuildsRef.current.clear();
    pendingTeamsRef.current.clear();
  }, []);

  useEffect(() => {
    void buildRepository.ready().catch((error) => {
      console.error("Error initializing build database:", error);
    });
  }, [buildRepository]);

  const refreshBuilds = useCallback(async (event: string) => {
    const builds = await buildRepository.getAll();
    setAllBuilds(
      sortBuildsNewestFirst(builds.filter(
        (build) => build.event === event && build.outfitId !== "",
      )),
    );
  }, [buildRepository]);

  const syncRemoteBuilds = useCallback(async (event: string): Promise<boolean> => {
    if (!userRef.current) return true;

    try {
      const { builds: remoteBuilds, deletedIds } = await fetchBuilds(event);
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
        } else if (localBuild.lastUpdate > remoteBuild.lastUpdate) {
          buildsToSync.push(localBuild);
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
  }, [buildRepository, refreshBuilds]);

  const syncRemoteTeam = useCallback(async (
    event: string,
  ): Promise<EventTeam | null> => {
    if (!userRef.current) return null;
    const repository = createTeamRepository();
    const localTeam = await repository.getByKey(event);
    const remoteTeam = (await fetchTeams(event))[0];

    if (remoteTeam && (!localTeam || remoteTeam.lastUpdate > normalizeStoredTeam(localTeam, event).lastUpdate)) {
      await repository.put(remoteTeam);
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
  }, [buildRepository]);

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
        if (user) {
          const [buildsFetched] = await Promise.all([
            syncRemoteBuilds(event),
            syncRemoteTeam(event),
          ]);
          if (!buildsFetched) {
            return;
          }
        }
        const repository = createTeamRepository();
        const storedTeam = await repository.getByKey(event);
        if (cancelled) {
          return;
        }

        if (storedTeam) {
          const normalizedTeam = normalizeStoredTeam(storedTeam, event);
          const storedBuilds = await buildRepository.getAll();
          await Promise.all(
            storedBuilds
              .filter((build) => build.event === event && build.outfitId === "")
              .map((build) => buildRepository.deleteByKey([build.event, build.id])),
          );
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
          const loadedTeam: PvpTeamState = {
            ...normalizedTeam,
            uma1Build: buildEntries[0]?.build ?? createDefaultBuild(),
            uma2Build: buildEntries[1]?.build ?? createDefaultBuild(),
            uma3Build: buildEntries[2]?.build ?? createDefaultBuild(),
            uma1BuildName: buildEntries[0]?.build.name ?? "",
            uma2BuildName: buildEntries[1]?.build.name ?? "",
            uma3BuildName: buildEntries[2]?.build.name ?? "",
          };
          setUmas(loadedTeam);
          await refreshBuilds(event);
          return;
        }

        const newTeam: PvpTeamState = {
          ...createEmptyTeam(event),
          uma1Build: createDefaultBuild(),
          uma2Build: createDefaultBuild(),
          uma3Build: createDefaultBuild(),
          uma1BuildName: "",
          uma2BuildName: "",
          uma3BuildName: "",
        };
        const {
          uma1Build,
          uma2Build,
          uma3Build,
          uma1BuildName,
          uma2BuildName,
          uma3BuildName,
          ...teamRecord
        } = newTeam;
        void uma1Build;
        void uma2Build;
        void uma3Build;
        void uma1BuildName;
        void uma2BuildName;
        void uma3BuildName;
        await repository.put(teamRecord);
        if (user) {
          scheduleTeamSync(teamRecord);
        }
        if (!cancelled) {
          setUmas(newTeam);
          await refreshBuilds(event);
        }
      } catch (error) {
        console.error("Error fetching team:", error);
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
      const storedBuild: StoredUmaBuild = {
        ...build,
        event,
        id,
        name: name.trim(),
        lastUpdate: Date.now(),
      };
      await buildRepository.put(storedBuild);
      if (user) {
        scheduleBuildSync(storedBuild);
      }
      await refreshBuilds(event);
      return id;
    } catch (error) {
      console.error("Error saving Uma build:", error);
      return null;
    }
  }

  async function swapTeamBuild(slot: 1 | 2 | 3, buildId: string): Promise<void> {
    if (!selectedEvent || !buildId) return;

    const event = selectedEvent;
    const repository = createTeamRepository();
    const storedTeam = await repository.getByKey(event);
    const team = normalizeStoredTeam(storedTeam ?? createEmptyTeam(event), event);
    const updatedTeam = {
      ...team,
      [`uma${slot}`]: buildId,
      lastUpdate: Date.now(),
    } as typeof team;

    await repository.put(updatedTeam);
    if (user) {
      scheduleTeamSync(updatedTeam);
    }
    setUmas((current) => ({
      ...current,
      ...updatedTeam,
    }));
  }

  return {
    umas,
    allBuilds,
    saveBuild,
    swapTeamBuild,
  };
}
