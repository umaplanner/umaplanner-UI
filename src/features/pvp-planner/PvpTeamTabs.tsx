import UmaImage from "../../components/UmaImage";
import type { UmaEntry } from "../../types/UmaEntry";
import type { EventTeam, UmaSlot } from "./pvpPlannerTypes";

interface PvpTeamTabsProps {
  umas: EventTeam;
  umaList: UmaEntry[];
  activeBuild: UmaSlot;
  onSelect: (teamNumber: UmaSlot) => void;
}

export default function PvpTeamTabs({
  umas,
  umaList,
  activeBuild,
  onSelect,
}: PvpTeamTabsProps) {
  return (
    <nav className="uma-selection" aria-label="Uma selections">
      {([1, 2, 3] as const).map((teamNumber) => {
        const selectedUmaId = umas[`uma${teamNumber}`];
        const selectedUma = selectedUmaId === null
          ? null
          : umaList.find((uma) => uma.id === selectedUmaId) ?? null;

        return (
          <button
            className={`uma-selection__tab ${activeBuild === teamNumber ? "uma-selection__tab--active" : ""}`}
            key={teamNumber}
            type="button"
            aria-pressed={activeBuild === teamNumber}
            onClick={() => onSelect(teamNumber)}
          >
            {selectedUma ? (
              <>
                <UmaImage uma={selectedUma} alt="" />
                <span>
                  <strong>{selectedUma.outfitTitle}</strong>
                  <small>{selectedUma.baseCharacterName}</small>
                </span>
              </>
            ) : (
              <span>Uma {teamNumber}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
