import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RaceDisplay from "../../src/components/RaceDisplay";
import type { RaceEntry } from "../../src/types/RaceEntry";

const race: RaceEntry = {
  eventTitle: "CM 42",
  name: "Turf Champion Meeting",
  distanceType: "Medium",
  groundType: "Turf",
  racecourse: "Tokyo",
  distance: 2400,
  groundCondition: "Firm",
  direction: "Right",
  season: "Summer",
  weather: "Sunny",
  releaseDate: "2026-07-14T00:00:00.000Z",
  isConfirmed: true,
};

describe("RaceDisplay", () => {
  it("renders nothing without race data", () => {
    const { container } = render(<RaceDisplay />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders race details and official status", () => {
    render(<RaceDisplay raceEntry={race} />);

    expect(screen.getByRole("heading", { name: race.name })).toBeInTheDocument();
    expect(screen.getByText(race.eventTitle)).toBeInTheDocument();
    expect(screen.getByText("Official")).toBeInTheDocument();
    expect(screen.getByText(race.racecourse)).toBeInTheDocument();
    expect(screen.getByText("2400m")).toBeInTheDocument();
    expect(screen.getByText(race.weather)).toBeInTheDocument();
  });

  it("marks unconfirmed race dates as estimated", () => {
    render(
      <RaceDisplay
        raceEntry={{
          ...race,
          isConfirmed: false,
        }}
      />,
    );

    expect(screen.getByText("Estimated")).toBeInTheDocument();
  });
});
