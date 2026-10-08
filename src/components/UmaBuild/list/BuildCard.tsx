import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { StoredUmaBuild } from "../../../types/UmaBuild";
import type { UmaEntry } from "../../../types/UmaEntry";
import type { SkillEntry } from "../../../types/SkillEntry";
import UmaImage from "../../UmaImage";
import UmaBuildDisplay from "../display/Display";
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
}: Props) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const detailsDialogRef = useRef<HTMLDialogElement | null>(null);
  const strategyIcon = strategyIcons[normalizeStrategyName(build.strategy)];

  useEffect(() => {
    const dialog = detailsDialogRef.current;
    if (!dialog || !isDetailsOpen) return;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [isDetailsOpen]);

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
          <UmaBuildDisplay
            teamNumber={1}
            build={build}
            availableBuilds={[]}
            umaList={uma ? [uma] : []}
            skillList={skillList}
            onSelectBuild={() => undefined}
          />
        </dialog>
      ) : null}
    </article>
  );
}
