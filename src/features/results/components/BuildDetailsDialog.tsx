import { useEffect, useRef } from "react";
import type { UmaSlot } from "../domain/resultsTypes";
import type { StoredUmaBuild } from "../../../types/UmaBuild";
import type { UmaEntry } from "../../../types/UmaEntry";
import type { SkillEntry } from "../../../types/SkillEntry";
import Team from "../../planner/components/Team";
import { CloseIcon } from "../../../components/UiIcons";

interface Props {
  details: {
    build: StoredUmaBuild;
    slot: UmaSlot;
    title: string;
  } | null;
  umaList: UmaEntry[];
  skillList: SkillEntry[];
  showSupportCards: boolean;
  onClose: () => void;
}

export default function BuildDetailsDialog({
  details,
  umaList,
  skillList,
  showSupportCards,
  onClose,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !details) return;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close?.();
    };
  }, [details]);

  if (!details) return null;

  return (
    <dialog
      ref={dialogRef}
      className="build-card__details-dialog"
      aria-labelledby="uma-build-results-summary-details-heading"
      onCancel={onClose}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button
        className="build-card__details-close"
        type="button"
        aria-label="Close build details"
        onClick={onClose}
      >
        <CloseIcon />
      </button>
      <h2
        className="uma-build-results__summary-details-heading"
        id="uma-build-results-summary-details-heading"
      >
        {details.title}
      </h2>
      <Team
        teamNumber={details.slot}
        build={details.build}
        availableBuilds={[]}
        umaList={umaList}
        skillList={skillList}
        showSupportCards={showSupportCards}
        onSelectBuild={() => undefined}
      />
    </dialog>
  );
}
