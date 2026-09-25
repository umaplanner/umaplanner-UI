import { useEffect, useRef, useState } from "react";
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
import { fetchBuilds, postBuild } from "./buildApi";
import { useAuth } from "../../contexts/AuthContext";

export function usePvpTeam(selectedEvent: string | null) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const userRef = useRef(user);
  const syncTimersRef = useRef(new Map<string, number>());
  const hasLoadedRemoteBuildsRef = useRef(false);
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
    const existingTimer = syncTimersRef.current.get(build.id);
    if (existingTimer !== undefined) window.clearTimeout(existingTimer);
    const timer = window.setTimeout(() => {
      syncTimersRef.current.delete(build.id);
      if (userRef.current) {
        void postBuild(build).catch((error) => {
          console.error("Error syncing build to backend:", error);
        });
      }
    }, 10_000);
    syncTimersRef.current.set(build.id, timer);
  }

  useEffect(() => () => {
    for (const timer of syncTimersRef.current.values()) window.clearTimeout(timer);
    syncTimersRef.current.clear();
  }, []);

  useEffect(() => {
    void buildRepository.ready().catch((error) => {
      console.error("Error initializing build database:", error);
    });
  }, [buildRepository]);

  async function refreshBuilds(event: string) {
    const builds = await buildRepository.getAll();
    setAllBuilds(
      builds.filter((build) => build.event === event && build.outfitId !== ""),
    );
  }

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
        let remoteBuilds: StoredUmaBuild[] = [];
        if (user && !hasLoadedRemoteBuildsRef.current) {
          hasLoadedRemoteBuildsRef.current = true;
          try {
            remoteBuilds = await fetchBuilds(event);
          } catch (error) {
            console.error("Error fetching builds from backend:", error);
          }
        }
        if (remoteBuilds.length > 0) {
          await buildRepository.addMany(remoteBuilds);
        }
        const localBuilds = (await buildRepository.getAll()).filter(
          (build) => build.event === event && build.outfitId !== "",
        );
        const remoteBuildIds = new Set(remoteBuilds.map((build) => build.id));
        await Promise.all(
          localBuilds
            .filter((build) => !remoteBuildIds.has(build.id))
            .map(async (build) => {
              if (user) {
                try {
                  scheduleBuildSync(build);
                } catch (error) {
                  console.error("Error syncing build to backend:", error);
                }
              }
            }),
        );
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
  }, [selectedEvent, user, isAuthLoading]);

  /*
  async function selectUma(key: UmaKey, selectedUma: UmaEntry | null) {
    if (!selectedEvent) {
      return;
    }
    const event = selectedEvent;

    const buildKey = `${key}Build` as BuildKey;
    const currentBuild = umas[buildKey];
    const currentUma = currentBuild.outfitId === ""
      ? null
      : umaList.find((uma) => String(uma.id) === currentBuild.outfitId) ?? null;
    const previousUniqueSkillId = currentUma?.uniqueSkillId === undefined
      ? undefined
      : skillList.find((skill) => skill.id === String(currentUma.uniqueSkillId))?.id;
    const preservedBuild: UmaBuildData = {
      ...currentBuild,
      outfitId: selectedUma ? String(selectedUma.id) : "",
      skills: currentBuild.skills.filter(
        (skill) =>
          !(skill in currentBuild.forcedSkillPositions) &&
          skill !== previousUniqueSkillId,
      ),
      forcedSkillPositions: Object.fromEntries(
        Object.entries(currentBuild.forcedSkillPositions).filter(
          ([skill]) => skill !== previousUniqueSkillId,
        ),
      ),
    };
    const buildId = selectedUma ? crypto.randomUUID() : null;
    const updatedUmas: PvpTeamState = {
      ...umas,
      event,
      [key]: buildId,
      [buildKey]: preservedBuild,
      [`${buildKey}Name`]: "",
    };

    setUmas(updatedUmas);
    if (selectedUma) {
      setActiveBuild(Number(key.slice(-1)) as UmaSlot);
    }

    try {
      const {
        uma1Build,
        uma2Build,
        uma3Build,
        uma1BuildName,
        uma2BuildName,
        uma3BuildName,
        ...teamRecord
      } = updatedUmas;
      void uma1Build;
      void uma2Build;
      void uma3Build;
      void uma1BuildName;
      void uma2BuildName;
      void uma3BuildName;
      await createTeamRepository().put(teamRecord);
      if (selectedUma && buildId !== null) {
        await createBuildRepository().put({
          ...preservedBuild,
          event,
          id: buildId,
          name: "",
        });
      } else if (buildId === null && umas[key] !== null) {
        await createBuildRepository().deleteByKey([event, umas[key]]);
      }
      await refreshBuilds(event);
    } catch (error) {
      console.error("Error saving team:", error);
    }
  }
  */

  /*
  async function updateBuild(key: BuildKey, build: UmaBuildData) {
    if (!selectedEvent) {
      return;
    }

    const event = selectedEvent;

    const updatedUmas = { ...umas, event, [key]: build };
    setUmas(updatedUmas);

    try {
      const {
        uma1Build,
        uma2Build,
        uma3Build,
        uma1BuildName,
        uma2BuildName,
        uma3BuildName,
        ...teamRecord
      } = updatedUmas;
      void uma1Build;
      void uma2Build;
      void uma3Build;
      void uma1BuildName;
      void uma2BuildName;
      void uma3BuildName;
      await createTeamRepository().put(teamRecord);
      const umaKey = key.replace("Build", "") as UmaKey;
      const buildId = updatedUmas[umaKey];
      if (buildId !== null) {
        await createBuildRepository().put({
          ...build,
          event,
          id: buildId,
          name: updatedUmas[`${key}Name` as keyof PvpTeamState] as string,
        });
      }
      await refreshBuilds(event);
    } catch (error) {
      console.error("Error saving Uma build:", error);
    }
  }
  */

  /*
  async function updateBuildUma(key: BuildKey, selectedUma: UmaEntry | null) {
    if (!selectedEvent) {
      return;
    }
    const event = selectedEvent;
    const umaKey = key.replace("Build", "") as UmaKey;
    const currentBuild = umas[key];
    const currentUma = currentBuild.outfitId === ""
      ? null
      : umaList.find((uma) => String(uma.id) === currentBuild.outfitId) ?? null;
    const previousUniqueSkillId = currentUma?.uniqueSkillId === undefined
      ? undefined
      : skillList.find((skill) => skill.id === String(currentUma.uniqueSkillId))?.id;
    const updatedBuild: UmaBuildData = {
      ...currentBuild,
      outfitId: selectedUma ? String(selectedUma.id) : "",
      skills: currentBuild.skills.filter(
        (skill) =>
          !(skill in currentBuild.forcedSkillPositions) &&
          skill !== previousUniqueSkillId,
      ),
      forcedSkillPositions: Object.fromEntries(
        Object.entries(currentBuild.forcedSkillPositions).filter(
          ([skill]) => skill !== previousUniqueSkillId,
        ),
      ),
    };
    const updatedUmas = {
      ...umas,
      [key]: updatedBuild,
      [`${key}Name`]: selectedUma ? umas[`${key}Name` as keyof PvpTeamState] : "",
    } as PvpTeamState;
    setUmas(updatedUmas);

    const buildId = umas[umaKey];
    if (buildId === null) {
      return;
    }
    try {
      await createBuildRepository().put({
        ...updatedBuild,
        event,
        id: buildId,
        name: updatedUmas[`${key}Name` as keyof PvpTeamState] as string,
      });
      await refreshBuilds(event);
    } catch (error) {
      console.error("Error saving Uma selection in build:", error);
    }
  }
  */

  /*
  async function addNewBuild(key: BuildKey) {
    if (!selectedEvent) {
      return;
    }

    const event = selectedEvent;
    const buildId = crypto.randomUUID();
    const umaKey = key.replace("Build", "") as UmaKey;
    const currentBuild = umas[key];
    if (umas[umaKey] === null || currentBuild.outfitId === "") {
      return;
    }
    const build = {
      ...createDefaultBuild(currentBuild.outfitId),
    };
    const buildNameKey = `${key}Name` as keyof PvpTeamState;
    const updatedUmas: PvpTeamState = {
      ...umas,
      event,
      [key]: build,
      [umaKey]: buildId,
      [buildNameKey]: "",
    };
    setUmas(updatedUmas);
    try {
      const buildRepository = createBuildRepository();
      const currentBuildId = umas[umaKey];
      const currentBuildName = umas[`${key}Name`];
      if (
        currentBuildId !== null &&
        currentBuildName.trim() === ""
      ) {
        await buildRepository.deleteByKey([event, currentBuildId]);
      }
      await buildRepository.put({
        ...build,
        event,
        id: buildId,
        name: "",
      });
      const {
        uma1Build,
        uma2Build,
        uma3Build,
        uma1BuildName,
        uma2BuildName,
        uma3BuildName,
        ...teamRecord
      } = updatedUmas;
      void uma1Build;
      void uma2Build;
      void uma3Build;
      void uma1BuildName;
      void uma2BuildName;
      void uma3BuildName;
      await createTeamRepository().put(teamRecord);
      await refreshBuilds(event);
    } catch (error) {
      console.error("Error creating Uma build:", error);
    }
  }
  */

  /*
  async function addNewSavedBuild(outfitId: string) {
    if (!selectedEvent || outfitId === "") {
      return null;
    }

    const build: StoredUmaBuild = {
      ...createDefaultBuild(outfitId),
      event: selectedEvent,
      id: crypto.randomUUID(),
      name: "",
    };
    try {
      await createBuildRepository().put(build);
      await refreshBuilds(selectedEvent);
      return build;
    } catch (error) {
      console.error("Error creating saved Uma build:", error);
      return null;
    }
  }
  */

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

  /*
  async function selectSavedBuild(key: BuildKey, buildId: string) {
    if (!selectedEvent || !savedBuilds.some((build) => build.id === buildId)) {
      return;
    }
    const event = selectedEvent;
    const build = savedBuilds.find((entry) => entry.id === buildId);
    if (!build) {
      return;
    }
    const umaKey = key.replace("Build", "") as UmaKey;
    const updatedUmas: PvpTeamState = {
      ...umas,
      event,
      [key]: build,
      [umaKey]: build.id,
      [`${key}Name`]: build.name,
    };
    setUmas(updatedUmas);
    try {
      const {
        uma1Build,
        uma2Build,
        uma3Build,
        uma1BuildName,
        uma2BuildName,
        uma3BuildName,
        ...teamRecord
      } = updatedUmas;
      void uma1Build;
      void uma2Build;
      void uma3Build;
      void uma1BuildName;
      void uma2BuildName;
      void uma3BuildName;
      await createTeamRepository().put(teamRecord);
      await refreshSavedBuilds(event, updatedUmas);
    } catch (error) {
      console.error("Error selecting saved Uma build:", error);
    }
  }
  */

  return {
    umas,
    allBuilds,
    saveBuild,
  };
}
