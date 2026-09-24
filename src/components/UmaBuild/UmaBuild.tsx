import { useEffect, useRef, useState } from "react";
import type { UmaBuild as UmaBuildData, StoredUmaBuild } from "../../types/UmaBuild";
import type { SkillEntry } from "../../types/SkillEntry";
import type { UmaEntry } from "../../types/UmaEntry";
import UmaSelect from "../UmaSelect";
import UmaBuildAptitudes from "./UmaBuildAptitudes";
import UmaBuildSkills from "./UmaBuildSkills";
import UmaBuildStats from "./UmaBuildStats";
import UmaBuildToolbar from "./UmaBuildToolbar";
import useUmaBuildEditor from "./useUmaBuildEditor";
import "../../styles/UmaBuild.css";

interface UmaBuildProps {
  teamNumber: number;
  buildId?: string | null;
  value: UmaBuildData;
  onChange: (value: UmaBuildData) => void;
  umaList: UmaEntry[];
  selectedUma: UmaEntry | null;
  onSelectUma: (uma: UmaEntry | null) => void | Promise<void>;
  skillList: SkillEntry[];
  uniqueSkillId?: number;
  savedBuilds?: StoredUmaBuild[];
  buildName?: string;
  onSelectSavedBuild?: (buildId: string) => void | Promise<void>;
  onSaveBuild?: (build: UmaBuildData, name: string) => void | Promise<void>;
  onNewBuild?: () => void;
}

export default function UmaBuild({
  teamNumber, buildId = null, value, onChange, umaList, selectedUma, onSelectUma,
  skillList, uniqueSkillId, savedBuilds = [], buildName = "", onSelectSavedBuild,
  onSaveBuild, onNewBuild,
}: UmaBuildProps) {
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);
  const saveMenuRef = useRef<HTMLSpanElement | null>(null);
  const defaultBuildName = buildName || selectedUma?.baseCharacterName || "";
  const editor = useUmaBuildEditor({
    value,
    onChange,
    skillList,
    uniqueSkillId,
    buildName: defaultBuildName,
    buildId,
    savedBuilds,
    onNewBuild,
  });

  useEffect(() => {
    if (!isSaveMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (saveMenuRef.current && !saveMenuRef.current.contains(event.target as Node)) {
        setIsSaveMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isSaveMenuOpen]);

  return (
    <section className="uma-build" aria-label={`Build Uma ${teamNumber}`}>
      <UmaBuildToolbar
        value={value}
        savedBuilds={savedBuilds}
        onNewBuild={editor.startNewBuild}
        onSaveBuild={onSaveBuild}
        onSelectSavedBuild={onSelectSavedBuild}
        isBuildCopied={editor.isBuildCopied}
        isBuildLoaded={editor.isBuildLoaded}
        draftBuildName={editor.draftBuildName}
        setDraftBuildName={editor.setDraftBuildName}
        hasDuplicateName={editor.hasDuplicateName}
        saveMenuRef={saveMenuRef}
        isSaveMenuOpen={isSaveMenuOpen}
        setIsSaveMenuOpen={setIsSaveMenuOpen}
        copyBuildJson={editor.copyBuildJson}
        loadBuildJson={editor.loadBuildJson}
      />
      <UmaSelect
        className="uma-build__uma-select"
        teamNumber={teamNumber}
        umaList={umaList}
        value={selectedUma}
        onChange={(uma) => { void onSelectUma(uma); }}
      />
      <section className="uma-build__panel uma-build__stats-panel" aria-labelledby={`stats-heading-${teamNumber}`}>
        <div className="uma-build__stats-section">
          <div className="uma-build__section-heading"><h4 id={`stats-heading-${teamNumber}`}>Stats</h4></div>
          <UmaBuildStats value={value} editable onChange={editor.updateField} />
        </div>
        <div className="uma-build__aptitudes-section">
          <div className="uma-build__section-heading"><h4 id={`aptitudes-heading-${teamNumber}`}>Aptitudes</h4></div>
          <UmaBuildAptitudes
            value={value}
            openAptitude={editor.openAptitude}
            openChoice={editor.openChoice}
            onToggleAptitude={(field) => {
              editor.setOpenChoice(null);
              editor.setOpenAptitude(editor.openAptitude === field ? null : field);
            }}
            onToggleStrategy={() => {
              editor.setOpenAptitude(null);
              editor.setOpenChoice(editor.openChoice === "strategy" ? null : "strategy");
            }}
            onChange={(field, nextValue) => {
              editor.updateField(field, nextValue);
              if (field === "strategy") editor.setOpenChoice(null);
              else editor.setOpenAptitude(null);
            }}
          />
        </div>
      </section>
      <UmaBuildSkills
        value={value}
        skillList={skillList}
        skillPickerIndex={editor.skillPickerIndex}
        isSkillPickerOpen={editor.isSkillPickerOpen}
        skillSearch={editor.skillSearch}
        skillSort={editor.skillSort}
        setSkillSort={editor.setSkillSort}
        skillSortAscending={editor.skillSortAscending}
        setSkillSortAscending={editor.setSkillSortAscending}
        filteredSkills={editor.filteredSkills}
        getSkillId={editor.getSkillId}
        isForcedSkill={editor.isForcedSkill}
        isUnavailableSkill={editor.isUnavailableSkill}
        setSkillSearch={editor.setSkillSearch}
        openSkillPicker={editor.openSkillPicker}
        closeSkillPicker={editor.closeSkillPicker}
        selectSkill={editor.selectSkill}
        removeSkill={editor.removeSkill}
      />
    </section>
  );
}
