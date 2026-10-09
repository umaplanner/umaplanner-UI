import { useId, useState } from "react";

export default function InfoTooltip({ label, text }: { label: string; text: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span className={`overview-info-tooltip${isOpen ? " is-open" : ""}`}>
      <button
        className="overview-info-tooltip__button"
        type="button"
        aria-label={label}
        aria-describedby={tooltipId}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((previous) => !previous)}
        onBlur={() => setIsOpen(false)}
      >
        <span aria-hidden="true">i</span>
      </button>
      <span className="overview-info-tooltip__content" id={tooltipId} role="tooltip">
        {text}
      </span>
    </span>
  );
}
