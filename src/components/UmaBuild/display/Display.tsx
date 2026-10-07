import { useEffect, useState } from "react";
import type { StoredUmaBuild } from "../../../types/UmaBuild";
import type { SkillEntry } from "../../../types/SkillEntry";
import type { UmaEntry } from "../../../types/UmaEntry";
import UmaImage from "../../UmaImage";
import UmaBuildDisplaySections from "./DisplaySections";
import UmaBuildSavedBuildDialog from "./SavedBuildDialog";
import { findSkill, getUmaUniqueSkillId } from "../utils";
import "../../../styles/UmaBuild.css";

interface UmaBuildDisplayProps {
  teamNumber: number;
  build: StoredUmaBuild | null;
  availableBuilds: StoredUmaBuild[];
  umaList: UmaEntry[];
  skillList: SkillEntry[];
  onSelectBuild: (buildId: string | null) => void;
  showSupportCards?: boolean;
  compactText?: boolean;
  showCopyButton?: boolean;
  canClearBuild?: boolean;
  mobileSummary?: boolean;
  mobileDetailsFocused?: boolean;
  onToggleMobileDetails?: () => void;
  showSwapButton?: boolean;
}

export default function UmaBuildDisplay({
  teamNumber,
  build,
  availableBuilds,
  umaList,
  skillList,
  onSelectBuild,
  showSupportCards = true,
  compactText = false,
  showCopyButton = true,
  canClearBuild = false,
  mobileSummary = false,
  mobileDetailsFocused = false,
  onToggleMobileDetails,
  showSwapButton = true,
}: UmaBuildDisplayProps) {
  const [isSavedBuildsOpen, setIsSavedBuildsOpen] = useState(false);
  const [isBuildCopied, setIsBuildCopied] = useState(false);
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

  async function copyBuildJson() {
    if (!build) {
      return;
    }

    try {
      const normalizeSkill = (skill: string) => findSkill(skillList, skill)?.id ?? skill;
      await navigator.clipboard.writeText(JSON.stringify({
        ...build,
        skills: build.skills.map(normalizeSkill),
        forcedSkillPositions: Object.fromEntries(
          Object.entries(build.forcedSkillPositions).map(([skill, position]) => [
            normalizeSkill(skill),
            position,
          ]),
        ),
      }, null, 2));
      setIsBuildCopied(true);
      window.setTimeout(() => setIsBuildCopied(false), 2000);
    } catch (error) {
      console.error("Error copying Uma build:", error);
    }
  }

  return (
    <section
      className={`uma-build uma-build--display${build ? "" : " uma-build--display-empty"}${compactText ? " uma-build--display-compact" : ""}${mobileSummary ? " uma-build--team-summary" : ""}${mobileDetailsFocused ? " uma-build--mobile-details-focused" : ""}`}
      aria-label={`Build Uma ${teamNumber}`}
      role={mobileSummary ? "button" : undefined}
      tabIndex={mobileSummary ? 0 : undefined}
      aria-pressed={mobileSummary ? mobileDetailsFocused : undefined}
      onClick={mobileSummary ? onToggleMobileDetails : undefined}
      onKeyDown={mobileSummary ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggleMobileDetails?.();
        }
      } : undefined}
    >
      <section className="uma-build__uma-display" aria-label="Selected Uma">
        {selectedUma ? (
          <>
            <UmaImage uma={selectedUma} alt="" />
            <span className="uma-build__uma-copy">
              {build?.["build-type"] === "plan" ? (
                <small className="uma-build__plan-label">PLAN</small>
              ) : null}
              <strong>{selectedUma.outfitTitle}</strong>
              <small>{selectedUma.baseCharacterName}</small>
            </span>
          </>
        ) : (
          <span className="uma-build__uma-placeholder">
            {build?.["build-type"] === "plan" ? (
              <small className="uma-build__plan-label">PLAN</small>
            ) : null}
            No Uma selected
          </span>
        )}
        {(build && showCopyButton) ||
        (showSwapButton && (availableBuilds.length > 0 || (canClearBuild && build))) ? (
          <div className="uma-build__display-actions">
            {build && showCopyButton ? (
              <button
                className="uma-build__copy-button"
                type="button"
                aria-label={isBuildCopied ? "Build JSON copied" : "Copy build JSON"}
                title={isBuildCopied ? "Copied" : "Copy JSON"}
                onClick={() => void copyBuildJson()}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="8" y="8" width="11" height="12" rx="1.5" />
                  <path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v10A1.5 1.5 0 0 0 5.5 17H8" />
                </svg>
              </button>
            ) : null}
            {showSwapButton && (availableBuilds.length > 0 || (canClearBuild && build)) ? (
              <button
                className="uma-build__swap-button"
                type="button"
                onClick={() => setIsSavedBuildsOpen(true)}
              >
                {build ? "Swap" : "Select build"}
              </button>
            ) : null}
          </div>
        ) : null}
      </section>
      {isSavedBuildsOpen ? <UmaBuildSavedBuildDialog teamNumber={teamNumber} builds={availableBuilds} umaList={umaList} canClear={canClearBuild && Boolean(build)} onSelect={onSelectBuild} onClose={() => setIsSavedBuildsOpen(false)} /> : null}
      {build ? (
        <UmaBuildDisplaySections
          build={build}
          uniqueSkill={uniqueSkill}
          skillList={skillList}
          teamNumber={teamNumber}
          showSupportCards={showSupportCards}
        />
      ) : null}
    </section>
  );
}
