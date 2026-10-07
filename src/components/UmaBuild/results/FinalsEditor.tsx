import { useLayoutEffect, useRef, useState } from "react";
import {
  getBaseUmaId,
  hasDuplicateBaseUmaIds,
  type InitialTeamBuildIds,
  type TeamFinalBuildPlacements,
  type TeamFinalPlacement,
  type TeamUmaPlacement,
} from "../../../features/planner/plannerTypes";
import type { StoredUmaBuild } from "../../../types/UmaBuild";
import type { UmaEntry } from "../../../types/UmaEntry";
import BuildSelector from "./BuildSelector";
import type {
  EffectiveResultBuildLookup,
  FinalsDraft,
  ResultBuildLookup,
} from "./types";
import { formatUmaPlacement, umaPlacements } from "./utils";

interface Props {
  hasFinalsData: boolean;
  canAddFinals: boolean;
  finalPlacement: TeamFinalPlacement | null;
  finalBuildPlacements: TeamFinalBuildPlacements;
  availableBuilds: StoredUmaBuild[];
  selectableBuilds: StoredUmaBuild[];
  umaList: UmaEntry[];
  getBuild: ResultBuildLookup;
  getEffectiveBuildId: EffectiveResultBuildLookup;
  onSaveFinals: (
    buildIds: InitialTeamBuildIds,
    buildPlacements: TeamFinalBuildPlacements,
    placement: TeamFinalPlacement,
  ) => void;
  onClose: () => void;
}

