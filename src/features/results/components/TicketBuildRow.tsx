import type { StoredUmaBuild } from "../../../types/UmaBuild";
import type { UmaEntry } from "../../../types/UmaEntry";
import type { ResolvedTicketBuildResult } from "../domain/types";
import {
  getBaseUmaId,
  type TeamTicket,
} from "../domain/resultsTypes";
import BuildSelector from "../ResultsBuildSelector";
import TicketWinStepper from "./TicketWinStepper";

interface Props {
  row: "round1Day1" | "round1Day2" | "round2Day1" | "round2Day2";
  ticket: TeamTicket;
  builds: ResolvedTicketBuildResult[];
  ticketBuild: ResolvedTicketBuildResult;
  isEditing: boolean;
  availableBuilds: StoredUmaBuild[];
  umaList: UmaEntry[];
  getBuild: (buildId: string | null) => StoredUmaBuild | undefined;
  onSaveTicket: (
    row: Props["row"],
    ticket: TeamTicket,
    builds: { buildId: string; slot: 1 | 2 | 3; wins: number }[],
  ) => void;
}

export default function TicketBuildRow({
  row,
  ticket,
  builds,
  ticketBuild,
  isEditing,
  availableBuilds,
  umaList,
  getBuild,
  onSaveTicket,
}: Props) {
  const build = getBuild(ticketBuild.buildId || null);
  const buildName = build?.name || `Uma ${ticketBuild.slot}`;
  const usedBaseUmaIds = new Set(
    builds
      .filter((entry) => entry.slot !== ticketBuild.slot)
      .map((entry) => getBuild(entry.buildId))
      .filter((entry): entry is StoredUmaBuild => entry !== undefined)
      .map((entry) => getBaseUmaId(entry.outfitId))
      .filter(Boolean),
  );
  const choices = availableBuilds.filter(
    (entry) =>
      entry.id === ticketBuild.buildId ||
      !usedBaseUmaIds.has(getBaseUmaId(entry.outfitId)),
  );

  function saveBuilds(nextBuilds: typeof builds) {
    onSaveTicket(
      row,
      ticket,
      nextBuilds.flatMap((entry) =>
        entry.buildId
          ? [{
            buildId: entry.buildId,
            slot: entry.slot,
            wins: entry.wins ?? 0,
          }]
          : []
      ),
    );
  }

  function updateWins(delta: number) {
    const nextBuilds = builds
      .filter((entry) => entry.buildId)
      .map((entry) => ({
        buildId: entry.buildId,
        slot: entry.slot,
        wins: entry.wins ?? 0,
      }));
    const current = nextBuilds.find((entry) => entry.slot === ticketBuild.slot);
    if (current) current.wins += delta;
    onSaveTicket(row, ticket, nextBuilds);
  }

  return (
    <li key={`${ticketBuild.slot}:${ticketBuild.buildId}`}>
      <div className="uma-build-results__ticket-build-entry">
        <BuildSelector
          slot={ticketBuild.slot}
          buildId={ticketBuild.buildId}
          compact
          disabled={!isEditing}
          nativeModal={false}
          choices={choices}
          availableBuilds={availableBuilds}
          umaList={umaList}
          ariaLabel={`Choose build for Uma ${ticketBuild.slot} on Ticket ${ticket}`}
          title="Swap to a saved build"
          onChange={(buildId) => {
            const nextBuilds = builds.flatMap((entry) => {
              const nextId = entry.slot === ticketBuild.slot ? buildId : entry.buildId;
              return nextId
                ? [{
                  buildId: nextId,
                  slot: entry.slot,
                  wins: entry.slot === ticketBuild.slot ? 0 : entry.wins ?? 0,
                }]
                : [];
            });
            saveBuilds(nextBuilds);
          }}
        />
        {ticketBuild.buildId ? (
          <TicketWinStepper
            wins={ticketBuild.wins ?? 0}
            disabledDecrease={(ticketBuild.wins ?? 0) <= 0}
            disabledIncrease={builds.reduce((total, entry) => total + (entry.wins ?? 0), 0) >= 5}
            decreaseLabel={`Decrease wins for ${buildName} on Ticket ${ticket}`}
            increaseLabel={`Increase wins for ${buildName} on Ticket ${ticket}`}
            onDecrease={() => updateWins(-1)}
            onIncrease={() => updateWins(1)}
          />
        ) : null}
      </div>
    </li>
  );
}
