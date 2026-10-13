import type { MutableRefObject } from "react";
import type {
  ResultImageDay,
  ResultImageSummary,
} from "../ResultsImage";
import ResultImage from "../ResultsImage";
import type { TeamRaceResultRow } from "../domain/resultsTypes";

interface Props {
  event: string;
  days: ResultImageDay[];
  summary: ResultImageSummary | undefined;
  fullImageRef: MutableRefObject<HTMLElement | null>;
  roundsImageRef: MutableRefObject<HTMLElement | null>;
  dayImageRefs: MutableRefObject<Map<TeamRaceResultRow, HTMLElement>>;
}

export default function ResultsImageStage({
  event,
  days,
  summary,
  fullImageRef,
  roundsImageRef,
  dayImageRefs,
}: Props) {
  return (
    <div className="result-image-stage" aria-hidden="true">
      <ResultImage ref={fullImageRef} event={event} days={[]} summary={summary} />
      <ResultImage ref={roundsImageRef} event={event} days={days} />
      {days.map((day) => (
        <ResultImage
          key={day.row}
          ref={(node) => {
            if (node) dayImageRefs.current.set(day.row, node);
            else dayImageRefs.current.delete(day.row);
          }}
          event={event}
          days={[day]}
        />
      ))}
    </div>
  );
}
