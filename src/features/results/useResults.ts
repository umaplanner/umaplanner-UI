import { useCallback, useEffect, useRef, useState } from "react";
import type { StoredUmaBuild } from "../../types/UmaBuild";
import { useAuth } from "../../contexts/AuthContext";
import { createTeamRepository, normalizeStoredTeam } from "../planner/plannerRepository";
import { createEmptyTeam } from "../planner/plannerTypes";
import { fetchTeams } from "../planner/teamApi";
import {
  createEmptyEventResults,
  type EventResults,
  type InitialTeamBuildIds,
} from "./domain/resultsTypes";
import { createResultsRepository, normalizeStoredResults } from "./data/resultsRepository";
import { getLegacyEventResults } from "./data/resultsMigration";
import { createResultActions } from "./domain/resultActions";
import { createResultsSync } from "./sync/resultsSync";

export function useResults(selectedEvent: string | null, allBuilds: StoredUmaBuild[]) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const userRef = useRef(user);
  const resultsRef = useRef<EventResults | null>(null);
  const [eventResults, setEventResults] = useState<EventResults>(() => createEmptyEventResults());
  const syncRef = useRef<ReturnType<typeof createResultsSync> | null>(null);

  useEffect(() => { userRef.current = user; }, [user]);
  if (!syncRef.current) {
    syncRef.current = createResultsSync({ userRef, resultsRef, setEventResults });
  }
  const resultsSync = syncRef.current;

  const saveEventResults = useCallback((nextResults: EventResults) => {
    if (!selectedEvent || nextResults.event !== selectedEvent) return;
    const updatedResults = { ...nextResults, lastUpdate: Date.now() };
    resultsRef.current = updatedResults;
    setEventResults(updatedResults);
    void createResultsRepository().put(updatedResults).then(() => {
      if (userRef.current) resultsSync.schedule(updatedResults);
    }).catch((error) => console.error("Error saving event results:", error));
  }, [resultsSync, selectedEvent]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!selectedEvent) {
      const empty = createEmptyEventResults();
      resultsRef.current = empty;
      setEventResults(empty);
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
          resultsSync.schedule(migratedResults);
        }
        const team = normalizeStoredTeam(
          storedTeam ?? remoteTeam?.team ?? createEmptyTeam(event), event,
        );
        const teamBuildIds: InitialTeamBuildIds = [team.uma1, team.uma2, team.uma3];
        if (loadedResults.initialBuildIds.every((buildId) => buildId === null) &&
            teamBuildIds.some((buildId) => buildId !== null)) {
          loadedResults = { ...loadedResults, initialBuildIds: teamBuildIds };
          await repository.put(loadedResults);
          resultsSync.schedule(loadedResults);
        }
        if (cancelled) return;
        resultsRef.current = loadedResults;
        setEventResults(loadedResults);
        if (user) await resultsSync.syncAll();
      } catch (error) { console.error("Error loading results:", error); }
    }
    void loadResults();
    return () => { cancelled = true; };
  }, [isAuthLoading, resultsSync, selectedEvent, user]);

  useEffect(() => {
    if (isAuthLoading || !user || !selectedEvent) return;
    const event = selectedEvent;
    const interval = window.setInterval(() => {
      void resultsSync.syncSelected(event).catch((error) =>
        console.error("Error fetching results from backend:", error));
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [isAuthLoading, resultsSync, selectedEvent, user]);

  useEffect(() => () => resultsSync.dispose(), [resultsSync]);

  const resultActions = createResultActions({
    selectedEvent,
    allBuilds,
    getCurrentResults: () => resultsRef.current,
    saveEventResults,
  });
  return { eventResults, ...resultActions };
}
