import type { StoredUmaBuild } from "../../types/UmaBuild";
import type { UmaEntry } from "../../types/UmaEntry";
import UmaImage from "../UmaImage";
import { sortBuildsNewestFirst } from "./umaBuildUtils";

interface Props {
  teamNumber: number;
  builds: StoredUmaBuild[];
  umaList: UmaEntry[];
  onSelect: (id: string) => void;
  onClose: () => void;
}

export default function UmaBuildSavedBuildDialog({ teamNumber, builds, umaList, onSelect, onClose }: Props) {
  return (
    <div
      className="uma-build__saved-builds-backdrop" 
      role="presentation" 
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
    <section 
      className="uma-build__saved-builds" 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby={`saved-builds-heading-${teamNumber}`}
    >
      <header>
        <h4 id={`saved-builds-heading-${teamNumber}`}>
          Swap to a saved build
        </h4>
        <button type="button" aria-label="Close saved builds" onClick={onClose}>
          ×
        </button>
      </header>
      <div>
        {sortBuildsNewestFirst(builds).map((build) => {
          const uma = umaList.find((entry) => String(entry.id) === build.outfitId);
          return uma ? <button type="button" key={build.id} onClick={() => { onSelect(build.id); onClose(); }}>
          <UmaImage uma={uma} alt="" />
          <span>
            <strong>{build.name || "Unnamed build"}</strong>
            <small>{uma.outfitTitle}</small>
            <small>{uma.baseCharacterName}</small>
            <small>Surface {build.surfaceAptitude} · Distance {build.distanceAptitude} · Style {build.strategyAptitude}</small>
            <small>Speed {build.speed} · Stamina {build.stamina} · Power {build.power} · Guts {build.guts} · Wisdom {build.wisdom}</small>
          </span>
          </button> : null;
          })
        }
      </div>
    </section>
    </div>
  );
}
