type IconProps = {
  className?: string;
};

type ChevronIconProps = IconProps & {
  direction: "up" | "down";
};

export function CloseIcon({ className }: IconProps) {
  return (
    <svg
      className={`ui-icon ui-icon--close${className ? ` ${className}` : ""}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function SeparatorIcon({ className }: IconProps) {
  return (
    <svg
      className={`ui-icon ui-icon--separator${className ? ` ${className}` : ""}`}
      viewBox="0 0 8 8"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="4" cy="4" r="1.5" />
    </svg>
  );
}

export function ChevronIcon({ className, direction }: ChevronIconProps) {
  return (
    <svg
      className={`ui-icon ui-icon--chevron${className ? ` ${className}` : ""}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d={direction === "up" ? "m6 14 6-6 6 6" : "m6 10 6 6 6-6"} />
    </svg>
  );
}