export default function FinalsEditor({
  hasFinalsData,
  canAddFinals,
  finalPlacement,
  finalBuildPlacements,
  availableBuilds,
  selectableBuilds,
  umaList,
  getBuild,
  getEffectiveBuildId,
  onSaveFinals,
  onClose,
}: Props) {
  const hasFirstPlace = finalBuildPlacements.includes(1);
  const [draft, setDraft] = useState<FinalsDraft>(() => ({
    placement: hasFirstPlace ? 1 : finalPlacement === 1 ? null : finalPlacement,
    buildIds: ([1, 2, 3] as const).map((slot) => {
      const build = getBuild(getEffectiveBuildId("finals", 1, slot));
      return build && build["build-type"] !== "plan" ? build.id : "";
    }) as FinalsDraft["buildIds"],
    buildPlacements: [...finalBuildPlacements],
  }));
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    dialog.showModal();
    dialog.focus({ preventScroll: true });
    if (window.scrollX !== scrollX || window.scrollY !== scrollY) {
      window.scrollTo(scrollX, scrollY);
    }
    return () => {
      if (dialog.open) dialog.close?.();
    };
  }, []);

  const canSave =
    (draft.buildPlacements.includes(1)
      ? draft.placement === 1
      : draft.placement === 2 || draft.placement === 3) &&
    draft.buildIds.every((buildId) =>
      buildId === "" || selectableBuilds.some((build) => build.id === buildId),
    ) &&
    draft.buildPlacements.every(
      (placement, index) => placement === null || draft.buildIds[index] !== "",
    ) &&
    !hasDuplicateBaseUmaIds(draft.buildIds.map((buildId) => getBuild(buildId)));

  function updateBuild(index: number, buildId: string) {
    setDraft((current) => {
      const buildIds = current.buildIds.map((id, buildIndex) =>
        buildIndex === index ? buildId : id,
      ) as FinalsDraft["buildIds"];
      const buildPlacements = current.buildPlacements.map((placement, buildIndex) =>
        buildIndex === index ? null : placement,
      ) as FinalsDraft["buildPlacements"];
      return {
        ...current,
        buildIds,
        buildPlacements,
        placement: buildPlacements.includes(1)
          ? 1
          : current.placement === 1
            ? null
            : current.placement,
      };
    });
  }

  function updatePlacement(index: number, placement: TeamUmaPlacement | null) {
    setDraft((current) => {
      const buildPlacements = current.buildPlacements.map((currentPlacement, buildIndex) =>
        buildIndex === index ? placement : currentPlacement,
      ) as FinalsDraft["buildPlacements"];
      return {
        ...current,
        buildPlacements,
        placement: buildPlacements.includes(1)
          ? 1
          : current.placement === 1
            ? null
            : current.placement,
      };
    });
  }

  function save() {
    if (!hasFinalsData && !canAddFinals) return;
    if (!draft.placement || !canSave) return;
    onSaveFinals(
      draft.buildIds.map((buildId) => buildId || null) as InitialTeamBuildIds,
      draft.buildPlacements,
      draft.placement,
    );
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="uma-build-results__dialog"
      aria-labelledby="uma-build-results-finals-heading"
      tabIndex={-1}
      onCancel={onClose}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button
        className="uma-build-results__close"
        type="button"
        aria-label="Close Finals editor"
        onClick={onClose}
      >
        ×
      </button>
      <h2 id="uma-build-results-finals-heading">
        {hasFinalsData ? "Edit Finals results" : "Add Finals results"}
      </h2>
      <div className="uma-build-results__finals-editor">
        <p className="uma-build-results__finals-placement-help">
          Set each Uma's finish from 1st to 9th. Overall Finals placement is
          automatically 1st if any Uma finishes 1st; otherwise choose 2nd or 3rd.
        </p>
        <div className="uma-build-results__placement" role="group" aria-label="Finals placement">
          {([1, 2, 3] as const).map((placement) => (
            <button
              key={placement}
              type="button"
              aria-pressed={draft.placement === placement}
              disabled={placement === 1 || draft.buildPlacements.includes(1)}
              title={placement === 1
                ? "Finals placement is automatically 1st when any selected Uma places 1st"
                : undefined}
              onClick={() => {
                if (placement === 1) return;
                setDraft((current) => ({
                  ...current,
                  placement: current.placement === placement ? null : placement,
                }));
              }}
            >
              {formatUmaPlacement(placement)}
            </button>
          ))}
        </div>
        <div className="uma-build-results__ticket-editor-builds">
          {([1, 2, 3] as const).map((slot, index) => {
            const buildId = draft.buildIds[index];
            const usedBaseUmaIds = new Set(
              draft.buildIds
                .filter((_, otherIndex) => otherIndex !== index)
                .map((id) => getBuild(id))
                .filter((build): build is StoredUmaBuild => build !== undefined)
                .map((build) => getBaseUmaId(build.outfitId))
                .filter(Boolean),
            );
            const choices = selectableBuilds.filter(
              (build) =>
                build.id === buildId ||
                !usedBaseUmaIds.has(getBaseUmaId(build.outfitId)),
            );
            return (
              <div
                className="uma-build-results__ticket-editor-build uma-build-results__finals-editor-build"
                key={slot}
              >
                <BuildSelector
                  slot={slot}
                  buildId={buildId}
                  choices={choices}
                  availableBuilds={availableBuilds}
                  umaList={umaList}
                  ariaLabel={`Choose build for Uma ${slot}`}
                  onChange={(selectedBuildId) => updateBuild(index, selectedBuildId)}
                />
                <label className="uma-build-results__finals-placement-select">
                  Uma placement
                  <select
                    aria-label={`Placement for Uma ${slot}`}
                    value={draft.buildPlacements[index] ?? ""}
                    disabled={!buildId}
                    onChange={(event) => {
                      const value = event.target.value;
                      updatePlacement(
                        index,
                        umaPlacements.find((placement) => String(placement) === value) ?? null,
                      );
                    }}
                  >
                    <option value="">Not recorded</option>
                    {umaPlacements.map((placement) => (
                      <option key={placement} value={placement}>
                        {formatUmaPlacement(placement)}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="uma-build-results__remove-build"
                  type="button"
                  aria-label={`Clear selected build for Uma ${slot}`}
                  disabled={!buildId}
                  onClick={() => updateBuild(index, "")}
                >
                  Clear selected build
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <div className="uma-build-results__ticket-editor-actions">
        <button
          type="button"
          onClick={save}
          disabled={!canSave || (!hasFinalsData && !canAddFinals)}
        >
          Save Finals results
        </button>
        <button type="button" onClick={onClose}>Cancel</button>
      </div>
    </dialog>
  );
}
