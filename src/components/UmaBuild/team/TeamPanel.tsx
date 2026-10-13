import { useEffect, useRef, useState } from "react";
import { copyElementAsPng } from "../../../lib/copyElementAsPng";
import type { SkillEntry } from "../../../types/SkillEntry";
import type { StoredUmaBuild } from "../../../types/UmaBuild";
import type { UmaEntry } from "../../../types/UmaEntry";
import CopyIcon from "../../CopyIcon";
import BuildImage from "../../image/BuildImage";
import UmaBuildTeam from "./Team";
import {
  hasDuplicateBaseUmaIds,
} from "../../../features/results/domain/resultsTypes";
import type { UmaSlot } from "../../../features/results/domain/resultsTypes";
import "../../../styles/UmaBuildTeam.css";

interface TeamBuild {
  teamNumber: UmaSlot;
  build: StoredUmaBuild | null;
}

interface TeamPanelProps {
  event: string;
  builds: TeamBuild[];
  availableBuilds: StoredUmaBuild[];
  umaList: UmaEntry[];
  skillList: SkillEntry[];
  showSupportCards: boolean;
  onShowSupportCardsChange: (show: boolean) => void;
  onSelectBuild: (teamNumber: UmaSlot, buildId: string | null) => void;
}

export default function TeamPanel({
  event,
  builds,
  availableBuilds,
  umaList,
  skillList,
  showSupportCards,
  onShowSupportCardsChange,
  onSelectBuild,
}: TeamPanelProps) {
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [focusedTeamSlot, setFocusedTeamSlot] = useState<UmaSlot | null>(1);
  const [isCopyingImage, setIsCopyingImage] = useState(false);
  const [imageStatus, setImageStatus] = useState("");
  const imageRef = useRef<HTMLElement | null>(null);
  const imageStatusTimeout = useRef<number | null>(null);
  const hasTeamBuild = builds.some(({ build }) => build !== null);
  const hasDuplicateUmas = hasDuplicateBaseUmaIds(
    builds.map(({ build }) => build),
  );
  const focusedTeamBuild = builds.find(
    ({ teamNumber }) => teamNumber === focusedTeamSlot,
  );
  const imageBuilds = builds.map(({ teamNumber, build }) => ({
    slot: teamNumber,
    build,
  }));

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;

    const mobileQuery = window.matchMedia("(max-width: 760px)");
    const updateViewport = () => {
      setIsMobileViewport(mobileQuery.matches);
      if (mobileQuery.matches) {
        setFocusedTeamSlot((focused) => focused ?? 1);
      } else {
        setFocusedTeamSlot(null);
      }
    };
    updateViewport();
    mobileQuery.addEventListener("change", updateViewport);
    return () => mobileQuery.removeEventListener("change", updateViewport);
  }, []);

  useEffect(() => {
    setFocusedTeamSlot(1);
  }, [event]);

  useEffect(() => () => {
    if (imageStatusTimeout.current !== null) {
      window.clearTimeout(imageStatusTimeout.current);
    }
  }, []);

  function showImageStatus(message: string) {
    if (imageStatusTimeout.current !== null) {
      window.clearTimeout(imageStatusTimeout.current);
    }
    setImageStatus(message);
    imageStatusTimeout.current = window.setTimeout(() => {
      setImageStatus("");
      imageStatusTimeout.current = null;
    }, 5000);
  }

  async function copyTeamImage() {
    const node = imageRef.current;
    if (!node || isCopyingImage || !hasTeamBuild) return;

    setIsCopyingImage(true);
    if (imageStatusTimeout.current !== null) {
      window.clearTimeout(imageStatusTimeout.current);
      imageStatusTimeout.current = null;
    }
    setImageStatus("");
    const eventFileName = event.toLowerCase().replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "team";

    try {
      const result = await copyElementAsPng(
        node,
        `umaplanner-${eventFileName}-team.png`,
      );
      showImageStatus(result === "copied"
        ? "Image copied to clipboard."
        : result === "fallback-download"
          ? "Clipboard unavailable; PNG downloaded instead."
          : "PNG downloaded.");
    } catch (error) {
      showImageStatus(
        `Could not create the image: ${error instanceof Error ? error.message : "Unknown error."}`,
      );
    } finally {
      setIsCopyingImage(false);
    }
  }

  return (
    <div className="uma-build-team">
      <div className="uma-build-team__toolbar">
        <div className="uma-build-team__copy-image-group">
          <button
            type="button"
            className="uma-build-team__copy-image"
            aria-label="Copy team as image"
            disabled={!hasTeamBuild || isCopyingImage}
            onClick={() => void copyTeamImage()}
          >
            <span>{isCopyingImage ? "Creating…" : "Team image"}</span>
            <CopyIcon />
          </button>
          {imageStatus ? (
            <span className="uma-build-team__image-status" role="status" aria-live="polite">
              {imageStatus}
            </span>
          ) : null}
        </div>
        <label className="uma-build-team__support-toggle">
          <input
            type="checkbox"
            checked={showSupportCards}
            onChange={(change) => onShowSupportCardsChange(change.target.checked)}
          />
          Show support cards
        </label>
      </div>
      {hasDuplicateUmas ? (
        <p className="uma-build-team__duplicate-warning" role="alert">
          This team cannot be saved while it contains multiple builds for
          the same Uma.
        </p>
      ) : null}
      <div className="uma-build-team-grid">
        {builds.map(({ teamNumber, build }) => (
          <UmaBuildTeam
            key={teamNumber}
            teamNumber={teamNumber}
            build={build}
            availableBuilds={availableBuilds}
            umaList={umaList}
            skillList={skillList}
            showSupportCards={showSupportCards}
            compactText
            showCopyButton={false}
            showSwapButton={!isMobileViewport}
            mobileTeamSummary={isMobileViewport}
            mobileTeamDetailsFocused={isMobileViewport && focusedTeamSlot === teamNumber}
            onToggleMobileTeamDetails={isMobileViewport ? () => {
              setFocusedTeamSlot((focused) =>
                focused === teamNumber ? null : teamNumber
              );
            } : undefined}
            onSelectBuild={(buildId) => onSelectBuild(teamNumber, buildId)}
          />
        ))}
      </div>
      {isMobileViewport && focusedTeamBuild ? (
        <section
          className="uma-build-team__focused-details"
          aria-label={`Uma ${focusedTeamBuild.teamNumber} build details`}
          aria-live="polite"
        >
          <UmaBuildTeam
            key={focusedTeamBuild.teamNumber}
            teamNumber={focusedTeamBuild.teamNumber}
            build={focusedTeamBuild.build}
            availableBuilds={availableBuilds}
            umaList={umaList}
            skillList={skillList}
            showSupportCards={showSupportCards}
            compactText
            canClearBuild
            onSelectBuild={(buildId) =>
              onSelectBuild(focusedTeamBuild.teamNumber, buildId)
            }
          />
        </section>
      ) : null}
      <div className="result-image-stage" aria-hidden="true">
        <BuildImage
          ref={imageRef}
          event={event}
          builds={imageBuilds}
          umaList={umaList}
          skillList={skillList}
          showSupportCards={showSupportCards}
        />
      </div>
    </div>
  );
}
