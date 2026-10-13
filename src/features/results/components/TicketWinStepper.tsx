interface Props {
  wins: number;
  disabledDecrease: boolean;
  disabledIncrease: boolean;
  decreaseLabel: string;
  increaseLabel: string;
  onDecrease: () => void;
  onIncrease: () => void;
}

export default function TicketWinStepper({
  wins,
  disabledDecrease,
  disabledIncrease,
  decreaseLabel,
  increaseLabel,
  onDecrease,
  onIncrease,
}: Props) {
  return (
    <span className="uma-build-results__win-stepper">
      <small>{wins} {wins === 1 ? "win" : "wins"}</small>
      <button
        type="button"
        aria-label={decreaseLabel}
        disabled={disabledDecrease}
        onClick={onDecrease}
      >
        −
      </button>
      <button
        type="button"
        aria-label={increaseLabel}
        disabled={disabledIncrease}
        onClick={onIncrease}
      >
        +
      </button>
    </span>
  );
}
