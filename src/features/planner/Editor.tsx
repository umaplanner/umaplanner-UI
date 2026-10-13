import { useEffect, useRef, useState } from "react";
import type { UmaBuild as UmaBuildData, StoredUmaBuild, SupportCardEntry } from "../../types/UmaBuild";
import type { SkillEntry } from "../../types/SkillEntry";
import type { UmaEntry } from "../../types/UmaEntry";
import UmaSelect from "../../components/UmaSelect";
import EditorAptitudes from "./components/EditorAptitudes";
import EditorSkills from "./components/EditorSkills";
import EditorStats from "./components/EditorStats";
import EditorToolbar from "./components/EditorToolbar";
import EditorSupportCards from "./components/EditorSupportCards";
import useEditor from "./hooks/useEditor";
import "../../styles/UmaBuild.css";

interface EditorProps {
  teamNumber: number;
  buildId?: string | null;
  isSavedBuild?: boolean;
  value: UmaBuildData;
  onChange: (value: UmaBuildData) => void;
  umaList: UmaEntry[];
  selectedUma: UmaEntry | null;
  onSelectUma: (uma: UmaEntry | null) => void | Promise<void>;
  skillList: SkillEntry[];
  supportCardList?: SupportCardEntry[];
  uniqueSkillId?: number;
  savedBuilds?: StoredUmaBuild[];
  buildName?: string;
  onSelectSavedBuild?: (buildId: string) => void | Promise<void>;
  onCopySavedBuild?: (buildId: string) => void | Promise<void>;
  onSaveBuild?: (build: UmaBuildData, name: string) => void | Promise<void>;
  onNewBuild?: () => void;
  onBuildLoaded?: (build: UmaBuildData) => void;
}

export default function Editor({
  teamNumber, buildId = null, isSavedBuild, value, onChange, umaList, selectedUma, onSelectUma,
  skillList, supportCardList = [], uniqueSkillId, savedBuilds = [], buildName = "", onSelectSavedBuild,
  onCopySavedBuild, onSaveBuild, onNewBuild,
  onBuildLoaded,
}: EditorProps) {
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);
  const saveMenuRef = useRef<HTMLSpanElement | null>(null);
  const aptitudesRef = useRef<HTMLDivElement | null>(null);
  const editor = useEditor({
    value,
    onChange,
    skillList,
    uniqueSkillId,
    buildName,
    buildId,
    isSavedBuild,
    savedBuilds,
    onNewBuild,
    onBuildLoaded,
  });

  const {
    openAptitude,
    openChoice,
    setOpenAptitude,
    setOpenChoice,
  } = editor;

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

  useEffect(() => {
    if (openAptitude === null && openChoice === null) return;

    const handlePointerDown = (event: PointerEvent) => {
      const openSelector = aptitudesRef.current?.querySelector('[aria-expanded="true"]')
        ?.closest(".uma-build__aptitude-selector, .uma-build__choice-selector");

      if (!openSelector?.contains(event.target as Node)) {
        setOpenAptitude(null);
        setOpenChoice(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [
    openAptitude,
    openChoice,
    setOpenAptitude,
    setOpenChoice,
  ]);

  return (
    <section className="uma-build" aria-label={`Build Uma ${teamNumber}`}>
      <EditorToolbar
        teamNumber={teamNumber}
        value={value}
        onTogglePlan={(isPlan) => editor.updateField("build-type", isPlan ? "plan" : "standard")}
        savedBuilds={savedBuilds}
        umaList={umaList}
        onNewBuild={editor.startNewBuild}
        onSaveBuild={onSaveBuild}
        onSelectSavedBuild={onSelectSavedBuild}
        onCopySavedBuild={onCopySavedBuild}
        isBuildCopied={editor.isBuildCopied}
        isBuildLoaded={editor.isBuildLoaded}
        draftBuildName={editor.draftBuildName}
        setDraftBuildName={editor.setDraftBuildName}
        isSavedBuild={isSavedBuild ?? buildId !== null}
        willOverrideBuild={editor.willOverrideBuild}
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
          <EditorStats value={value} editable onChange={editor.updateField} />
        </div>

        <div className="uma-build__aptitudes-section" ref={aptitudesRef}>
          <div className="uma-build__section-heading"><h4 id={`aptitudes-heading-${teamNumber}`}>Aptitudes</h4></div>
          <EditorAptitudes
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
      <EditorSkills
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
      <EditorSupportCards
        value={value}
        supportCardList={supportCardList}
        onChange={onChange}
      />
    </section>
  );
}
