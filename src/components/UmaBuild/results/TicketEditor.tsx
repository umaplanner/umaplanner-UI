import { useLayoutEffect, useRef, useState } from "react";
import {
  getBaseUmaId,
  hasDuplicateBaseUmaIds,
  type TeamRaceResultRow,
  type TeamResults,
  type TeamTicket,
  type TeamTicketBuildResult,
  type TeamTicketBuildResults,
  type TeamTicketCount,
  type UmaSlot,
} from "../../../features/planner/plannerTypes";
import type { StoredUmaBuild } from "../../../types/UmaBuild";
import type { UmaEntry } from "../../../types/UmaEntry";
import BuildSelector from "./BuildSelector";
import type {
  EffectiveResultBuildLookup,
  ResultBuildLookup,
  TicketEditor,
} from "./types";
import { clampWins } from "./utils";

interface Props {
  editor: TicketEditor;
  results: TeamResults;
  ticketBuildResults: TeamTicketBuildResults;
  ticketCounts: Record<TeamRaceResultRow, TeamTicketCount>;
  availableBuilds: StoredUmaBuild[];
  selectableBuilds: StoredUmaBuild[];
  umaList: UmaEntry[];
  getBuild: ResultBuildLookup;
  getEffectiveBuildId: EffectiveResultBuildLookup;
  onSaveTicket: (
    row: TeamRaceResultRow,
    ticket: TeamTicket,
    builds: TeamTicketBuildResult[],
    teamWins?: number,
  ) => void;
  canAddTicket: boolean;
  onClose: () => void;
}

