
import { useEffect, useRef, useState } from "react";
import { useEvent } from "../contexts/EventContext";
import { useAuth } from "../contexts/AuthContext";
import { useTeam } from "../features/planner/useTeam";
import { usePlannerData } from "../features/planner/usePlannerData";

import UmaBuildResults from "../components/UmaBuild/results/Results";
import {
  getNextResultOpeningAt,
  getResultAvailability,
  getResultOpeningDates,
} from "../features/planner/resultSchedule";


export default function ResultsPage() {
  const { selectedEvent } = useEvent();
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [showSupportCards, setShowSupportCards] = useState(true);
  const initialEvent = useRef(selectedEvent);
  const hasInitializedBuildMode = useRef(false);
  const { raceEntry, umaList, skillList, supportCardList } = usePlannerData(selectedEvent);
  const {
    allBuilds,
    eventResults,
    saveTicketResult,
    removeTicketResult,
    saveFinalsResult,
  } = useTeam(selectedEvent);
  const activeRaceEntry = raceEntry?.eventTitle === selectedEvent
    ? raceEntry
    : undefined;
  const resultAvailability = getResultAvailability(activeRaceEntry, currentTime);
  const resultOpeningDates = getResultOpeningDates(activeRaceEntry);

  useEffect(() => {
    const nextOpening = getNextResultOpeningAt(activeRaceEntry);
    if (!nextOpening) return;

    const timeout = window.setTimeout(
      () => setCurrentTime(new Date()),
      Math.max(0, nextOpening.getTime() - Date.now()),
    );
    return () => window.clearTimeout(timeout);
  }, [activeRaceEntry, currentTime]);

  useEffect(() => {
    if (hasInitializedBuildMode.current) {
      return;
    }
    if (selectedEvent !== initialEvent.current) {
      hasInitializedBuildMode.current = true;
      return;
    }
    if (!initialEvent.current || activeRaceEntry?.eventTitle !== initialEvent.current) {
      return;
    }

    hasInitializedBuildMode.current = true;
  }, [activeRaceEntry, resultAvailability.round1Day1, selectedEvent]);

  return (
    <main className="results-page">
      <UmaBuildResults
        key={selectedEvent}
        event={selectedEvent}
        results={eventResults.results}
        resultAvailability={resultAvailability}
        resultOpeningDates={resultOpeningDates}
        buildAssignments={eventResults.buildAssignments}
        ticketBuildResults={eventResults.ticketBuildResults}
        ticketCounts={eventResults.ticketCounts}
        initialBuildIds={eventResults.initialBuildIds}
        finalPlacement={eventResults.finalPlacement}
        finalBuildPlacements={eventResults.finalBuildPlacements}
        availableBuilds={allBuilds}
        umaList={umaList}
        skillList={skillList}
        showSupportCards={showSupportCards}
        onSaveTicket={saveTicketResult}
        onRemoveTicket={removeTicketResult}
        onSaveFinals={saveFinalsResult}
      />
    </main>
  );
}

