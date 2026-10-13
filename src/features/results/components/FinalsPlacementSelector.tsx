import { formatUmaPlacement } from "../domain/utils";
import type { TeamFinalPlacement } from "../domain/resultsTypes";

interface Props {
  placement: TeamFinalPlacement | null;
  hasFirstPlace: boolean;
  onChange: (placement: TeamFinalPlacement | null) => void;
}

export default function FinalsPlacementSelector({
  placement,
  hasFirstPlace,
  onChange,
}: Props) {
  return (
    <div className="uma-build-results__placement" role="group" aria-label="Finals placement">
      {([1, 2, 3] as const).map((entry) => (
        <button
          key={entry}
          type="button"
          aria-pressed={placement === entry}
          disabled={entry === 1 || hasFirstPlace}
          title={entry === 1
            ? "Finals placement is automatically 1st when any selected Uma places 1st"
            : undefined}
          onClick={() => {
            if (entry !== 1) onChange(placement === entry ? null : entry);
          }}
        >
          {formatUmaPlacement(entry)}
        </button>
      ))}
    </div>
  );
}