export default function TicketEditor({
  editor,
  results,
  ticketBuildResults,
  ticketCounts,
  availableBuilds,
  selectableBuilds,
  umaList,
  getBuild,
  getEffectiveBuildId,
  onSaveTicket,
  canAddTicket,
  onClose,
}: Props) {
  const savedBuildResults = editor.ticket === null
    ? null
    : ticketBuildResults[editor.row]?.[editor.ticket];
  const legacyBuildResults = editor.ticket === null
    ? []
    : savedBuildResults ?? ([1, 2, 3] as const).flatMap((slot) => {
        const buildId = getEffectiveBuildId(editor.row, editor.ticket!, slot);
        return buildId ? [{ buildId, slot, wins: null }] : [];
      });
  const previousTicket = ticketCounts[editor.row] > 0
    ? ticketCounts[editor.row] as TeamTicket
    : 1;
  const previousBuildDraft = editor.ticket === null
    ? ([1, 2, 3] as const).flatMap((slot) => {
        const buildId = getEffectiveBuildId(editor.row, previousTicket, slot);
        const build = getBuild(buildId);
        return buildId && build?.["build-type"] !== "plan"
          ? [{ slot, buildId, wins: 0 }]
          : [];
      }).filter((build, index, builds) =>
        builds.findIndex((candidate) => candidate.buildId === build.buildId) === index
      )
    : [];
  const initialDraft = savedBuildResults
    ? savedBuildResults.map((build) => ({ ...build }))
    : editor.ticket === null
      ? previousBuildDraft.length > 0
        ? previousBuildDraft
        : [{ slot: 1 as const, buildId: "", wins: 0 }]
      : legacyBuildResults.length > 0
        ? legacyBuildResults.map((build) => ({ ...build, wins: 0 }))
        : [{ slot: 1 as const, buildId: "", wins: 0 }];
  const [draft, setDraft] = useState<TeamTicketBuildResult[]>(initialDraft);
  const [isTeamWinsMode, setIsTeamWinsMode] = useState(
    savedBuildResults !== null &&
      savedBuildResults !== undefined &&
      savedBuildResults.length === 0,
  );
  const [teamWins, setTeamWins] = useState(
    editor.ticket === null ? 0 : results[editor.row]?.[editor.ticket - 1] ?? 0,
  );
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const draftWins = draft.reduce((total, build) => total + build.wins, 0);

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

  const canSubmit = isTeamWinsMode
    ? Number.isInteger(teamWins) && teamWins >= 0 && teamWins <= 5
    : draft.length > 0 &&
      draft.length <= 3 &&
      draft.every((build) => build.buildId !== "") &&
      draft.every((build) => getBuild(build.buildId)?.["build-type"] !== "plan") &&
      new Set(draft.map((build) => build.buildId)).size === draft.length &&
      !hasDuplicateBaseUmaIds(draft.map((build) => getBuild(build.buildId))) &&
      draftWins <= 5;

  function addBuild() {
    const usedSlots = new Set(draft.map((build) => build.slot));
    const slot = ([1, 2, 3] as const).find((candidate) => !usedSlots.has(candidate));
    if (!slot || draft.length >= 3) return;
    setDraft((current) => [...current, { slot, buildId: "", wins: 0 }]);
  }

  function submit() {
    if (editor.ticket === null && !canAddTicket) return;
    const ticket = editor.ticket ?? (ticketCounts[editor.row] + 1) as TeamTicket;
    if (isTeamWinsMode) {
      onSaveTicket(editor.row, ticket, [], teamWins);
    } else {
      onSaveTicket(editor.row, ticket, draft);
    }
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="uma-build-results__dialog"
      aria-labelledby="uma-build-results-ticket-heading"
      tabIndex={-1}
      onCancel={onClose}
      onClose={onClose}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button
        className="uma-build-results__close"
        type="button"
        aria-label="Close ticket editor"
        onClick={onClose}
      >
        ×
      </button>
      <h2 id="uma-build-results-ticket-heading">
        {editor.ticket === null ? "Add" : "Edit"} ticket — {editor.groupTitle} {editor.label}
      </h2>
      {editor.ticket !== null && !ticketBuildResults[editor.row]?.[editor.ticket] ? (
        <p className="uma-build-results__legacy-ticket-note" role="status">
          This older ticket has no per-build win breakdown. Enter wins for
          each build to replace its saved result.
        </p>
      ) : null}
      <label className="uma-build-results__team-wins-toggle">
        <input
          type="checkbox"
          checked={isTeamWinsMode}
          onChange={(event) => {
            const teamMode = event.target.checked;
            setIsTeamWinsMode(teamMode);
            if (!teamMode && draft.length === 0) {
              setDraft([{ slot: 1, buildId: "", wins: 0 }]);
            }
          }}
        />
        Record team wins instead of per-build wins
      </label>
      {isTeamWinsMode ? (
        <div className="uma-build-results__team-wins-input">
          <label>
            Team wins
            <input
              aria-label="Team wins"
              type="number"
              min={0}
              max={5}
              step={1}
              value={teamWins}
              onChange={(event) => setTeamWins(clampWins(event.target.value))}
            />
          </label>
        </div>
      ) : (
        <div className="uma-build-results__ticket-editor-builds">
          {draft.map((buildDraft, index) => {
            const chosenBuild = getBuild(buildDraft.buildId);
            const otherWins = draftWins - buildDraft.wins;
            const maxWins = Math.max(0, 5 - otherWins);
            const selectedElsewhere = new Set(
              draft
                .filter((_, otherIndex) => otherIndex !== index)
                .map((build) => getBuild(build.buildId))
                .filter((build): build is StoredUmaBuild => build !== undefined)
                .map((build) => getBaseUmaId(build.outfitId))
                .filter(Boolean),
            );
            const choices = selectableBuilds.filter(
              (build) => !selectedElsewhere.has(getBaseUmaId(build.outfitId)),
            );
            return (
              <div className="uma-build-results__ticket-editor-build" key={buildDraft.slot}>
                <BuildSelector
                  slot={buildDraft.slot as UmaSlot}
                  buildId={buildDraft.buildId}
                  choices={choices}
                  availableBuilds={availableBuilds}
                  umaList={umaList}
                  ariaLabel={`Choose build for Uma ${buildDraft.slot}`}
                  onChange={(buildId) =>
                    setDraft((current) =>
                      current.map((build, buildIndex) =>
                        buildIndex === index ? { ...build, buildId } : build,
                      ))}
                />
                <label>
                  Wins
                  <input
                    aria-label={`Wins for ${chosenBuild?.name || `Uma ${buildDraft.slot}`}`}
                    type="number"
                    min={0}
                    max={maxWins}
                    step={1}
                    value={buildDraft.wins}
                    onChange={(event) => {
                      const wins = Math.min(maxWins, clampWins(event.target.value));
                      setDraft((current) =>
                        current.map((build, buildIndex) =>
                          buildIndex === index ? { ...build, wins } : build,
                        ));
                    }}
                  />
                </label>
                <button
                  className="uma-build-results__remove-build"
                  type="button"
                  aria-label={`Remove Uma ${buildDraft.slot} build`}
                  onClick={() =>
                    setDraft((current) =>
                      current.filter((_, buildIndex) => buildIndex !== index))}
                >
                  Remove
                </button>
              </div>
            );
          })}
          {editor.ticket === null ? (
            <button
              className="uma-build-results__add-build-button"
              type="button"
              disabled={
                draft.length >= 3 ||
                !selectableBuilds.some((build) => {
                  const baseId = getBaseUmaId(build.outfitId);
                  return !draft.some(
                    (buildDraft) =>
                      getBaseUmaId(getBuild(buildDraft.buildId)?.outfitId ?? "") === baseId,
                  );
                })
              }
              onClick={addBuild}
            >
              Add build
            </button>
          ) : null}
        </div>
      )}
      <p className="uma-build-results__ticket-wins-total" aria-live="polite">
        Total wins: {isTeamWinsMode ? teamWins : draftWins}/5
      </p>
      <div className="uma-build-results__ticket-editor-actions">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit || (editor.ticket === null &&
            (!canAddTicket || ticketCounts[editor.row] >= 4))}
        >
          {editor.ticket === null ? "Submit ticket" : "Save ticket"}
        </button>
        <button type="button" onClick={onClose}>Cancel</button>
      </div>
    </dialog>
  );
}
