import { useEffect, useRef, useState } from "react";
import type {
  TeamFinalBuildPlacements,
  TeamFinalPlacement,
  UmaSlot,
} from "../../../features/planner/plannerTypes";
import type { StoredUmaBuild } from "../../../types/UmaBuild";
import type { SkillEntry } from "../../../types/SkillEntry";
import type { UmaEntry } from "../../../types/UmaEntry";
import UmaImage from "../../UmaImage";
import UmaBuildDisplay from "../display/Display";
import type { ResultBuildSummary } from "./types";
import { formatUmaPlacement } from "./utils";

interface Props {
  finalPlacement: TeamFinalPlacement | null;
  finalBuildPlacements: TeamFinalBuildPlacements;
  finalBuilds: [StoredUmaBuild | undefined, StoredUmaBuild | undefined, StoredUmaBuild | undefined];
  hasFinalsData: boolean;
  canAddFinals: boolean;
  summaryBuilds: ResultBuildSummary[];
  totalWinRate: number | null;
  totalTicketWins: number;
  totalTicketCount: number;
  canShowBuildWinRates: boolean;
  umaList: UmaEntry[];
  skillList: SkillEntry[];
  showSupportCards: boolean;
  onEditFinals: () => void;
}

export default function Summary({
  finalPlacement,
  finalBuildPlacements,
  finalBuilds,
  hasFinalsData,
  canAddFinals,
  summaryBuilds,
  totalWinRate,
  totalTicketWins,
  totalTicketCount,
  canShowBuildWinRates,
  umaList,
  skillList,
  showSupportCards,
  onEditFinals,
}: Props) {
  const [summaryDetails, setSummaryDetails] = useState<{
    build: StoredUmaBuild;
    slot: UmaSlot;
    title: string;
  } | null>(null);
  const detailsDialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = detailsDialogRef.current;
    if (!dialog || !summaryDetails) return;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close?.();
    };
  }, [summaryDetails]);

  return (
    <>
      <section
        className="uma-build-results__summary"
        aria-labelledby="uma-build-results-summary-heading"
      >
        <h2 id="uma-build-results-summary-heading">Summary</h2>
        <div className="uma-build-results__summary-finals">
          <div className="uma-build-results__summary-placement">
            <strong
              className={`uma-build-results__placement-badge${finalPlacement ? ` uma-build-results__placement-badge--${finalPlacement}` : ""}`}
              aria-label="Finals placement"
            >
              {finalPlacement === 1
                ? "1st"
                : finalPlacement === 2
                  ? "2nd"
                  : finalPlacement === 3
                    ? "3rd"
                    : "Not recorded"}
            </strong>
            <div className="uma-build-results__total-win-rate" aria-label="Total win rate">
              <strong>{totalWinRate === null ? "— WR" : `${totalWinRate}% WR`}</strong>
              <small>{totalTicketWins}/{totalTicketCount * 5}</small>
            </div>
          </div>
          <div className="uma-build-results__summary-finals-team">
            <div className="uma-build-results__summary-finals-heading">
              <h3>Finals builds</h3>
              <button
                className="uma-build-results__add-ticket"
                type="button"
                disabled={!hasFinalsData && !canAddFinals}
                title={!hasFinalsData && !canAddFinals
                  ? "Finals results can be added starting on Finals day."
                  : undefined}
                onClick={onEditFinals}
              >
                {hasFinalsData ? "Edit Finals" : "Add Finals results"}
              </button>
            </div>
            {hasFinalsData ? (
              <div className="uma-build-results__summary-finals-grid">
                {([1, 2, 3] as const).map((slot, index) => {
                  const build = finalBuilds[index];
                  const placement = finalBuildPlacements[index];
                  const uma = build
                    ? umaList.find((entry) => String(entry.id) === build.outfitId) ?? null
                    : null;
                  return (
                    <button
                      type="button"
                      className="uma-build-results__summary-final-build"
                      key={slot}
                      aria-label={`Show details for Finals Uma ${slot}`}
                      disabled={!build}
                      onClick={() => {
                        if (build) {
                          setSummaryDetails({
                            build,
                            slot,
                            title: "Finals build details",
                          });
                        }
                      }}
                    >
                      {uma ? (
                        <UmaImage
                          className="uma-build-results__uma-image"
                          uma={uma}
                          alt={`Finals Uma ${slot}: ${uma.outfitTitle}`}
                        />
                      ) : (
                        <span className="uma-build-results__summary-empty-image">—</span>
                      )}
                      <div className="uma-build-results__summary-final-build-info">
                        <strong>{uma?.outfitTitle ?? "No build selected"}</strong>
                        {uma ? <small>{uma.baseCharacterName}</small> : null}
                        <small>
                          {placement === null
                            ? "Placement not recorded"
                            : `${formatUmaPlacement(placement)} place`}
                        </small>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p>No Finals results recorded.</p>
            )}
          </div>
        </div>
        <hr className="uma-build-results__summary-separator" />
        <div
          className="uma-build-results__summary-build-performance"
          role="group"
          aria-label="Build performance summary"
        >
          <h3>Builds used in rounds</h3>
          {summaryBuilds.length === 0 ? (
            <p>No builds recorded yet.</p>
          ) : (
            <div className="uma-build-results__summary-build-grid">
              {summaryBuilds.map(({ build, wins, races, slot }) => {
                const uma = umaList.find(
                  (entry) => String(entry.id) === build.outfitId,
                );
                return (
                  <button
                    type="button"
                    className="uma-build-results__summary-build"
                    key={build.id}
                    aria-label={`Show details for Round build ${build.name || "Unnamed build"}`}
                    onClick={() =>
                      setSummaryDetails({
                        build,
                        slot,
                        title: "Round build details",
                      })}
                  >
                    {uma ? (
                      <UmaImage
                        className="uma-build-results__uma-image"
                        uma={uma}
                        alt={`${build.name || "Unnamed build"}: ${uma.outfitTitle}`}
                      />
                    ) : null}
                    <strong>{build.name || "Unnamed build"}</strong>
                    {canShowBuildWinRates && races > 0 ? (
                      <small>
                        {Math.round((wins / (races * 5)) * 100)}% WR ({wins}/{races * 5})
                      </small>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>
      {summaryDetails ? (
        <dialog
          ref={detailsDialogRef}
          className="build-card__details-dialog"
          aria-labelledby="uma-build-results-summary-details-heading"
          onCancel={() => setSummaryDetails(null)}
          onClose={() => setSummaryDetails(null)}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSummaryDetails(null);
          }}
        >
          <button
            className="build-card__details-close"
            type="button"
            aria-label="Close build details"
            onClick={() => setSummaryDetails(null)}
          >
            ×
          </button>
          <h2
            className="uma-build-results__summary-details-heading"
            id="uma-build-results-summary-details-heading"
          >
            {summaryDetails.title}
          </h2>
          <UmaBuildDisplay
            teamNumber={summaryDetails.slot}
            build={summaryDetails.build}
            availableBuilds={[]}
            umaList={umaList}
            skillList={skillList}
            showSupportCards={showSupportCards}
            onSelectBuild={() => undefined}
          />
        </dialog>
      ) : null}
    </>
  );
}
