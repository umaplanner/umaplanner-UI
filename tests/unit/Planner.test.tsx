import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventProvider, useEvent } from "../../src/contexts/EventContext";
import Planner from "../../src/features/planner/Planner";
import { createDefaultBuild } from "../../src/features/planner/domain/types";

const mocks = vi.hoisted(() => ({
  usePlannerData: vi.fn(),
  useTeam: vi.fn(),
  copyElementAsPng: vi.fn(),
  getResultAvailability: vi.fn(),
  getNextResultOpeningAt: vi.fn(),
}));

vi.mock("../../src/features/planner/hooks/usePlannerData", () => ({
  usePlannerData: mocks.usePlannerData,
}));

vi.mock("../../src/features/planner/hooks/useTeam", () => ({
  useTeam: mocks.useTeam,
}));

vi.mock("../../src/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, isLoading: false }),
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

vi.mock("../../src/features/results/Results", () => ({
  default: () => null,
}));

vi.mock("../../src/lib/copyElementAsPng", () => ({
  copyElementAsPng: mocks.copyElementAsPng,
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
    mocks.copyElementAsPng.mockResolvedValue("copied");
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

  it("does not switch to Builds when the selected event changes", async () => {
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
    expect(screen.getByRole("button", { name: "Builds" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Team" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("copies an image of the selected three-build team beside the support-card toggle", async () => {
    localStorage.setItem("selectedEvent", "CM 42");
    const builds = [1, 2, 3].map((slot) => ({
      ...createDefaultBuild(String(slot)),
      id: `team-build-${slot}`,
      event: "CM 42",
      name: `Build ${slot}`,
      lastUpdate: slot,
    }));
    builds[0].skills = ["skill-1"];
    builds[0].supportCards = [{
      position: 1,
      support_card_id: 123,
      limit_break_count: 4,
    }];
    const umas = builds.map((_, index) => ({
      id: index + 1,
      charaId: index + 1,
      baseCharacterName: `Character ${index + 1}`,
      outfitTitle: `Outfit ${index + 1}`,
    }));
    mocks.usePlannerData.mockReturnValue({
      raceEntry: { eventTitle: "CM 42" },
      umaList: umas,
      skillList: [{
        id: "skill-1",
        name: "Test skill",
        groupId: null,
        iconId: 456,
        isGeneralSkill: true,
        displayOrder: 0,
        rarity: 1,
      }],
    });
    const teamState = mocks.useTeam();
    mocks.useTeam.mockReturnValue({
      ...teamState,
      umas: {
        ...teamState.umas,
        uma1: builds[0].id,
        uma2: builds[1].id,
        uma3: builds[2].id,
      },
      allBuilds: builds,
    });

    const { container } = render(
      <EventProvider>
        <Planner />
      </EventProvider>,
    );

    const imageUma = await screen.findByText("Outfit 1", {
      selector: ".result-image__team .uma-build__team-header strong",
    });
    const toolbar = container.querySelector(".uma-build-team__toolbar");
    const buttonGroup = toolbar?.firstElementChild as HTMLElement;
    const copyButton = within(buttonGroup).getByRole("button", {
      name: "Copy team as image",
    });
    const supportToggle = screen.getByLabelText("Show support cards");
    expect(buttonGroup.firstElementChild).toBe(copyButton);
    expect(toolbar?.lastElementChild).toBe(supportToggle.parentElement);
    const imageTeam = container.querySelector(".result-image__team");
    expect(imageTeam?.querySelectorAll(".uma-build")).toHaveLength(3);
    expect(imageUma).toBeInTheDocument();
    expect(imageTeam?.querySelectorAll(".uma-build__stats img")).toHaveLength(15);
    expect(imageTeam?.querySelectorAll(".uma-build__aptitudes img")).toHaveLength(12);
    expect(imageTeam?.querySelector('.uma-build__skill-row img[src="/icons/skills/456.png"]'))
      .toBeInTheDocument();
    expect(imageTeam?.querySelector(".uma-build__support-card img"))
      .toHaveAttribute("src", expect.stringContaining("/images/support_cards/full/123.png"));

    vi.useFakeTimers();
    try {
      await act(async () => {
        fireEvent.click(copyButton);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });
      const status = screen.getByRole("status");
      expect(status).toHaveTextContent("Image copied to clipboard.");
      expect(status.previousElementSibling).toBe(copyButton);
      expect(mocks.copyElementAsPng).toHaveBeenCalledWith(
        container.querySelector(".result-image"),
        "umaplanner-cm-42-team.png",
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(4999);
      });
      expect(status).toBeInTheDocument();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      expect(screen.queryByText("Image copied to clipboard.")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
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
