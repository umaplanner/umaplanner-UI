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
  onCopySavedBuild?: (buildId: string) => void | Promise<void>;
  isBuildCopied: boolean;
  isBuildLoaded: boolean;
  draftBuildName: string;
  setDraftBuildName: (name: string) => void;
  isSavedBuild: boolean;
  willOverrideBuild: boolean;
  hasDuplicateName: boolean;
  saveMenuRef: React.RefObject<HTMLSpanElement | null>;
  isSaveMenuOpen: boolean;
  setIsSaveMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  copyBuildJson: () => Promise<void>;
  loadBuildJson: () => Promise<void>;
}

export default function UmaBuildToolbar({
  teamNumber, value, onTogglePlan, savedBuilds, umaList, onNewBuild, onSaveBuild, onSelectSavedBuild, onCopySavedBuild,
  isBuildCopied, isBuildLoaded, draftBuildName, setDraftBuildName,
  isSavedBuild, willOverrideBuild, hasDuplicateName, saveMenuRef, isSaveMenuOpen, setIsSaveMenuOpen,
  copyBuildJson, loadBuildJson,
}: Props) {
  const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState(false);
  const [savedBuildDialogMode, setSavedBuildDialogMode] = useState<"load" | "copy" | null>(null);
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
          <input
            aria-label="Build name"
            placeholder={umaList.find((uma) => String(uma.id) === value.outfitId)?.baseCharacterName ?? "Build name"}
            value={draftBuildName}
            disabled={isSavedBuild}
            onChange={(event) => setDraftBuildName(event.target.value)}
          />
          {hasDuplicateName ? <small className="uma-build__duplicate-name-error" role="alert">already exists</small> : null}
          <button type="button" disabled={value.outfitId === "" || hasDuplicateName} onClick={() => {
            void onSaveBuild(value, draftBuildName.trim());
            setIsSaveMenuOpen(false);
          }}>{willOverrideBuild ? "Override" : "Submit"}</button>
        </span> : null}
      </span> : null}
      {onSelectSavedBuild && savedBuilds.length > 0 ? <>
        <button
          className="uma-build__swap-button uma-build__saved-build-button"
          type="button"
          aria-haspopup="dialog"
          aria-expanded={savedBuildDialogMode === "load"}
          onClick={() => setSavedBuildDialogMode("load")}
        >
          Load
        </button>
        {onCopySavedBuild ? <button
          className="uma-build__swap-button uma-build__saved-build-button"
          type="button"
          aria-haspopup="dialog"
          aria-expanded={savedBuildDialogMode === "copy"}
          onClick={() => setSavedBuildDialogMode("copy")}
        >
          Copy
        </button> : null}
      </> : null}
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
    {savedBuildDialogMode !== null && onSelectSavedBuild ? (
      <UmaBuildSavedBuildDialog
        teamNumber={teamNumber}
        builds={savedBuilds}
        umaList={umaList}
        canClear={false}
        title={savedBuildDialogMode === "copy" ? "Copy a saved build" : "Load a saved build"}
        onSelect={(buildId) => {
          if (!buildId) return;
          if (savedBuildDialogMode === "copy") {
            void onCopySavedBuild?.(buildId);
          } else {
            void onSelectSavedBuild(buildId);
          }
        }}
        onClose={() => setSavedBuildDialogMode(null)}
      />
    ) : null}
  </>;
}
