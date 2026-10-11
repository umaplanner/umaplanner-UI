import { useEffect, useRef, useState } from "react";
import type { StoredUmaBuild } from "../../../types/UmaBuild";
import type { UmaEntry } from "../../../types/UmaEntry";
import UmaImage from "../../UmaImage";
import { sortBuildsNewestFirst } from "../utils";

interface Props {
  teamNumber: number;
  builds: StoredUmaBuild[];
  umaList: UmaEntry[];
  canClear: boolean;
  onSelect: (id: string | null) => void;
  onClose: () => void;
  title?: string;
  nativeModal?: boolean;
}

export default function UmaBuildSavedBuildDialog({
  teamNumber,
  builds,
  umaList,
  canClear,
  onSelect,
  onClose,
  title = "Swap to a saved build",
  nativeModal = false,
}: Props) {
  const [search, setSearch] = useState("");
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (nativeModal) {
      const dialog = dialogRef.current;
      if (!dialog) return;
      dialog.showModal();
      return () => {
        if (dialog.open) dialog.close();
      };
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [nativeModal]);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredBuilds = sortBuildsNewestFirst(builds).filter((build) => {
    const uma = umaList.find((entry) => String(entry.id) === build.outfitId);
    return Boolean(uma) &&
      `${build.name} ${uma?.outfitTitle ?? ""} ${uma?.baseCharacterName ?? ""}`
        .toLowerCase()
        .includes(normalizedSearch);
  });

  const content = (
    <>
      <header className="uma-select__popup-header">
        <div>
          <span className="uma-select__popup-kicker">Saved builds</span>
          <h2 id={`saved-builds-heading-${teamNumber}`}>{title}</h2>
        </div>
        <button className="uma-select__close" type="button" aria-label="Close saved builds" onClick={onClose}>
          ×
        </button>
      </header>
      {canClear ? (
        <button
          className="uma-build__saved-build-clear"
          type="button"
          onClick={() => {
            onSelect(null);
            onClose();
          }}
        >
          Clear selected build
        </button>
      ) : null}
      <input
        className="uma-select__search"
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by build, outfit, or character"
        autoFocus
      />
      {filteredBuilds.length === 0 ? (
        <p className="uma-build__no-saved-builds" role="status">
          No saved builds match this selection.
        </p>
      ) : (
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
          })}
        </div>
      )}
    </>
  );

  return nativeModal ? (
    <dialog
      ref={dialogRef}
      className="uma-select__popup uma-build__saved-builds"
      aria-modal="true"
      aria-labelledby={`saved-builds-heading-${teamNumber}`}
      onCancel={onClose}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {content}
    </dialog>
  ) : (
    <div
      className="uma-select__backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="uma-select__popup uma-build__saved-builds"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`saved-builds-heading-${teamNumber}`}
      >
        {content}
      </section>
    </div>
  );
}
