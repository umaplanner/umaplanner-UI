import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { StoredUmaBuild } from "../../../types/UmaBuild";
import type { UmaEntry } from "../../../types/UmaEntry";
import type { SkillEntry } from "../../../types/SkillEntry";
import UmaImage from "../../UmaImage";
import { copyElementAsPng } from "../../../lib/copyElementAsPng";
import CopyIcon from "../../CopyIcon";
import BuildImage from "../../image/BuildImage";
import UmaBuildTeam from "../team/Team";
import {
  aptitudeRankImages,
  getStatRank,
  normalizeStrategyName,
  strategyIcons,
  statFields,
} from "../utils";

interface Props {
  build: StoredUmaBuild;
  uma?: UmaEntry;
  skillList: SkillEntry[];
  title: ReactNode;
  subtitleLines?: string[];
  createdTime?: Date | null;
  headerAction?: ReactNode;
  footerAction?: ReactNode;
  testId?: string;
  imageEvent?: string;
}

export default function BuildCard({
  build,
  uma,
  skillList,
  title,
  subtitleLines = [],
  createdTime = null,
  headerAction,
  footerAction,
  testId,
  imageEvent = build.event,
}: Props) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCopyingImage, setIsCopyingImage] = useState(false);
  const [imageStatus, setImageStatus] = useState("");
  const detailsDialogRef = useRef<HTMLDialogElement | null>(null);
  const imageRef = useRef<HTMLElement | null>(null);
  const imageStatusTimeout = useRef<number | null>(null);
  const strategyIcon = strategyIcons[normalizeStrategyName(build.strategy)];

  useEffect(() => () => {
    if (imageStatusTimeout.current !== null) {
      window.clearTimeout(imageStatusTimeout.current);
    }
  }, []);

  useEffect(() => {
    const dialog = detailsDialogRef.current;
    if (!dialog || !isDetailsOpen) return;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [isDetailsOpen]);

  function clearImageStatus() {
    if (imageStatusTimeout.current !== null) {
      window.clearTimeout(imageStatusTimeout.current);
      imageStatusTimeout.current = null;
    }
    setImageStatus("");
  }

  function showImageStatus(message: string) {
    clearImageStatus();
    setImageStatus(message);
    imageStatusTimeout.current = window.setTimeout(() => {
      setImageStatus("");
      imageStatusTimeout.current = null;
    }, 5000);
  }

  async function copyBuildImage() {
    const node = imageRef.current;
    if (!node || isCopyingImage) return;

    setIsCopyingImage(true);
    clearImageStatus();
    const eventFileName = imageEvent.toLowerCase().replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "build";
    const buildFileName = (build.name || `uma-${build.outfitId}`)
      .toLowerCase().replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "build";

    try {
      const result = await copyElementAsPng(
        node,
        `umaplanner-${eventFileName}-${buildFileName}.png`,
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
    <article className="build-card" data-testid={testId}>
      {headerAction}
      <div className="build-card__main">
        {uma ? <UmaImage uma={uma} alt="" /> : null}
        <div>
          <h2>{title}</h2>
          {subtitleLines.map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}
        </div>
        <div className="build-card__actions">
          {createdTime && !Number.isNaN(createdTime.getTime()) ? (
            <time
              className={`build-card__created-time${headerAction ? " build-card__created-time--saved" : ""}`}
              dateTime={createdTime.toISOString()}
            >
              <span>{createdTime.toLocaleDateString()}</span>
              <span>{createdTime.toLocaleTimeString()}</span>
            </time>
          ) : null}
          <button className="build-card__details-button" type="button" onClick={() => setIsDetailsOpen(true)}>
            Details
          </button>
        </div>
      </div>
      <div className="build-card__aptitudes" aria-label="Aptitudes">
        <span>
          <span>Surface</span>
          <img src={`/icons/statrank/rank_${String(aptitudeRankImages[build.surfaceAptitude]).padStart(2, "0")}.png`} alt={`Rank ${build.surfaceAptitude}`} />
        </span>
        <span>
          <span>Distance</span>
          <img src={`/icons/statrank/rank_${String(aptitudeRankImages[build.distanceAptitude]).padStart(2, "0")}.png`} alt={`Rank ${build.distanceAptitude}`} />
        </span>
        <span>
          <span>Style</span>
          <img src={`/icons/statrank/rank_${String(aptitudeRankImages[build.strategyAptitude]).padStart(2, "0")}.png`} alt={`Rank ${build.strategyAptitude}`} />
          {strategyIcon ? <img src={`/icons/style/${strategyIcon}.webp`} alt={normalizeStrategyName(build.strategy)} /> : null}
        </span>
      </div>
      <div className="build-card__stats" aria-label="Stats">
        {statFields.map((field) => (
          <span key={field}>
            {field}
            <span className="build-card__stat-value">
              <img src={`/icons/statrank/rank_${String(getStatRank(build[field])).padStart(2, "0")}.png`} alt={`${field} rank`} />
              <strong>{build[field]}</strong>
            </span>
          </span>
        ))}
      </div>
      {footerAction}
      {isDetailsOpen ? (
        <dialog
          ref={detailsDialogRef}
          className="build-card__details-dialog"
          onCancel={() => setIsDetailsOpen(false)}
          onClose={() => setIsDetailsOpen(false)}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsDetailsOpen(false);
          }}
        >
          <button className="build-card__details-close" type="button" aria-label="Close details" onClick={() => setIsDetailsOpen(false)}>×</button>
          <UmaBuildTeam
            teamNumber={1}
            build={build}
            availableBuilds={[]}
            umaList={uma ? [uma] : []}
            skillList={skillList}
            headerActions={(
              <div className="build-card__image-actions">
                {imageStatus ? (
                  <span role="status" aria-live="polite">{imageStatus}</span>
                ) : null}
                <button
                  type="button"
                  className="build-card__copy-image"
                  aria-label="Copy build image"
                  disabled={isCopyingImage}
                  onClick={() => void copyBuildImage()}
                >
                  <span>{isCopyingImage ? "Creating…" : "Image"}</span>
                  <CopyIcon />
                </button>
              </div>
            )}
            onSelectBuild={() => undefined}
          />
        </dialog>
      ) : null}
      {isDetailsOpen ? (
        <div className="result-image-stage" aria-hidden="true">
          <BuildImage
            ref={imageRef}
            event={imageEvent}
            builds={[{ slot: 1, build }]}
            umaList={uma ? [uma] : []}
            skillList={skillList}
          />
        </div>
      ) : null}
    </article>
  );
}
