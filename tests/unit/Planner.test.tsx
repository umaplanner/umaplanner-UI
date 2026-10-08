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
    const teamState = mocks.useTeam();
    mocks.useTeam.mockImplementation((event: string | null) => ({
      ...teamState,
      isTeamLoading: event === "CM 43",
    }));
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

    const buildArea = screen.getByRole("region", { name: "Build selected Uma" });
    expect(buildArea).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Show support cards")).toBeInTheDocument();
    expect(buildArea).toHaveAttribute("inert");
    expect(screen.getByRole("button", { name: "Results" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Team" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("saves a loaded build as an override until its Uma changes", async () => {
    localStorage.setItem("selectedEvent", "CM 42");
    const user = userEvent.setup();
    const oldUniqueSkill = {
      id: "100001",
      name: "Old unique",
      groupId: null,
      iconId: 1,
      isGeneralSkill: false,
      displayOrder: 0,
      rarity: 1,
    };
    const newUniqueSkill = { ...oldUniqueSkill, id: "100002", name: "New unique" };
    const ordinarySkill = {
      id: "30001",
      name: "Ordinary",
      groupId: null,
      iconId: 2,
      isGeneralSkill: true,
      displayOrder: 1,
      rarity: 1,
    };
    const oldUma = {
      id: 100101,
      charaId: 1,
      baseCharacterName: "Old Uma",
      outfitTitle: "Old Outfit",
      uniqueSkillId: 100001,
    };
    const newUma = {
      id: 100201,
      charaId: 2,
      baseCharacterName: "New Uma",
      outfitTitle: "New Outfit",
      uniqueSkillId: 100002,
    };
    const savedBuild = {
      ...createDefaultBuild(String(oldUma.id)),
      id: "build-1",
      event: "CM 42",
      name: "Saved build",
      lastUpdate: 1,
      skills: [oldUniqueSkill.id, ordinarySkill.id],
      forcedSkillPositions: { [oldUniqueSkill.id]: 0 },
    };
    const saveBuild = vi.fn();
    mocks.usePlannerData.mockReturnValue({
      raceEntry: { eventTitle: "CM 42" },
      umaList: [oldUma, newUma],
      skillList: [oldUniqueSkill, newUniqueSkill, ordinarySkill],
    });
    mocks.useTeam.mockReturnValue({
      umas: {
        event: "CM 42",
        uma1: null,
        uma2: null,
        uma3: null,
        lastUpdate: 0,
        uma1Build: createDefaultBuild(),
        uma2Build: createDefaultBuild(),
        uma3Build: createDefaultBuild(),
        uma1BuildName: "",
        uma2BuildName: "",
        uma3BuildName: "",
      },
      allBuilds: [
        savedBuild,
        { ...savedBuild, id: "build-old-uma", name: "Old Uma" },
        { ...savedBuild, id: "build-old-uma-2", name: "Old Uma 2" },
      ],
      eventResults: {},
      isTeamLoading: false,
      saveBuild,
      swapTeamBuild: vi.fn(),
      saveTicketResult: vi.fn(),
      removeTicketResult: vi.fn(),
      updateResultRoundExcluded: vi.fn(),
      saveFinalsResult: vi.fn(),
    });

    render(
      <EventProvider>
        <Planner />
      </EventProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Load" }));
    await user.click(screen.getByRole("button", { name: /Saved build/ }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("textbox", { name: "Build name" })).toBeDisabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Override" }));
    expect(saveBuild).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ outfitId: String(oldUma.id) }),
      "Saved build",
      "build-1",
    );

    await user.click(screen.getByRole("button", { name: "Select an Uma for team 1" }));
    await user.click(screen.getByRole("button", { name: /New Outfit/ }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(saveBuild).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        outfitId: String(newUma.id),
        skills: expect.arrayContaining([newUniqueSkill.id, ordinarySkill.id]),
      }),
      newUma.baseCharacterName,
      expect.stringMatching(/^[0-9a-f-]{36}$/i),
    );
    expect(saveBuild.mock.calls[1][0].skills).not.toContain(oldUniqueSkill.id);

    await user.click(screen.getByRole("button", { name: "Copy" }));
    await user.click(screen.getByRole("button", { name: /Saved build/ }));
    expect(saveBuild).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole("button", { name: "Save" }));
    const copiedNameInput = screen.getByRole("textbox", { name: "Build name" });
    expect(copiedNameInput).toBeEnabled();
    expect(copiedNameInput).toHaveValue("");
    expect(copiedNameInput).toHaveAttribute("placeholder", "Old Uma");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(saveBuild).toHaveBeenCalledTimes(3);
    expect(saveBuild.mock.calls[2][1]).toBe("Old Uma 3");
    expect(saveBuild.mock.calls[2][2]).toMatch(/^[0-9a-f-]{36}$/i);
    expect(saveBuild.mock.calls[2][2]).not.toBe(savedBuild.id);
  });
});
