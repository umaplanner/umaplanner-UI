import type { EventResults } from "../domain/resultsTypes";
import { normalizeStoredResults, createResultsRepository } from "../data/resultsRepository";
import { fetchAllResults, fetchCurrentEventResults, postResults } from "../data/resultsApi";

type Ref<T> = { current: T };

interface Dependencies {
  userRef: Ref<unknown>;
  resultsRef: Ref<EventResults | null>;
  setEventResults: (results: EventResults) => void;
}

const SYNC_DEBOUNCE_MS = 2_000;

export function createResultsSync({ userRef, resultsRef, setEventResults }: Dependencies) {
  let timer: number | undefined;
  const pendingResults = new Map<string, EventResults>();

  const schedule = (results: EventResults) => {
    if (!userRef.current) return;

    pendingResults.set(results.event, results);
    if (timer !== undefined) window.clearTimeout(timer);

    timer = window.setTimeout(() => {
      timer = undefined;
      pendingResults.clear();
      if (!userRef.current) return;
      void createResultsRepository().getAll().then((storedResults) => {
        if (userRef.current && storedResults.length > 0) return postResults(storedResults);
        return undefined;
      }).catch((error) => console.error("Error syncing results to backend:", error));
    }, SYNC_DEBOUNCE_MS);
  };

  const syncSelected = async (event: string): Promise<void> => {
    if (!userRef.current) return;

    const repository = createResultsRepository();
    const [storedResults, remoteResults] = await Promise.all([
      repository.getByKey(event),
      fetchCurrentEventResults(event),
    ]);

    const localResults = storedResults ? normalizeStoredResults(storedResults, event) : null;
    if (remoteResults && (!localResults || remoteResults.lastUpdate > localResults.lastUpdate)) {
      await repository.put(remoteResults);

      if (resultsRef.current?.event === event) {
        resultsRef.current = remoteResults;
        setEventResults(remoteResults);
      }
      return;
    }

    if (localResults) {
      if (!remoteResults || localResults.lastUpdate > remoteResults.lastUpdate) schedule(localResults);
      if (resultsRef.current?.event === event) {
        resultsRef.current = localResults;
        setEventResults(localResults);
      }
    }
  };

  const syncAll = async (): Promise<void> => {
    if (!userRef.current) return;

    const repository = createResultsRepository();
    const [storedRecords, remoteResults] = await Promise.all([
      repository.getAll(),
      fetchAllResults(),
    ]);

    const localResults = storedRecords.map((result) => normalizeStoredResults(result, result.event));
    const localByEvent = new Map(localResults.map((result) => [result.event, result]));
    const remoteByEvent = new Map(remoteResults.map((result) => [result.event, result]));
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

    if (localResultToSync) schedule(localResultToSync);
  };

  const dispose = () => {
    if (timer !== undefined) window.clearTimeout(timer);
    timer = undefined;
    pendingResults.clear();
  };

  return { schedule, syncSelected, syncAll, dispose };
}
