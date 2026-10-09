import { useEffect, useState } from "react";
import type { SupportCardBuild, SupportCardEntry, UmaBuild } from "../../../types/UmaBuild";
import SupportCardImage from "../support-cards/Image";

interface SupportCardsProps {
  value: UmaBuild;
  supportCardList: SupportCardEntry[];
  onChange: (value: UmaBuild) => void;
}

const supportCardSlots = 6;

export default function UmaBuildSupportCards({
  value,
  supportCardList,
  onChange,
}: SupportCardsProps) {
  const [activePosition, setActivePosition] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const supportCards = value.supportCards ?? [];
  const activeCard = supportCards.find((card) => card.position === activePosition);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredCards = supportCardList.filter((card) =>
    `${card.title ?? ""} ${card.uma ?? ""} ${card.id}`
      .toLowerCase()
      .includes(normalizedSearch),
  );
  const displayedCards = [...filteredCards].reverse();

  function closePicker() {
    setActivePosition(null);
    setSearch("");
  }

  useEffect(() => {
    if (activePosition === null) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closePicker();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activePosition]);

  useEffect(() => {
    if (activePosition === null) return;

    const rootOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = rootOverflow;
      document.body.style.overflow = bodyOverflow;
    };
  }, [activePosition]);

  function updateSupportCards(nextCards: SupportCardBuild[]) {
    onChange({ ...value, supportCards: nextCards });
  }

  function selectSupportCard(cardId: number) {
    if (activePosition === null) return;

    const previousCard = supportCards.find((card) => card.position === activePosition);
    const nextCard: SupportCardBuild = {
      position: activePosition,
      support_card_id: cardId,
      limit_break_count: previousCard?.limit_break_count ?? 4,
    };
    updateSupportCards([
      ...supportCards.filter((card) => card.position !== activePosition),
      nextCard,
    ].sort((left, right) => left.position - right.position));
    closePicker();
  }

  function updateLimitBreakCount(position: number, limitBreakCount: number) {
    updateSupportCards(supportCards.map((card) =>
      card.position === position ? { ...card, limit_break_count: limitBreakCount } : card,
    ));
  }

  function clearSlot(position: number) {
    updateSupportCards(supportCards.filter((card) => card.position !== position));
    closePicker();
  }

  return (
    <section className="uma-build__panel uma-build__support-cards-editor" aria-labelledby="support-cards-editor-heading">
      <div className="uma-build__section-heading">
        <h4 id="support-cards-editor-heading">Support Cards</h4>
      </div>
      <div className="uma-build__support-card-editor-row">
        {Array.from({ length: supportCardSlots }, (_, position) => {
          const card = supportCards.find((entry) => entry.position === position);
          const cardEntry = card
            ? supportCardList.find((entry) => entry.id === card.support_card_id)
            : undefined;
          const label = cardEntry?.title ?? (card ? `Support card ${card.support_card_id}` : "Empty");

          return (
            <div className="uma-build__support-card-editor-item" key={position}>
              <button
                className="uma-build__support-card-editor-slot"
                type="button"
                aria-label={`Select support card for slot ${position + 1} (${label})`}
                onClick={() => {
                  setActivePosition(position);
                  setSearch("");
                }}
              >
                {card ? (
                  <SupportCardImage
                    cardId={card.support_card_id}
                    className="uma-build__support-card-full"
                    alt=""
                  />
                ) : (
                  <span aria-hidden="true">+</span>
                )}
              </button>
              {card ? (
                <div
                  className="uma-build__support-card-limit-break"
                  role="group"
                  aria-label={`Limit break count for support card slot ${position + 1}`}
                >
                  {[1, 2, 3, 4].map((level) => {
                    const isFull = card.limit_break_count >= level;
                    const nextCount = card.limit_break_count === level
                      ? level - 1
                      : level;
                    return (
                      <button
                        className="uma-build__support-card-limit-break-button"
                        type="button"
                        key={level}
                        aria-label={`Limit break icon ${level} for support card slot ${position + 1}, set to ${nextCount} LB`}
                        aria-pressed={isFull}
                        onClick={() => updateLimitBreakCount(position, nextCount)}
                      >
                        <img
                          src={`/icons/support-card/lb_${isFull ? "full" : "empty"}.png`}
                          alt=""
                        />
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {activePosition !== null ? (
        <div
          className="uma-build__support-cards-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePicker();
          }}
        >
          <section
            className="uma-build__support-cards-dialog"
            role="dialog"
            aria-label={`Select support card for slot ${activePosition + 1}`}
          >
            <header>
              <h3>Select a support card</h3>
              <button type="button" aria-label="Close support card selector" onClick={closePicker}>
                ×
              </button>
            </header>
            <input
              className="uma-build__support-card-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search support cards"
              autoFocus
            />
            {activeCard ? (
              <button
                className="uma-build__support-card-clear"
                type="button"
                onClick={() => clearSlot(activePosition)}
              >
                Clear slot
              </button>
            ) : null}
            <div className="uma-build__support-card-picker">
              {displayedCards.map((card) => (
                <button
                  className="uma-build__support-card-picker-option"
                  type="button"
                  key={card.id}
                  onClick={() => selectSupportCard(card.id)}
                >
                  <SupportCardImage
                    cardId={card.id}
                    variant="icon"
                    alt=""
                    loading="lazy"
                  />
                  {card.uma ? (
                    <span className="uma-build__support-card-picker-name">{card.uma}</span>
                  ) : null}
                  {card.title ? (
                    <small className="uma-build__support-card-picker-title">{card.title}</small>
                  ) : null}
                </button>
              ))}
              {filteredCards.length === 0 ? (
                <p>{supportCardList.length === 0 ? "No support cards available." : "No matching support cards."}</p>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
