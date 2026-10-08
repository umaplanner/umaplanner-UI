import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventProvider, useEvent } from "../../src/contexts/EventContext";
import Planner from "../../src/features/planner/Planner";
import { createDefaultBuild } from "../../src/features/planner/plannerTypes";

const mocks = vi.hoisted(() => ({
  usePlannerData: vi.fn(),
  useTeam: vi.fn(),
  getResultAvailability: vi.fn(),
  getNextResultOpeningAt: vi.fn(),
}));

vi.mock("../../src/features/planner/usePlannerData", () => ({
  usePlannerData: mocks.usePlannerData,
}));

vi.mock("../../src/features/planner/useTeam", () => ({
  useTeam: mocks.useTeam,
}));

vi.mock("../../src/features/planner/resultSchedule", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/features/planner/resultSchedule")>();
  return {
    ...actual,
    getResultAvailability: mocks.getResultAvailability,
    getNextResultOpeningAt: mocks.getNextResultOpeningAt,
  };
});

vi.mock("../../src/components/RaceDisplay", () => ({
  default: () => null,
}));

vi.mock("../../src/components/UmaBuild/results/Results", () => ({
  default: () => null,
}));

function SwitchEventButton() {
  const { setSelectedEvent } = useEvent();
  return (
    <button type="button" onClick={() => setSelectedEvent("CM 43")}>
      Switch event
    </button>
  );
}

describe("Planner build mode", () => {
  beforeEach(() => {
    const emptyBuild = createDefaultBuild();
    mocks.usePlannerData.mockImplementation((event: string) => ({
      raceEntry: event ? { eventTitle: event } : undefined,
      umaList: [],
      skillList: [],
    }));
    mocks.useTeam.mockReturnValue({
      umas: {
        event: "CM 42",
        uma1: null,
        uma2: null,
        uma3: null,
        lastUpdate: 0,
        uma1Build: emptyBuild,
        uma2Build: emptyBuild,
        uma3Build: emptyBuild,
        uma1BuildName: "",
        uma2BuildName: "",
        uma3BuildName: "",
      },
      allBuilds: [],
      eventResults: {},
      saveBuild: vi.fn(),
      swapTeamBuild: vi.fn(),
      saveTicketResult: vi.fn(),
      removeTicketResult: vi.fn(),
      updateResultRoundExcluded: vi.fn(),
      saveFinalsResult: vi.fn(),
    });
    mocks.getResultAvailability.mockImplementation((raceEntry) => ({
      round1Day1: raceEntry?.eventTitle === "CM 43",
    }));
    mocks.getNextResultOpeningAt.mockReturnValue(null);
  });

  it("does not switch to Results when the selected event changes", async () => {
    localStorage.setItem("selectedEvent", "CM 42");
    const user = userEvent.setup();

    render(
      <EventProvider>
        <SwitchEventButton />
        <Planner />
      </EventProvider>,
    );

    expect(screen.getByRole("button", { name: "Team" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Switch event" }));

    expect(screen.getByRole("button", { name: "Results" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Team" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
