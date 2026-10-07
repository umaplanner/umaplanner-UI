import { useState } from "react";
import type { StoredUmaBuild } from "../../../types/UmaBuild";
import type { UmaEntry } from "../../../types/UmaEntry";
import type { UmaSlot } from "../../../features/planner/plannerTypes";
import UmaImage from "../../UmaImage";
import UmaBuildSavedBuildDialog from "../display/SavedBuildDialog";

interface Props {
  slot: UmaSlot;
  buildId: string;
  choices: StoredUmaBuild[];
  availableBuilds: StoredUmaBuild[];
  umaList: UmaEntry[];
  ariaLabel: string;
  onChange: (buildId: string) => void;
}

export default function BuildSelector({
  slot,
  buildId,
  choices,
  availableBuilds,
  umaList,
  ariaLabel,
  onChange,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const build = availableBuilds.find((entry) => entry.id === buildId);
  const uma = build
    ? umaList.find((entry) => String(entry.id) === build.outfitId)
    : undefined;

  return (
    <>
      <div className="uma-build-results__build-selector-field">
        <span>Build for Uma {slot}</span>
        <button
          className="uma-build-results__build-picker"
          type="button"
          aria-label={ariaLabel}
          onClick={() => setIsOpen(true)}
        >
          {uma ? (
            <UmaImage
              className="uma-build-results__ticket-build-icon"
              uma={uma}
              alt=""
            />
          ) : (
            <span
              className="uma-build-results__ticket-build-icon-placeholder"
              aria-hidden="true"
            />
          )}
          <span className="uma-build-results__build-picker-info">
            <strong>{build?.name || "Select a build"}</strong>
            {uma ? (
              <small>{uma.outfitTitle} · {uma.baseCharacterName}</small>
            ) : (
              <small>Browse saved builds</small>
            )}
          </span>
          <span className="uma-build-results__build-picker-action">Choose</span>
        </button>
      </div>
      {isOpen ? (
        <UmaBuildSavedBuildDialog
          teamNumber={slot}
          builds={choices}
          umaList={umaList}
          canClear={false}
          title="Choose a saved build"
          nativeModal
          onSelect={(selectedBuildId) => {
            if (selectedBuildId !== null) onChange(selectedBuildId);
            setIsOpen(false);
          }}
          onClose={() => setIsOpen(false)}
        />
      ) : null}
    </>
  );
}
