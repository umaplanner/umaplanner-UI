import { useEffect, useState } from "react";
import type { UmaEntry } from "../types/UmaEntry";
import "../styles/UmaSelect.css";

interface UmaSelectProps {
  teamNumber: number;
  umaList: UmaEntry[];
  value: UmaEntry | null;
  onChange: (selected: UmaEntry | null) => void;
  className?: string;
}

export default function UmaSelect({
  teamNumber,
  umaList,
  value,
  onChange,
  className,
}: UmaSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  function closePopup() {
    setSearch("");
    setIsOpen(false);
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closePopup();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredUmas = umaList.filter((uma) =>
    `${uma.outfitTitle} ${uma.baseCharacterName}`
      .toLowerCase()
      .includes(normalizedSearch),
  );

  function handleSelect(uma: UmaEntry) {
    onChange(uma);
    closePopup();
  }

  return (
    <>
      <label className={`uma-select-label ${className ?? ""}`.trim()}>
        Uma {teamNumber}:

        <button
          className="uma-select__trigger"
          type="button"
          aria-label={`Select an Uma for team ${teamNumber}`}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          onClick={() => setIsOpen(true)}
        >
          {value ? (
            <>
              <img src="/kita.webp" alt="" />
              <span>
                <strong>{value.outfitTitle}</strong>
                <small>{value.baseCharacterName}</small>
              </span>
            </>
          ) : (
            <span className="uma-select__trigger-placeholder">
              Select an Uma
            </span>
          )}
        </button>
      </label>

      {isOpen && (
        <div
          className="uma-select__backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closePopup();
            }
          }}
        >
          <section
            className="uma-select__popup"
            role="dialog"
            aria-label={`Select Uma ${teamNumber}`}
          >
            <header className="uma-select__popup-header">
              <div>
                <span className="uma-select__popup-kicker">Team {teamNumber}</span>
                <h2>Select an Uma</h2>
              </div>
              <button
                className="uma-select__close"
                type="button"
                aria-label="Close Uma selector"
                onClick={closePopup}
              >
                ×
              </button>
            </header>

            <input
              className="uma-select__search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by outfit or character"
              autoFocus
            />

            <div className="uma-select__popup-grid">
              {filteredUmas.map((uma) => (
                <button
                  className="uma-select__option"
                  type="button"
                  key={uma.id}
                  onClick={() => handleSelect(uma)}
                >
                  <img
                    className="uma-select__option-image"
                    src="/kita.webp"
                    alt={`${uma.baseCharacterName} placeholder`}
                  />
                  <span className="uma-select__option-outfit">
                    {uma.outfitTitle}
                  </span>
                  <span className="uma-select__option-character">
                    {uma.baseCharacterName}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
