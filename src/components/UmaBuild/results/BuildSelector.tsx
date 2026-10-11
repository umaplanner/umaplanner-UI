import { useEffect, useState } from "react";
import type { StoredUmaBuild } from "../../../types/UmaBuild";
import type { UmaEntry } from "../../../types/UmaEntry";
import type { UmaSlot } from "../../../features/planner/plannerTypes";
import UmaImage from "../../UmaImage";
import UmaBuildSavedBuildDialog from "../team/SavedBuildDialog";

interface Props {
  slot: UmaSlot;
  buildId: string;
  choices: StoredUmaBuild[];
  availableBuilds: StoredUmaBuild[];
  umaList: UmaEntry[];
  ariaLabel: string;
  compact?: boolean;
  disabled?: boolean;
  title?: string;
  nativeModal?: boolean;
  onChange: (buildId: string) => void;
}

export default function BuildSelector({
  slot,
  buildId,
  choices,
  availableBuilds,
  umaList,
  ariaLabel,
  compact = false,
  disabled = false,
  title = "Choose a saved build",
  nativeModal = true,
  onChange,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    if (disabled) setIsOpen(false);
  }, [disabled]);

  const build = availableBuilds.find((entry) => entry.id === buildId);
  const uma = build
    ? umaList.find((entry) => String(entry.id) === build.outfitId)
    : undefined;

  return (
    <>
      <div className={`uma-build-results__build-selector-field${compact ? " uma-build-results__build-selector-field--compact" : ""}`}>
        {!compact ? <span>Build for Uma {slot}</span> : null}
        {compact && build ? (
          <>
            <button
              className="uma-build-results__ticket-build-part"
              type="button"
              aria-label={`Choose build by image for Uma ${slot}`}
              disabled={disabled}
              onClick={() => setIsOpen(true)}
            >
              {uma ? (
                <UmaImage
                  className="uma-build-results__ticket-build-icon"
                  uma={uma}
                  alt=""
                />
              ) : <span className="uma-build-results__ticket-build-icon-placeholder" />}
            </button>
            <button
              className="uma-build-results__ticket-build-part uma-build-results__ticket-build-name"
              type="button"
              aria-label={`Choose build by name for Uma ${slot}`}
              disabled={disabled}
              onClick={() => setIsOpen(true)}
            >
              {build.name || "Unnamed build"}
            </button>
          </>
        ) : (
          <button
            className={`uma-build-results__build-picker${build ? "" : " uma-build-results__build-picker--empty"}`}
            type="button"
            aria-label={ariaLabel}
            disabled={disabled}
            onClick={() => setIsOpen(true)}
          >
            {build ? (
              <>
                {uma ? (
                  <UmaImage
                    className="uma-build-results__ticket-build-icon"
                    uma={uma}
                    alt=""
                  />
                ) : null}
                <span className="uma-build-results__build-picker-info">
                  <strong>{build.name || "Unnamed build"}</strong>
                  {uma ? (
                    <small>{uma.outfitTitle} · {uma.baseCharacterName}</small>
                  ) : null}
                </span>
                <span className="uma-build-results__build-picker-action">Choose</span>
              </>
            ) : (
              <span className="uma-build-results__build-picker-empty-label">
                {compact ? "Select build" : "Add build"}
              </span>
            )}
          </button>
        )}
      </div>
      {isOpen && !disabled ? (
        <UmaBuildSavedBuildDialog
          teamNumber={slot}
          builds={choices}
          umaList={umaList}
          canClear={false}
          title={title}
          nativeModal={nativeModal}
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
