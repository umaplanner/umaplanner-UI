import type { TeamUmaPlacement } from "../../../features/planner/plannerTypes";

export const umaPlacements: TeamUmaPlacement[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function formatUmaPlacement(placement: TeamUmaPlacement): string {
  const suffix = placement % 100 >= 11 && placement % 100 <= 13
    ? "th"
    : placement % 10 === 1
      ? "st"
      : placement % 10 === 2
        ? "nd"
        : placement % 10 === 3
          ? "rd"
          : "th";
  return `${placement}${suffix}`;
}

export function formatWinRate(value: number): string {
  return Number(value.toFixed(1)).toString();
}

export function formatResultOpeningDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function clampWins(value: string) {
  const wins = Number(value);
  return Number.isFinite(wins) ? Math.min(5, Math.max(0, Math.trunc(wins))) : 0;
}
