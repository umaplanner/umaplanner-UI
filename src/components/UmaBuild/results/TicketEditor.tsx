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
  const previousTicket = ticketCounts[editor.row] > 0
    ? ticketCounts[editor.row] as TeamTicket
    : 1;
  const initialDraft = ([1, 2, 3] as const).map((slot) => {
    const savedBuild = savedBuildResults?.find((build) => build.slot === slot);
    const buildId = savedBuild?.buildId ??
      getEffectiveBuildId(editor.row, editor.ticket ?? previousTicket, slot);
    const build = getBuild(buildId);
    return {
      slot,
      buildId: build?.["build-type"] !== "plan" ? build?.id ?? "" : "",
      wins: savedBuild?.wins ?? 0,
    };
  });
  const [draft, setDraft] = useState<TeamTicketBuildResult[]>(initialDraft);
  const [isTeamWinsMode, setIsTeamWinsMode] = useState(
    savedBuildResults?.length === 0,
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

  const hasValidLineup =
    draft.length === 3 &&
    draft.every((build) =>
      build.buildId !== "" &&
      getBuild(build.buildId)?.["build-type"] !== "plan"
    ) &&
    new Set(draft.map((build) => build.buildId)).size === 3 &&
    !hasDuplicateBaseUmaIds(draft.map((build) => getBuild(build.buildId)));
  const canSubmit = hasValidLineup && (isTeamWinsMode
    ? Number.isInteger(teamWins) && teamWins >= 0 && teamWins <= 5
    : draftWins <= 5);

  function submit() {
    if (editor.ticket === null && !canAddTicket) return;
    const ticket = editor.ticket ?? (ticketCounts[editor.row] + 1) as TeamTicket;
    if (isTeamWinsMode) {
      onSaveTicket(
        editor.row,
        ticket,
        draft.map((build) => ({ ...build, wins: 0 })),
        teamWins,
      );
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
          onChange={(event) => setIsTeamWinsMode(event.target.checked)}
        />
        I know the team wins, but not which builds got them
      </label>
      {isTeamWinsMode ? (
        <div className="uma-build-results__team-wins-input">
          <p>Record all three builds in the lineup, then enter the team's total wins.</p>
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
      ) : null}
      <div className="uma-build-results__ticket-editor-builds">
        {draft.map((buildDraft, index) => {
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
            <div
              className={`uma-build-results__ticket-editor-build${isTeamWinsMode ? " uma-build-results__ticket-editor-build--team-wins" : ""}`}
              key={buildDraft.slot}
            >
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
              {!isTeamWinsMode ? (
                <label>
                  Wins
                  <input
                    aria-label={`Wins for ${getBuild(buildDraft.buildId)?.name || `Uma ${buildDraft.slot}`}`}
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
              ) : null}
            </div>
          );
        })}
      </div>
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
