import type { StoredUmaBuild } from "../../../types/UmaBuild";
import type { UmaEntry } from "../../../types/UmaEntry";
import type { TeamUmaPlacement } from "../domain/resultsTypes";
import { formatUmaPlacement, umaPlacements } from "../domain/utils";
import BuildSelector from "../ResultsBuildSelector";

interface Props {
  slot: 1 | 2 | 3;
  buildId: string;
  choices: StoredUmaBuild[];
  availableBuilds: StoredUmaBuild[];
  umaList: UmaEntry[];
  placement: TeamUmaPlacement | null;
  onBuildChange: (buildId: string) => void;
  onPlacementChange: (placement: TeamUmaPlacement | null) => void;
  onClear: () => void;
}

export default function FinalsBuildRow({
  slot,
  buildId,
  choices,
  availableBuilds,
  umaList,
  placement,
  onBuildChange,
  onPlacementChange,
  onClear,
}: Props) {
  return (
    <div className="uma-build-results__ticket-editor-build uma-build-results__finals-editor-build">
      <BuildSelector
        slot={slot}
        buildId={buildId}
        choices={choices}
        availableBuilds={availableBuilds}
        umaList={umaList}
        ariaLabel={`Choose build for Uma ${slot}`}
        onChange={onBuildChange}
      />
      <label className="uma-build-results__finals-placement-select">
        Uma placement
        <select
          aria-label={`Placement for Uma ${slot}`}
          value={placement ?? ""}
          disabled={!buildId}
          onChange={(event) => {
            const value = event.target.value;
            onPlacementChange(
              umaPlacements.find((entry) => String(entry) === value) ?? null,
            );
          }}
        >
          <option value="">Not recorded</option>
          {umaPlacements.map((entry) => (
            <option key={entry} value={entry}>
              {formatUmaPlacement(entry)}
            </option>
          ))}
        </select>
      </label>
      <button
        className="uma-build-results__remove-build"
        type="button"
        aria-label={`Clear selected build for Uma ${slot}`}
        disabled={!buildId}
        onClick={onClear}
      >
        Clear selected build
      </button>
    </div>
  );
}
