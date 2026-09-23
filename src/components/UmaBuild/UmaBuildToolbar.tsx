import type { UmaBuild as UmaBuildData, StoredUmaBuild } from "../../types/UmaBuild";

interface Props {
  value: UmaBuildData;
  savedBuilds: StoredUmaBuild[];
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
  value, savedBuilds, onNewBuild, onSaveBuild, onSelectSavedBuild,
  isBuildCopied, isBuildLoaded, draftBuildName, setDraftBuildName,
  hasDuplicateName, saveMenuRef, isSaveMenuOpen, setIsSaveMenuOpen,
  copyBuildJson, loadBuildJson,
}: Props) {
  return <section className="uma-build__toolbar">
    <button type="button" onClick={onNewBuild}>New build</button>
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
    {onSelectSavedBuild ? <select aria-label="Load unused build" defaultValue="" onChange={(event) => {
      if (event.target.value) {
        void onSelectSavedBuild(event.target.value);
        event.target.value = "";
      }
    }}>
      <option value="">Load unused build</option>
      {savedBuilds.map((build) => <option key={build.id} value={build.id}>{build.name || `Uma ${build.outfitId}`} ({build.id})</option>)}
    </select> : null}
    <button type="button" onClick={() => void copyBuildJson()}>{isBuildCopied ? "Copied" : "Copy JSON"}</button>
    <button type="button" onClick={() => void loadBuildJson()}>{isBuildLoaded ? "Loaded" : "Load JSON"}</button>
  </section>;
}
