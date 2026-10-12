import { useCallback, useEffect, useRef, useState } from "react";
import type { StoredUmaBuild } from "../../types/UmaBuild";
import { useAuth } from "../../contexts/AuthContext";
import {
  createTeamRepository,
  normalizeStoredTeam,
} from "../planner/plannerRepository";
import { createEmptyTeam } from "../planner/plannerTypes";
import { fetchTeams } from "../planner/teamApi";
import {
  createEmptyEventResults,
  type EventResults,
  type InitialTeamBuildIds,
} from "./resultsTypes";
import {
  createResultsRepository,
  normalizeStoredResults,
} from "./resultsRepository";
import { getLegacyEventResults } from "./resultsNormalization";
import {
  fetchAllResults,
  fetchCurrentEventResults,
  postResults,
} from "./resultsApi";
import { createResultActions } from "./resultActions";

const SYNC_DEBOUNCE_MS = 2_000;

export function useResults(
  selectedEvent: string | null,
  allBuilds: StoredUmaBuild[],
) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const userRef = useRef(user);
  const resultsRef = useRef<EventResults | null>(null);
  const resultsSyncTimerRef = useRef<number | undefined>(undefined);
  const pendingResultsRef = useRef(new Map<string, EventResults>());
  const [eventResults, setEventResults] = useState<EventResults>(() =>
    createEmptyEventResults()
  );

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const scheduleResultsSync = useCallback((results: EventResults) => {
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
          return undefined;
        }).catch((error) => {
          console.error("Error syncing results to backend:", error);
        });
      }
    }, SYNC_DEBOUNCE_MS);
  }, []);

  const saveEventResults = useCallback((nextResults: EventResults) => {
    if (!selectedEvent || nextResults.event !== selectedEvent) return;

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
  }, [scheduleResultsSync, selectedEvent]);

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
  }, [scheduleResultsSync]);

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
    if (localResultToSync) scheduleResultsSync(localResultToSync);
  }, [scheduleResultsSync]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!selectedEvent) {
      resultsRef.current = createEmptyEventResults();
      setEventResults(createEmptyEventResults());
      return;
    }

    const event = selectedEvent;
    const initialResults = createEmptyEventResults(event);
    resultsRef.current = initialResults;
    setEventResults(initialResults);
    let cancelled = false;

    async function loadResults() {
      try {
        const repository = createResultsRepository();
        const storedResults = await repository.getByKey(event);
        const storedTeam = await createTeamRepository().getByKey(event);
        const remoteTeam = user ? (await fetchTeams(event))[0] : undefined;
        const migratedResults = storedResults
          ? normalizeStoredResults(storedResults, event)
          : [storedTeam, remoteTeam?.legacyResults]
            .map((source) => getLegacyEventResults(source, event))
            .filter((result): result is EventResults => result !== null)
            .sort((left, right) => right.lastUpdate - left.lastUpdate)[0] ?? null;

        if (cancelled) return;
        let loadedResults = migratedResults ?? createEmptyEventResults(event);
        if (!storedResults && migratedResults) {
          await repository.put(migratedResults);
          scheduleResultsSync(migratedResults);
        }

        const team = normalizeStoredTeam(
          storedTeam ?? remoteTeam?.team ?? createEmptyTeam(event),
          event,
        );
        const teamBuildIds: InitialTeamBuildIds = [
          team.uma1,
          team.uma2,
          team.uma3,
        ];
        if (
          loadedResults.initialBuildIds.every((buildId) => buildId === null) &&
          teamBuildIds.some((buildId) => buildId !== null)
        ) {
          loadedResults = { ...loadedResults, initialBuildIds: teamBuildIds };
          await repository.put(loadedResults);
          scheduleResultsSync(loadedResults);
        }

        if (cancelled) return;
        resultsRef.current = loadedResults;
        setEventResults(loadedResults);
        if (user) {
          await syncAllRemoteResults();
        }
      } catch (error) {
        console.error("Error loading results:", error);
      }
    }

    void loadResults();
    return () => {
      cancelled = true;
    };
  }, [
    isAuthLoading,
    scheduleResultsSync,
    selectedEvent,
    syncAllRemoteResults,
    user,
  ]);

  useEffect(() => {
    if (isAuthLoading || !user || !selectedEvent) return;
    const event = selectedEvent;
    const interval = window.setInterval(() => {
      void syncRemoteSelectedResult(event).catch((error) => {
        console.error("Error fetching results from backend:", error);
      });
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [
    isAuthLoading,
    selectedEvent,
    syncRemoteSelectedResult,
    user,
  ]);

  useEffect(() => () => {
    if (resultsSyncTimerRef.current !== undefined) {
      window.clearTimeout(resultsSyncTimerRef.current);
    }
    resultsSyncTimerRef.current = undefined;
    pendingResultsRef.current.clear();
  }, []);

  const resultActions = createResultActions({
    selectedEvent,
    allBuilds,
    getCurrentResults: () => resultsRef.current,
    saveEventResults,
  });

  return { eventResults, ...resultActions };
}
