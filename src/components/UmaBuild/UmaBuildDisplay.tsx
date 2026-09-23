import { useEffect, useState } from "react";
import type { StoredUmaBuild } from "../../types/UmaBuild";
import type { SkillEntry } from "../../types/SkillEntry";
import type { UmaEntry } from "../../types/UmaEntry";
import UmaImage from "../UmaImage";
import UmaBuildDisplaySections from "./UmaBuildDisplaySections";
import UmaBuildSavedBuildDialog from "./UmaBuildSavedBuildDialog";
import { getUmaUniqueSkillId } from "./umaBuildUtils";
import "../../styles/UmaBuild.css";

interface UmaBuildDisplayProps {
  teamNumber: number;
  build: StoredUmaBuild | null;
  availableBuilds: StoredUmaBuild[];
  umaList: UmaEntry[];
  skillList: SkillEntry[];
  onSelectBuild: (buildId: string) => void;
}

export default function UmaBuildDisplay({
  teamNumber,
  build,
  availableBuilds,
  umaList,
  skillList,
  onSelectBuild,
}: UmaBuildDisplayProps) {
  const [isSavedBuildsOpen, setIsSavedBuildsOpen] = useState(false);
  const selectedUma = build
    ? umaList.find((uma) => String(uma.id) === build.outfitId) ?? null
    : null;
  const uniqueSkill = build
    ? skillList.find((skill) => skill.id === String(getUmaUniqueSkillId(selectedUma)))
    : undefined;

  useEffect(() => {
    if (!isSavedBuildsOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsSavedBuildsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSavedBuildsOpen]);

  return (
    <section
      className={`uma-build uma-build--display${build ? "" : " uma-build--display-empty"}`}
      aria-label={`Build Uma ${teamNumber}`}
    >
      <section className="uma-build__uma-display" aria-label="Selected Uma">
        {selectedUma ? (
          <>
            <UmaImage uma={selectedUma} alt="" />
            <span>
              <strong>{selectedUma.outfitTitle}</strong>
              <small>{selectedUma.baseCharacterName}</small>
            </span>
          </>
        ) : (
          <span className="uma-build__uma-placeholder">No Uma selected</span>
        )}
        {availableBuilds.length > 0 ? (
          <div className="uma-build__display-actions">
            <button
              className="uma-build__swap-button"
              type="button"
              onClick={() => setIsSavedBuildsOpen(true)}
            >
              {build ? "Swap saved build" : "Select build"}
            </button>
          </div>
        ) : null}
      </section>
      {isSavedBuildsOpen ? <UmaBuildSavedBuildDialog teamNumber={teamNumber} builds={availableBuilds} umaList={umaList} onSelect={onSelectBuild} onClose={() => setIsSavedBuildsOpen(false)} /> : null}
      {build ? <UmaBuildDisplaySections build={build} uniqueSkill={uniqueSkill} skillList={skillList} teamNumber={teamNumber} /> : null}
    </section>
  );
}
