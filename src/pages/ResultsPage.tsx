import { useEffect, useState } from "react";
import { useEvent } from "../contexts/EventContext";
import { useTeam } from "../features/planner/useTeam";
import { usePlannerData } from "../features/planner/usePlannerData";

import UmaBuildResults from "../features/results/Results";
import {
  getNextResultOpeningAt,
  getResultAvailability,
  getResultOpeningDates,
} from "../features/results/resultSchedule";


export default function ResultsPage() {
  const { selectedEvent } = useEvent();
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const showSupportCards = true;
  const { raceEntry, umaList, skillList } = usePlannerData(selectedEvent);
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
