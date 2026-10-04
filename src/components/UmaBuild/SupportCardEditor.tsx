import { useState } from "react";
import type { UmaBuild, SupportCardBuild, SupportCardEntry } from "../../types/UmaBuild";
import { config } from "../../lib/config";
import "../../styles/UmaSelect.css";
import "../../styles/UmaBuild.css";

interface SupportCardEditorProps {
  value: UmaBuild;
  onChange: (value: UmaBuild) => void;
  supportCardList: SupportCardEntry[];
}

export default function SupportCardEditor({
  value,
  onChange,
  supportCardList,
}: SupportCardEditorProps) {
  const [supportCardPosition, setSupportCardPosition] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  function updateSupportCard(position: number, supportCardId: number) {
    const cards = [...(value.supportCards ?? [])];
    const index = cards.findIndex((card) => card.position === position);
    const updated: SupportCardBuild = {
      position,
      support_card_id: supportCardId,
      limit_break_count: cards[index]?.limit_break_count ?? 0,
    };
    if (index === -1) {
      cards.push(updated);
    } else {
      cards[index] = updated;
    }
    onChange({
      ...value,
      supportCards: cards.sort((left, right) => left.position - right.position),
    });
  }

  const cards = supportCardList.length > 0
    ? supportCardList
    : (value.supportCards ?? []).map((card) => ({ id: card.support_card_id, name: undefined }));
  const normalizedSearch = search.trim().toLowerCase();
  const filteredCards = cards.filter((card) =>
    `${card.id} ${card.name ?? ""}`.toLowerCase().includes(normalizedSearch)
  );

  return (
    <>
      <div className="uma-build__support-card-editor-row" aria-label="Support cards">
        {Array.from({ length: 6 }, (_, index) => {
          const position = index + 1;
          const card = value.supportCards?.find((entry) => entry.position === position);
          return (
            <button
              className="uma-build__support-card-editor-slot"
              type="button"
              key={position}
              aria-label={`Select support card slot ${position}`}
              onClick={() => setSupportCardPosition(position)}
            >
              {card?.support_card_id ? (
                <img
                  src={`${config.r2BaseUrl}/images/support_cards/full/${card.support_card_id}.png`}
                  alt=""
                />
              ) : <span>+</span>}
            </button>
          );
        })}
      </div>
      {supportCardPosition !== null ? (
        <div
          className="uma-select__backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSupportCardPosition(null);
          }}
        >
          <section className="uma-select__popup" role="dialog" aria-label="Select support card">
            <header className="uma-select__popup-header">
              <div>
                <span className="uma-select__popup-kicker">Support cards</span>
                <h2>Select a support card</h2>
              </div>
              <button
                className="uma-select__close"
                type="button"
                aria-label="Close support card selector"
                onClick={() => setSupportCardPosition(null)}
              >
                ×
              </button>
            </header>
            <input
              className="uma-select__search"
              type="search"
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search support cards"
            />
            <div className="uma-select__popup-grid">
              {filteredCards.map((card) => (
                <button
                  className="uma-select__option"
                  type="button"
                  key={card.id}
                  onClick={() => {
                    updateSupportCard(supportCardPosition, card.id);
                    setSupportCardPosition(null);
                    setSearch("");
                  }}
                >
                  <img
                    className="uma-select__option-image uma-build__support-card-icon"
                    src={`${config.r2BaseUrl}/images/support_cards/icon/${card.id}.webp`}
                    alt=""
                  />
                  <span className="uma-select__option-outfit">{card.name ?? card.id}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
