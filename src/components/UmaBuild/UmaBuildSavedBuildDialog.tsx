import { useEffect, useState } from "react";
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
  const [search, setSearch] = useState("");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredBuilds = sortBuildsNewestFirst(builds).filter((build) => {
    const uma = umaList.find((entry) => String(entry.id) === build.outfitId);
    return `${build.name} ${uma?.outfitTitle ?? ""} ${uma?.baseCharacterName ?? ""}`
      .toLowerCase()
      .includes(normalizedSearch);
  });

  return (
    <div
      className="uma-select__backdrop"
      role="presentation" 
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
    <section
      className="uma-select__popup uma-build__saved-builds"
      role="dialog" 
      aria-modal="true" 
      aria-labelledby={`saved-builds-heading-${teamNumber}`}
    >
      <header className="uma-select__popup-header">
        <div>
          <span className="uma-select__popup-kicker">Saved builds</span>
          <h2 id={`saved-builds-heading-${teamNumber}`}>Swap to a saved build</h2>
        </div>
        <button className="uma-select__close" type="button" aria-label="Close saved builds" onClick={onClose}>
          ×
        </button>
      </header>
      <input
        className="uma-select__search"
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by build, outfit, or character"
        autoFocus
      />
      <div className="uma-build__saved-builds-grid">
        {filteredBuilds.map((build) => {
          const uma = umaList.find((entry) => String(entry.id) === build.outfitId);
          return uma ? (
            <button
              className="uma-build__saved-build-card"
              type="button"
              key={build.id}
              onClick={() => { onSelect(build.id); onClose(); }}
            >
              <UmaImage uma={uma} alt="" />
              <span>
                <strong>{build.name || "Unnamed build"}</strong>
                <small>{uma.outfitTitle}</small>
                <small>{uma.baseCharacterName}</small>
                <small>Surface {build.surfaceAptitude} · Distance {build.distanceAptitude} · Style {build.strategyAptitude}</small>
                <small>Speed {build.speed} · Stamina {build.stamina} · Power {build.power} · Guts {build.guts} · Wisdom {build.wisdom}</small>
              </span>
            </button>
          ) : null;
          })
        }
      </div>
    </section>
    </div>
  );
}
