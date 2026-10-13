import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { StoredUmaBuild } from "../../../types/UmaBuild";
import type { SkillEntry } from "../../../types/SkillEntry";
import type { UmaEntry } from "../../../types/UmaEntry";
import UmaImage from "../../../components/UmaImage";
import CopyIcon from "../../../components/CopyIcon";
import TeamSections from "./TeamSections";
import SavedBuildDialog from "./SavedBuildDialog";
import { findSkill, getUmaUniqueSkillId, normalizeStrategyName } from "../domain/buildUtils";
import "../../../styles/UmaBuild.css";

interface TeamProps {
  teamNumber: number;
  build: StoredUmaBuild | null;
  availableBuilds: StoredUmaBuild[];
  umaList: UmaEntry[];
  skillList: SkillEntry[];
  onSelectBuild: (buildId: string | null) => void;
  showSupportCards?: boolean;
  compactText?: boolean;
  showCopyButton?: boolean;
  headerActions?: ReactNode;
  canClearBuild?: boolean;
  mobileTeamSummary?: boolean;
  mobileTeamDetailsFocused?: boolean;
  onToggleMobileTeamDetails?: () => void;
  showSwapButton?: boolean;
}

export default function Team({
  teamNumber,
  build,
  availableBuilds,
  umaList,
  skillList,
  onSelectBuild,
  showSupportCards = true,
  compactText = false,
  showCopyButton = true,
  headerActions,
  canClearBuild = false,
  mobileTeamSummary = false,
  mobileTeamDetailsFocused = false,
  onToggleMobileTeamDetails,
  showSwapButton = true,
}: TeamProps) {
  const [isSavedBuildsOpen, setIsSavedBuildsOpen] = useState(false);
  const [isBuildCopied, setIsBuildCopied] = useState(false);

  const selectedUma = build
    ? umaList.find((uma) => String(uma.id) === build.outfitId) ?? null
    : null;

  const uniqueSkill = build
    ? skillList.find((skill) => skill.id === String(getUmaUniqueSkillId(selectedUma)))
    : undefined;

  useEffect(() => {
    if (!isSavedBuildsOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsSavedBuildsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSavedBuildsOpen]);

  async function copyBuildJson() {
    if (!build) return;

    try {
      const normalizeSkill = (skill: string) => findSkill(skillList, skill)?.id ?? skill;
      await navigator.clipboard.writeText(JSON.stringify({
        ...build,
        strategy: normalizeStrategyName(build.strategy),
        mood: 2,
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
      className={`uma-build uma-build--team${build ? "" : " uma-build--team-empty"}${compactText ? " uma-build--team-compact" : ""}${mobileTeamSummary ? " uma-build--team-summary" : ""}${mobileTeamDetailsFocused ? " uma-build--mobile-details-focused" : ""}`}
      aria-label={`Build Uma ${teamNumber}`}
      role={mobileTeamSummary ? "button" : undefined}
      tabIndex={mobileTeamSummary ? 0 : undefined}
      aria-pressed={mobileTeamSummary ? mobileTeamDetailsFocused : undefined}
      onClick={mobileTeamSummary ? onToggleMobileTeamDetails : undefined}
      onKeyDown={mobileTeamSummary ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggleMobileTeamDetails?.();
        }
      } : undefined}
    >
      <section className="uma-build__team-header" aria-label="Selected Uma">
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
        {headerActions || (build && showCopyButton) ||
        (showSwapButton && (availableBuilds.length > 0 || (canClearBuild && build))) ? (
          <div className="uma-build__team-actions">
            {headerActions}
            {build && showCopyButton ? (
              <button
                className="uma-build__copy-button"
                type="button"
                aria-label={isBuildCopied ? "Build JSON copied" : "Copy build JSON"}
                title={isBuildCopied ? "Copied" : "Copy JSON"}
                onClick={() => void copyBuildJson()}
              >
                <span>Json</span>
                <CopyIcon />
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
      {isSavedBuildsOpen ? 
        <SavedBuildDialog 
          teamNumber={teamNumber} 
          builds={availableBuilds} 
          umaList={umaList} 
          canClear={canClearBuild && Boolean(build)} 
          onSelect={onSelectBuild} 
          onClose={() => setIsSavedBuildsOpen(false)} 
        /> : null}
      {build ? (
        <TeamSections
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
