import { useId, useState } from "react";
import type { UmaBuild as UmaBuildData, StoredUmaBuild } from "../../../types/UmaBuild";
import type { UmaEntry } from "../../../types/UmaEntry";
import UmaBuildSavedBuildDialog from "../display/SavedBuildDialog";

interface Props {
  teamNumber: number;
  value: UmaBuildData;
  onTogglePlan: (isPlan: boolean) => void;
  savedBuilds: StoredUmaBuild[];
  umaList: UmaEntry[];
  onNewBuild: () => void;
  onSaveBuild?: (build: UmaBuildData, name: string) => void | Promise<void>;
  onSelectSavedBuild?: (buildId: string) => void | Promise<void>;
  isBuildCopied: boolean;
  isBuildLoaded: boolean;
  draftBuildName: string;
  setDraftBuildName: (name: string) => void;
  hasDuplicateName: boolean;
  saveMenuRef: React.RefObject<HTMLSpanElement | null>;
  isSaveMenuOpen: boolean;
  setIsSaveMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  copyBuildJson: () => Promise<void>;
  loadBuildJson: () => Promise<void>;
}

export default function UmaBuildToolbar({
  teamNumber, value, onTogglePlan, savedBuilds, umaList, onNewBuild, onSaveBuild, onSelectSavedBuild,
  isBuildCopied, isBuildLoaded, draftBuildName, setDraftBuildName,
  hasDuplicateName, saveMenuRef, isSaveMenuOpen, setIsSaveMenuOpen,
  copyBuildJson, loadBuildJson,
}: Props) {
  const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState(false);
  const [isLoadBuildDialogOpen, setIsLoadBuildDialogOpen] = useState(false);
  const moreOptionsId = useId();

  return <>
    <section className="uma-build__toolbar">
    <div className="uma-build__toolbar-main">
      <label className="uma-build__plan-toggle" aria-label="Plan build">
        <input
          type="checkbox"
          checked={value["build-type"] === "plan"}
          onChange={(event) => onTogglePlan(event.target.checked)}
        />
        Plan
      </label>
      <button type="button" onClick={onNewBuild}>New</button>
      {onSaveBuild ? <span className="uma-build__save-control" ref={saveMenuRef}>
        <button type="button" onClick={() => setIsSaveMenuOpen((open) => !open)} disabled={value.outfitId === ""}>Save</button>
        {isSaveMenuOpen ? <span className="uma-build__save-menu">
          <input aria-label="Build name" placeholder="Build name" value={draftBuildName} onChange={(event) => setDraftBuildName(event.target.value)} />
          <button type="button" disabled={value.outfitId === "" || draftBuildName.trim() === ""} onClick={() => {
            void onSaveBuild(value, draftBuildName.trim());
            setIsSaveMenuOpen(false);
          }}>{hasDuplicateName ? "Override" : "Submit"}</button>
        </span> : null}
      </span> : null}
      {onSelectSavedBuild && savedBuilds.length > 0 ? <button
        className="uma-build__swap-button uma-build__saved-build-button"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isLoadBuildDialogOpen}
        onClick={() => setIsLoadBuildDialogOpen(true)}
      >
        Load
      </button> : null}
    </div>
    <button
      className="uma-build__toolbar-options-toggle"
      type="button"
      aria-expanded={isMoreOptionsOpen}
      aria-controls={moreOptionsId}
      onClick={() => setIsMoreOptionsOpen((open) => !open)}
    >
      <span>More options</span>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={isMoreOptionsOpen ? "m6 10 6 6 6-6" : "m6 14 6-6 6 6"} />
      </svg>
    </button>
    <div
      className="uma-build__toolbar-tools"
      id={moreOptionsId}
      data-open={isMoreOptionsOpen}
    >
      <button type="button" onClick={() => void copyBuildJson()}>{isBuildCopied ? "Copied" : "Copy JSON"}</button>
      <button type="button" onClick={() => void loadBuildJson()}>{isBuildLoaded ? "Loaded" : "Load JSON"}</button>
    </div>
    </section>
    {isLoadBuildDialogOpen && onSelectSavedBuild ? (
      <UmaBuildSavedBuildDialog
        teamNumber={teamNumber}
        builds={savedBuilds}
        umaList={umaList}
        canClear={false}
        title="Load a saved build"
        onSelect={(buildId) => {
          if (buildId) void onSelectSavedBuild(buildId);
        }}
        onClose={() => setIsLoadBuildDialogOpen(false)}
      />
    ) : null}
  </>;
}
