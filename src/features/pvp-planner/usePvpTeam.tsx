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
  type PvpTeamState,
} from "./pvpPlannerTypes";
import { fetchBuilds, postBuilds } from "./buildApi";
import { useAuth } from "../../contexts/AuthContext";

export function usePvpTeam(selectedEvent: string | null) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const userRef = useRef(user);
  const syncTimerRef = useRef<number | undefined>(undefined);
  const pendingBuildsRef = useRef(new Map<string, StoredUmaBuild>());
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

  useEffect(() => () => {
    if (syncTimerRef.current !== undefined) {
      window.clearTimeout(syncTimerRef.current);
    }
    syncTimerRef.current = undefined;
    pendingBuildsRef.current.clear();
  }, []);

  useEffect(() => {
    void buildRepository.ready().catch((error) => {
      console.error("Error initializing build database:", error);
    });
  }, [buildRepository]);

  const refreshBuilds = useCallback(async (event: string) => {
    const builds = await buildRepository.getAll();
    setAllBuilds(
      builds.filter((build) => build.event === event && build.outfitId !== ""),
    );
  }, [buildRepository]);

  const syncRemoteBuilds = useCallback(async (event: string) => {
    if (!userRef.current) return;

    try {
      const remoteBuilds = await fetchBuilds(event);
      const localBuilds = (await buildRepository.getAll())
        .filter((build) => build.event === event && build.outfitId !== "")
        .map((build) => {
          if (typeof build.lastUpdate === "number") {
            return build;
          }
          const normalizedBuild = { ...build, lastUpdate: 0 };
          void buildRepository.put(normalizedBuild);
          return normalizedBuild;
        });
      const localById = new Map(localBuilds.map((build) => [build.id, build]));
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
    } catch (error) {
      console.error("Error fetching builds from backend:", error);
    }
  }, [buildRepository, refreshBuilds]);

  useEffect(() => {
    if (isAuthLoading || !user || !selectedEvent) return;
    const event = selectedEvent;
    const interval = window.setInterval(() => {
      void syncRemoteBuilds(event);
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [isAuthLoading, selectedEvent, syncRemoteBuilds, user]);

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
          await syncRemoteBuilds(event);
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

  return {
    umas,
    allBuilds,
    saveBuild,
  };
}
