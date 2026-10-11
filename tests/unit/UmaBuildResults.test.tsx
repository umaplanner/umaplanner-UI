import { StrictMode } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toBlob } from "html-to-image";
import UmaBuildResults from "../../src/components/UmaBuild/results/Results";
import UmaBuildSavedBuildDialog from "../../src/components/UmaBuild/team/SavedBuildDialog";
import {
  createDefaultTicketCounts,
  createDefaultBuild,
  createDefaultTeamResults,
  setTeamResultRoundExcluded,
} from "../../src/features/planner/plannerTypes";

vi.mock("html-to-image", () => ({ toBlob: vi.fn() }));

const dialogPrototype = HTMLDialogElement.prototype;
const originalShowModal = Object.getOwnPropertyDescriptor(dialogPrototype, "showModal");
const originalClose = Object.getOwnPropertyDescriptor(dialogPrototype, "close");

beforeEach(() => {
  localStorage.removeItem("prefs");
  Object.defineProperty(dialogPrototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(dialogPrototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    },
  });
});

afterEach(() => {
  if (originalShowModal) Object.defineProperty(dialogPrototype, "showModal", originalShowModal);
  else Reflect.deleteProperty(dialogPrototype, "showModal");
  if (originalClose) Object.defineProperty(dialogPrototype, "close", originalClose);
  else Reflect.deleteProperty(dialogPrototype, "close");
});

async function openSavedBuildPicker(
  user: ReturnType<typeof userEvent.setup>,
  parent: HTMLElement,
  slot: number,
) {
  await user.click(
    within(parent).getAllByRole("button", {
      name: new RegExp(`Choose build.*Uma ${slot}`),
    })[0],
  );
  return screen.getByRole("dialog", { name: /saved build/i });
}

describe("UmaBuildResults", () => {
  it("offers branded image exports containing only populated result days", () => {
    const builds = [1, 2, 3, 4].map((slot) => ({
      ...createDefaultBuild(String(slot)),
      id: `build-${slot}`,
      event: "CM 42",
      name: `Build ${slot}`,
      lastUpdate: 1,
    }));
    const { container } = render(
      <UmaBuildResults
        event="CM 42"
        results={{
          ...createDefaultTeamResults(),
          round1Day1: [3, 2, 0, 0],
        }}
        buildAssignments={{}}
        ticketBuildResults={{
          round1Day1: {
            1: [
              { buildId: "build-1", slot: 1, wins: 1 },
              { buildId: "build-2", slot: 2, wins: 1 },
              { buildId: "build-3", slot: 3, wins: 1 },
            ],
            2: [
              { buildId: "build-4", slot: 1, wins: 2 },
              { buildId: "build-1", slot: 2, wins: 0 },
              { buildId: "build-2", slot: 3, wins: 0 },
            ],
          },
        }}
        ticketCounts={{ ...createDefaultTicketCounts(), round1Day1: 2 }}
        initialBuildIds={builds.map((build) => build.id) as [string, string, string]}
        finalPlacement={2}
        finalBuildPlacements={[1, 2, 3]}
        availableBuilds={builds}
        umaList={builds.map((_, index) => ({
          id: index + 1,
          charaId: index + 1,
          baseCharacterName: `Character ${index + 1}`,
          outfitTitle: `Uma ${index + 1}`,
        }))}
        skillList={[]}
        showSupportCards={false}
        onSaveTicket={vi.fn()}
        onRemoveTicket={vi.fn()}
        onSaveFinals={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Copy summary image" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Copy rounds and days image" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Copy Round 1 Day 1 as image" }))
      .toBeEnabled();
    expect(screen.getByRole("button", { name: "Copy Round 1 Day 2 as image" }))
      .toBeDisabled();
    const summaryHeading = container.querySelector(
      ".uma-build-results__summary-heading",
    );
    const summaryActions = container.querySelector(
      ".uma-build-results__image-actions",
    );
    expect(summaryHeading?.lastElementChild).toBe(summaryActions);
    expect(summaryActions?.querySelectorAll(".copy-icon")).toHaveLength(2);

    const imageStage = container.querySelector(".result-image-stage");
    expect(imageStage).toHaveTextContent("Umaplanner.app");
    expect(imageStage?.querySelectorAll(".result-image")).toHaveLength(3);
    expect(imageStage).toHaveTextContent("Round 1");
    expect(imageStage).not.toHaveTextContent("Day 2");
    const imageCards = imageStage?.querySelectorAll(".result-image");
    expect(imageCards?.[0]).toHaveTextContent("CM 42");
    expect(imageCards?.[0]?.querySelector(".result-image__days"))
      .not.toBeInTheDocument();
    const summaryMetrics = imageCards?.[0]?.querySelectorAll(".result-image__metric");
    expect(summaryMetrics).toHaveLength(3);
    expect(summaryMetrics?.[0]).toHaveClass("result-image__metric--placement-2");
    expect(summaryMetrics?.[0]).toHaveTextContent("2nd");
    expect(imageCards?.[0]).not.toHaveTextContent("2nd overall");
    expect(summaryMetrics?.[1]).toHaveTextContent("TOTAL WINS");
    expect(summaryMetrics?.[2]).toHaveTextContent("TEAM WIN RATE");
    expect(summaryMetrics?.[2]).not.toHaveClass("result-image__metric--featured");
    const finalsLineup = imageCards?.[0]?.querySelector(".result-image__final-builds");
    expect(finalsLineup?.children).toHaveLength(3);
    expect(finalsLineup?.querySelectorAll(".result-image__portrait--final"))
      .toHaveLength(3);
    expect(finalsLineup?.querySelectorAll(".result-image__final-build--winner"))
      .toHaveLength(1);
    const summaryBuildGrid = imageCards?.[0]?.querySelector(".result-image__build-grid");
    expect(summaryBuildGrid?.children).toHaveLength(4);
    expect(summaryBuildGrid).toHaveStyle({
      gridTemplateColumns: "repeat(3, 11rem)",
    });
    expect(imageCards?.[1]?.querySelector(".result-image__days"))
      .toBeInTheDocument();
    expect(imageCards?.[0]?.querySelector(".result-image__event"))
      .toHaveTextContent("CM 42");
    expect(imageCards?.[2]?.querySelector(".result-image__ticket-wins"))
      .toHaveTextContent("T1 3");
    expect(imageCards?.[2]?.querySelector(".result-image__ticket-wins"))
      .toHaveTextContent("T2 2");
    expect(imageCards?.[2]?.querySelector(".result-image__day-heading")?.children[1])
      .toHaveClass("result-image__ticket-wins");
    expect(imageCards?.[2]?.querySelector(".result-image__day-heading")?.children[2])
      .toHaveClass("result-image__day-total");
    expect(imageCards?.[2]?.querySelector(".result-image__ticket-wins"))
      .not.toHaveTextContent("/5");
    expect(imageCards?.[2]?.querySelector(".result-image__ticket"))
      .not.toBeInTheDocument();
    expect(imageCards?.[2]?.querySelector(".result-image__heading"))
      .not.toBeInTheDocument();
    expect(imageCards?.[2]?.querySelector(".result-image__day-builds > header"))
      .not.toBeInTheDocument();
    expect(imageCards?.[2]).toHaveStyle({ width: "609px" });
    const dayBuildGrid = imageCards?.[2]?.querySelector(".result-image__day-build-grid");
    expect(dayBuildGrid?.children).toHaveLength(4);
    expect(dayBuildGrid).toHaveStyle({ gridTemplateColumns: "repeat(3, 11rem)" });
    expect(imageStage?.querySelector(".result-image__build-stat img"))
      .toHaveAttribute("alt", "Uma 1");
    expect(imageStage?.querySelector(".result-image__day-build img"))
      .toHaveAttribute("alt", "Uma 1");
    expect(imageStage).not.toHaveTextContent("Build performance across tickets");
    expect(imageStage).not.toHaveTextContent("1 BUILDS");
    expect(imageCards?.[0]).toHaveTextContent("45.5%");
    expect(imageCards?.[2]).toHaveTextContent("50%");
    expect(imageCards?.[2]).toHaveTextContent("WIN RATE");
    expect(imageCards?.[2]).toHaveTextContent("5 / 10");
    expect(imageStage).toHaveTextContent("Tickets 1, 2");
    expect(imageStage?.querySelector(".result-image__ticket-build"))
      .not.toBeInTheDocument();
    expect(imageStage).not.toHaveTextContent("PLAN · RACE · REPEAT");
  });

  it("copies the selected results layout as a PNG", async () => {
    vi.useFakeTimers();
    const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    const originalClipboardItem = Object.getOwnPropertyDescriptor(window, "ClipboardItem");
    const write = vi.fn().mockResolvedValue(undefined);
    class TestClipboardItem {
      constructor(_data: Record<string, Blob | Promise<Blob>>) {}
    }
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { write },
    });
    Object.defineProperty(window, "ClipboardItem", {
      configurable: true,
      value: TestClipboardItem,
    });
    vi.mocked(toBlob).mockResolvedValue(new Blob(["image"], { type: "image/png" }));

    try {
      const { container, unmount } = render(
        <UmaBuildResults
          event="CM 42"
          results={{
            ...createDefaultTeamResults(),
            round1Day1: [3, 0, 0, 0],
          }}
          buildAssignments={{}}
          ticketBuildResults={{}}
          ticketCounts={{ ...createDefaultTicketCounts(), round1Day1: 1 }}
          initialBuildIds={[null, null, null]}
          finalPlacement={null}
          availableBuilds={[]}
          umaList={[]}
          skillList={[]}
          showSupportCards={false}
          onSaveTicket={vi.fn()}
          onRemoveTicket={vi.fn()}
          onSaveFinals={vi.fn()}
        />,
      );

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Copy rounds and days image" }));
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });
      const status = screen.getByRole("status");
      expect(status).toHaveTextContent("Image copied to clipboard.");
      const actionGroup = container.querySelector(".uma-build-results__image-actions");
      expect(actionGroup?.firstElementChild).toBe(status);
      expect(status.nextElementSibling).toBe(
        screen.getByRole("button", { name: "Copy summary image" }),
      );
      expect(toBlob).toHaveBeenCalledTimes(1);
      expect(write).toHaveBeenCalledTimes(1);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(4999);
      });
      expect(status).toBeInTheDocument();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      expect(screen.queryByText("Image copied to clipboard.")).not.toBeInTheDocument();

      const dayButton = screen.getByRole("button", {
        name: "Copy Round 1 Day 1 as image",
      });
      await act(async () => {
        fireEvent.click(dayButton);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });
      const dayStatus = screen.getByText("Image copied to clipboard.");
      expect(dayButton.parentElement?.lastElementChild).toBe(dayStatus);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(4999);
      });
      expect(dayStatus).toBeInTheDocument();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      expect(screen.queryByText("Image copied to clipboard.")).not.toBeInTheDocument();
      expect(toBlob).toHaveBeenCalledTimes(2);
      expect(write).toHaveBeenCalledTimes(2);
      unmount();
    } finally {
      vi.useRealTimers();
      if (originalClipboard) {
        Object.defineProperty(navigator, "clipboard", originalClipboard);
      } else {
        Reflect.deleteProperty(navigator, "clipboard");
      }
      if (originalClipboardItem) {
        Object.defineProperty(window, "ClipboardItem", originalClipboardItem);
      } else {
        Reflect.deleteProperty(window, "ClipboardItem");
      }
      vi.mocked(toBlob).mockReset();
    }
  });

  it("keeps a saved-build picker open through Strict Mode effect cleanup", () => {
    const onClose = vi.fn();
    Object.defineProperty(dialogPrototype, "close", {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.removeAttribute("open");
        this.dispatchEvent(new Event("close"));
      },
    });

    const { unmount } = render(
      <StrictMode>
        <UmaBuildSavedBuildDialog
          teamNumber={1}
          builds={[]}
          umaList={[]}
          canClear={false}
          nativeModal
          title="Choose a saved build"
          onSelect={vi.fn()}
          onClose={onClose}
        />
      </StrictMode>,
    );

    expect(screen.getByRole("dialog", { name: "Choose a saved build" }))
      .toHaveAttribute("open");
    expect(onClose).not.toHaveBeenCalled();
    unmount();
  });

  it("adds a ticket directly without opening a ticket editor in Strict Mode", async () => {
    const user = userEvent.setup();
    Object.defineProperty(dialogPrototype, "close", {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.removeAttribute("open");
        this.dispatchEvent(new Event("close"));
      },
    });

    render(
      <StrictMode>
        <UmaBuildResults
          event="CM 42"
          results={createDefaultTeamResults()}
          buildAssignments={{}}
          ticketBuildResults={{}}
          ticketCounts={createDefaultTicketCounts()}
          initialBuildIds={[null, null, null]}
          finalPlacement={null}
          availableBuilds={[]}
          umaList={[]}
          skillList={[]}
          showSupportCards={false}
          onSaveTicket={vi.fn()}
          onRemoveTicket={vi.fn()}
          onToggleRoundExcluded={vi.fn()}
          onSaveFinals={vi.fn()}
        />
      </StrictMode>,
    );

    await user.click(screen.getByRole("button", { name: "Add Finals results" }));
    expect(screen.getByRole("dialog", { name: "Add Finals results" }))
      .toHaveAttribute("open");
    await user.click(screen.getByRole("button", { name: "Close Finals editor" }));

    await user.click(
      within(within(screen.getByRole("region", { name: "Round 1" }))
        .getByRole("region", { name: "Day 1" }))
        .getByRole("button", { name: "Add ticket" }),
    );
    expect(screen.queryByRole("dialog", { name: "Add ticket — Round 1 Day 1" }))
      .not.toBeInTheDocument();
  });

  it("shows rounds and keeps build swapping disabled until ticket editing is pressed", () => {
    const onRemoveTicket = vi.fn();
    const builds = [1, 2, 3].map((slot) => ({
      ...createDefaultBuild(String(slot)),
      id: `build-${slot}`,
      event: "CM 42",
      name: `Build ${slot}`,
      lastUpdate: 1,
    }));
    const results = {
      ...createDefaultTeamResults(),
      round1Day1: [3, 2, 1, 4] as [number, number, number, number],
      finals: [5, 5, 5, 5] as [number, number, number, number],
    };
    const ticketCounts = {
      ...createDefaultTicketCounts(),
      round1Day1: 4 as const,
    };

    render(
      <UmaBuildResults
        event="CM 42"
        results={results}
        buildAssignments={{}}
        ticketBuildResults={{}}
        ticketCounts={ticketCounts}
        initialBuildIds={builds.map((build) => build.id) as [string, string, string]}
        finalPlacement={null}
        availableBuilds={builds}
        umaList={[
          { id: 1, charaId: 1, baseCharacterName: "Character A", outfitTitle: "Uma A" },
          { id: 2, charaId: 2, baseCharacterName: "Character B", outfitTitle: "Uma B" },
          { id: 3, charaId: 3, baseCharacterName: "Character C", outfitTitle: "Uma C" },
        ]}
        skillList={[]}
        showSupportCards={false}
        onSaveTicket={vi.fn()}
        onRemoveTicket={onRemoveTicket}
        onToggleRoundExcluded={vi.fn()}
        onSaveFinals={vi.fn()}
      />,
    );

    const round1 = screen.getByRole("region", { name: "Round 1" });
    const day1 = within(round1).getByRole("region", { name: "Day 1" });
    expect(within(day1).getByLabelText("Round 1 Day 1 win rate")).toHaveTextContent("50%");
    expect(within(day1).getAllByRole("article", { name: /^Ticket / })).toHaveLength(4);
    expect(within(day1).getAllByText("Build 1").length).toBeGreaterThan(0);
    expect(within(day1).getAllByText("0 wins").length).toBeGreaterThan(0);
    expect(
      within(within(day1).getByRole("article", { name: "Ticket 1" }))
        .getByText("Team wins: 3/5"),
    ).toBeInTheDocument();
    const ticket = within(day1).getByRole("article", { name: "Ticket 1" });
    expect(within(ticket).getByRole("button", { name: "Edit Ticket 1" }))
      .toHaveAttribute("aria-pressed", "false");
    expect(within(ticket).getByRole("button", {
      name: "Choose build by name for Uma 1",
    })).toBeDisabled();
    expect(within(ticket).getByRole("button", { name: "Remove Ticket 1" }))
      .toHaveClass("uma-build-results__ticket-remove");

    const round2 = screen.getByRole("region", { name: "Round 2" });
    expect(
      round1.compareDocumentPosition(round2) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    const round2Days = within(round2).getAllByRole("region", { name: /^Day/ });
    expect(round2Days).toHaveLength(2);
    expect(round2Days[0]).toHaveTextContent("Day 1");
    expect(round2Days[1]).toHaveTextContent("Day 2");
    expect(screen.queryByRole("region", { name: "Finals" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Finals results" })).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(within(day1).queryByRole("button", { name: "Add ticket" }))
      .not.toBeInTheDocument();
    fireEvent.click(within(day1).getByRole("button", { name: "Remove Ticket 2" }));
    expect(onRemoveTicket).toHaveBeenCalledWith("round1Day1", 2);
  });

  it("gates adding tickets and Finals results until their scheduled days", () => {
    const resultAvailability = {
      round1Day1: true,
      round1Day2: false,
      round2Day1: false,
      round2Day2: false,
      finals: false,
    };
    render(
      <UmaBuildResults
        event="CM 42"
        results={createDefaultTeamResults()}
        resultAvailability={resultAvailability}
        resultOpeningDates={{
          round1Day1: null,
          round1Day2: new Date(2026, 8, 5),
          round2Day1: null,
          round2Day2: null,
          finals: null,
        }}
        buildAssignments={{}}
        ticketBuildResults={{}}
        ticketCounts={createDefaultTicketCounts()}
        initialBuildIds={[null, null, null]}
        finalPlacement={null}
        availableBuilds={[]}
        umaList={[]}
        skillList={[]}
        showSupportCards={false}
        onSaveTicket={vi.fn()}
        onRemoveTicket={vi.fn()}
        onToggleRoundExcluded={vi.fn()}
        onSaveFinals={vi.fn()}
      />,
    );

    const round1 = within(screen.getByRole("region", { name: "Round 1" }));
    expect(
      within(round1.getByRole("region", { name: "Day 1" }))
        .getByRole("button", { name: "Add ticket" }),
    ).toBeEnabled();
    expect(
      within(round1.getByRole("region", { name: "Day 2" }))
        .getByRole("button", { name: "Add ticket" }),
    ).toBeDisabled();
    expect(
      within(round1.getByRole("region", { name: "Day 2" }))
        .getByRole("status"),
    ).toHaveTextContent("Available at 5 September 2026");
    const round2 = within(screen.getByRole("region", { name: "Round 2" }));
    expect(
      within(round2.getByRole("region", { name: "Day 1" }))
        .getByRole("button", { name: "Add ticket" }),
    ).toBeDisabled();
    expect(
      within(round2.getByRole("region", { name: "Day 1" })).getByRole("status"),
    ).toHaveTextContent("Not available yet");
    expect(screen.getByRole("button", { name: "Add Finals results" })).toBeDisabled();
    expect(
      within(screen.getByRole("region", { name: "Summary" })).getByRole("status"),
    )
      .toBeInTheDocument();
  });

  it.each([
    { finalPlacement: 1 as const, winRate: "66.7% WR", record: "4/6" },
    { finalPlacement: 2 as const, winRate: "50% WR", record: "3/6" },
  ])("includes Finals placement $finalPlacement in total win rate", ({
    finalPlacement,
    winRate,
    record,
  }) => {
    render(
      <UmaBuildResults
        event="CM 42"
        results={{
          ...createDefaultTeamResults(),
          round1Day1: [3, 0, 0, 0],
        }}
        buildAssignments={{}}
        ticketBuildResults={{}}
        ticketCounts={{
          ...createDefaultTicketCounts(),
          round1Day1: 1,
        }}
        initialBuildIds={[null, null, null]}
        finalPlacement={finalPlacement}
        availableBuilds={[]}
        umaList={[]}
        skillList={[]}
        showSupportCards={false}
        onSaveTicket={vi.fn()}
        onRemoveTicket={vi.fn()}
        onToggleRoundExcluded={vi.fn()}
        onSaveFinals={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Total win rate")).toHaveTextContent(winRate);
    expect(screen.getByLabelText("Total win rate")).toHaveTextContent(record);
  });

  it("formats win rates with one decimal place when needed", () => {
    const build = {
      ...createDefaultBuild("1"),
      id: "build-a",
      event: "CM 42",
      name: "Build A",
      lastUpdate: 1,
    };

    render(
      <UmaBuildResults
        event="CM 42"
        results={{
          ...createDefaultTeamResults(),
          round1Day1: [1, 0, 0, 0],
        }}
        buildAssignments={{}}
        ticketBuildResults={{
          round1Day1: {
            1: [{ buildId: build.id, slot: 1, wins: 1 }],
            2: [{ buildId: build.id, slot: 1, wins: 0 }],
            3: [{ buildId: build.id, slot: 1, wins: 0 }],
          },
        }}
        ticketCounts={{
          ...createDefaultTicketCounts(),
          round1Day1: 3,
        }}
        initialBuildIds={[build.id, null, null]}
        finalPlacement={null}
        availableBuilds={[build]}
        umaList={[]}
        skillList={[]}
        showSupportCards={false}
        onSaveTicket={vi.fn()}
        onRemoveTicket={vi.fn()}
        onToggleRoundExcluded={vi.fn()}
        onSaveFinals={vi.fn()}
      />,
    );

    const round1Day1 = within(screen.getByRole("region", { name: "Round 1" }))
      .getByRole("region", { name: "Day 1" });
    expect(within(round1Day1).getByLabelText("Round 1 Day 1 win rate"))
      .toHaveTextContent("6.7% (1/15)");
    expect(screen.getByLabelText("Total win rate"))
      .toHaveTextContent("6.7% WR");
    expect(screen.getByLabelText("Total win rate")).toHaveTextContent("1/15");
    expect(screen.getByRole("button", { name: "Show details for Round build Build A" }))
      .toHaveTextContent("6.7% WR (1/15)");
  });

  it("includes a Finals result in the win rate of matching round builds only", () => {
    const buildA = {
      ...createDefaultBuild("1"),
      id: "build-a",
      event: "CM 42",
      name: "Build A",
      lastUpdate: 1,
    };
    const buildB = {
      ...createDefaultBuild("2"),
      id: "build-b",
      event: "CM 42",
      name: "Build B",
      lastUpdate: 2,
    };

    render(
      <UmaBuildResults
        event="CM 42"
        results={{
          ...createDefaultTeamResults(),
          round1Day1: [3, 0, 0, 0],
        }}
        buildAssignments={{
          finals: {
            1: [{ buildId: buildA.id, tickets: [1] }],
          },
        }}
        ticketBuildResults={{
          round1Day1: {
            1: [
              { buildId: buildA.id, slot: 1, wins: 3 },
              { buildId: buildB.id, slot: 2, wins: 0 },
            ],
          },
        }}
        ticketCounts={{
          ...createDefaultTicketCounts(),
          round1Day1: 1,
        }}
        initialBuildIds={[buildA.id, buildB.id, null]}
        finalPlacement={1}
        finalBuildPlacements={[1, null, null]}
        availableBuilds={[buildA, buildB]}
        umaList={[]}
        skillList={[]}
        showSupportCards={false}
        onSaveTicket={vi.fn()}
        onRemoveTicket={vi.fn()}
        onToggleRoundExcluded={vi.fn()}
        onSaveFinals={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Show details for Round build Build A" }))
      .toHaveTextContent("66.7% WR (4/6)");
    expect(screen.getByRole("button", { name: "Show details for Round build Build B" }))
      .toHaveTextContent("0% WR (0/5)");
  });

  it("remembers collapsed result groups across remounts", () => {
    const props = {
      event: "CM 42",
      results: createDefaultTeamResults(),
      buildAssignments: {},
      ticketBuildResults: {},
      ticketCounts: createDefaultTicketCounts(),
      initialBuildIds: [null, null, null] as [null, null, null],
      finalPlacement: null,
      availableBuilds: [],
      umaList: [],
      skillList: [],
      showSupportCards: false,
      onSaveTicket: vi.fn(),
      onRemoveTicket: vi.fn(),
      onToggleRoundExcluded: vi.fn(),
      onSaveFinals: vi.fn(),
    };
    localStorage.setItem("prefs", JSON.stringify({
      theme: "dark",
      skillPicker: { sort: "rarity", ascending: false },
      resultsCollapsedGroupsByEvent: { "CM 41": { "Round 2": true } },
    }));
    const firstRender = render(<UmaBuildResults {...props} />);
    const round1 = screen.getByRole("region", { name: "Round 1" });

    fireEvent.click(within(round1).getByRole("button", { name: "Collapse Round 1" }));
    const savedPreferences = JSON.parse(localStorage.getItem("prefs") ?? "{}");
    expect(savedPreferences.resultsCollapsedGroupsByEvent["CM 42"]["Round 1"])
      .toBe(true);
    expect(savedPreferences.resultsCollapsedGroupsByEvent["CM 41"]["Round 2"])
      .toBe(true);
    expect(savedPreferences.theme).toBe("dark");
    firstRender.unmount();

    const restoredRender = render(<UmaBuildResults {...props} />);
    const restoredRound1 = screen.getByRole("region", { name: "Round 1" });
    expect(within(restoredRound1).getByRole("button", { name: "Expand Round 1" }))
      .toHaveAttribute("aria-expanded", "false");
    expect(within(restoredRound1).queryByRole("table")).not.toBeInTheDocument();

    restoredRender.unmount();
    render(<UmaBuildResults {...props} event="CM 41" />);
    expect(within(screen.getByRole("region", { name: "Round 2" }))
      .getByRole("button", { name: "Expand Round 2" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(within(screen.getByRole("region", { name: "Round 1" }))
      .getByRole("button", { name: "Collapse Round 1" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("summarizes builds from rounds and Finals with their accumulated win rates", async () => {
    const user = userEvent.setup();
    const buildA = {
      ...createDefaultBuild("1"),
      id: "build-a",
      event: "CM 42",
      name: "Build A",
      lastUpdate: 1,
    };
    const buildB = {
      ...createDefaultBuild("2"),
      id: "build-b",
      event: "CM 42",
      name: "Build B",
      lastUpdate: 2,
    };
    const buildC = {
      ...createDefaultBuild("3"),
      id: "build-c",
      event: "CM 42",
      name: "Build C",
      lastUpdate: 3,
    };
    const buildD = {
      ...createDefaultBuild("4"),
      id: "build-d",
      event: "CM 42",
      name: "Build D",
      lastUpdate: 4,
    };
    const results = {
      ...createDefaultTeamResults(),
      round1Day1: [5, 0, 0, 0] as [number, number, number, number],
      round1Day2: [0, 0, 0, 0] as [number, number, number, number],
      round2Day1: [3, 0, 0, 0] as [number, number, number, number],
      round2Day2: [2, 0, 0, 0] as [number, number, number, number],
    };
    const ticketCounts = {
      ...createDefaultTicketCounts(),
      round1Day1: 1 as const,
      round1Day2: 1 as const,
      round2Day1: 1 as const,
      round2Day2: 1 as const,
    };
    const { unmount } = render(
      <UmaBuildResults
        event="CM 42"
        results={results}
        buildAssignments={{
          round1Day2: { 2: [{ buildId: buildC.id, tickets: [1] }] },
          round2Day1: { 1: [{ buildId: buildB.id, tickets: [1] }] },
          finals: { 3: [{ buildId: buildD.id, tickets: [1] }] },
        }}
        ticketBuildResults={{
          round1Day1: { 1: [{ buildId: buildA.id, slot: 1, wins: 5 }] },
          round1Day2: { 1: [{ buildId: buildC.id, slot: 2, wins: 0 }] },
          round2Day1: { 1: [{ buildId: buildB.id, slot: 1, wins: 3 }] },
          round2Day2: { 1: [{ buildId: buildB.id, slot: 1, wins: 2 }] },
        }}
        ticketCounts={ticketCounts}
        initialBuildIds={[buildA.id, null, null]}
        finalPlacement={1}
        finalBuildPlacements={[null, null, 1]}
        availableBuilds={[buildA, buildB, buildC, buildD]}
        umaList={[
          { id: 1, charaId: 1, baseCharacterName: "Character A", outfitTitle: "Uma A" },
          { id: 2, charaId: 2, baseCharacterName: "Character B", outfitTitle: "Uma B" },
          { id: 3, charaId: 3, baseCharacterName: "Character C", outfitTitle: "Uma C" },
          { id: 4, charaId: 4, baseCharacterName: "Character D", outfitTitle: "Uma D" },
        ]}
        skillList={[]}
        showSupportCards={false}
        onSaveTicket={vi.fn()}
        onRemoveTicket={vi.fn()}
        onToggleRoundExcluded={vi.fn()}
        onSaveFinals={vi.fn()}
      />,
    );

    const summary = screen.getByRole("region", { name: "Summary" });
    expect(within(summary).getByText("1st")).toBeInTheDocument();
    expect(within(summary).getByText("Uma B")).toBeInTheDocument();
    expect(within(summary).queryByRole("button", { name: "Details" }))
      .not.toBeInTheDocument();
    expect(
      within(summary).getByRole("button", {
        name: "Show details for Round build Build A",
      }),
    ).toHaveTextContent("100% WR (5/5)");
    expect(
      within(summary).getByRole("button", {
        name: "Show details for Round build Build B",
      }),
    ).toHaveTextContent("50% WR (5/10)");
    expect(
      within(summary).getByRole("button", {
        name: "Show details for Round build Build C",
      }),
    ).toHaveTextContent("0% WR (0/5)");
    expect(
      within(summary).getByRole("button", {
        name: "Show details for Round build Build D",
      }),
    ).toHaveTextContent("100% WR (1/1)");

    await user.click(
      within(summary).getByRole("button", {
        name: "Show details for Round build Build A",
      }),
    );
    const roundBuildDialog = screen.getByRole("dialog", {
      name: "Round build details",
    });
    expect(within(roundBuildDialog).getByText("Uma A")).toBeInTheDocument();
    await user.click(within(roundBuildDialog).getByRole("button", {
      name: "Close build details",
    }));

    await user.click(
      within(summary).getByRole("button", { name: "Show details for Finals Uma 1" }),
    );
    const detailsDialog = screen.getByRole("dialog", { name: "Finals build details" });
    expect(detailsDialog).toBeInTheDocument();
    expect(within(detailsDialog).getByText("Uma B")).toBeInTheDocument();
    unmount();
  });

  it("shows build win rates from the included round when the other round is excluded", () => {
    const build = {
      ...createDefaultBuild("1"),
      id: "build-a",
      event: "CM 42",
      name: "Build A",
      lastUpdate: 1,
    };
    const results = setTeamResultRoundExcluded(
      createDefaultTeamResults(),
      "round1",
      true,
    );

    render(
      <UmaBuildResults
        event="CM 42"
        results={{
          ...results,
          round2Day1: [3, 0, 0, 0],
        }}
        buildAssignments={{}}
        ticketBuildResults={{
          round2Day1: { 1: [{ buildId: build.id, slot: 1, wins: 3 }] },
        }}
        ticketCounts={{ ...createDefaultTicketCounts(), round2Day1: 1 }}
        initialBuildIds={[build.id, null, null]}
        finalPlacement={null}
        availableBuilds={[build]}
        umaList={[
          { id: 1, charaId: 1, baseCharacterName: "Character A", outfitTitle: "Uma A" },
        ]}
        skillList={[]}
        showSupportCards={false}
        onSaveTicket={vi.fn()}
        onRemoveTicket={vi.fn()}
        onToggleRoundExcluded={vi.fn()}
        onSaveFinals={vi.fn()}
      />,
    );

    const summary = screen.getByRole("region", { name: "Summary" });
    expect(
      within(summary).getByRole("button", {
        name: "Show details for Round build Build A",
      }),
    ).toBeInTheDocument();
    expect(
      within(summary).getByRole("button", {
        name: "Show details for Round build Build A",
      }),
    ).toHaveTextContent("60% WR (3/5)");
    expect(within(summary).getByLabelText("Total win rate"))
      .toHaveTextContent("60% WR");
    expect(within(summary).getByLabelText("Total win rate"))
      .toHaveTextContent("3/5");
  });

  it("uses full-detail tickets and preserves saved team totals", async () => {
    const user = userEvent.setup();
    const onSaveTicket = vi.fn();
    const builds = [1, 2, 3].map((slot) => ({
      ...createDefaultBuild(String(slot)),
      id: `build-${slot}`,
      event: "CM 42",
      name: `Build ${slot}`,
      lastUpdate: slot,
    }));
    const props = {
      event: "CM 42",
      results: createDefaultTeamResults(),
      buildAssignments: {},
      ticketBuildResults: {},
      ticketCounts: createDefaultTicketCounts(),
      initialBuildIds: [null, null, null] as [null, null, null],
      finalPlacement: null,
      availableBuilds: builds,
      umaList: builds.map((_, index) => ({
        id: index + 1,
        charaId: index + 1,
        baseCharacterName: `Character ${index + 1}`,
        outfitTitle: `Uma ${index + 1}`,
      })),
      skillList: [],
      showSupportCards: false,
      onSaveTicket,
      onRemoveTicket: vi.fn(),
      onToggleRoundExcluded: vi.fn(),
      onSaveFinals: vi.fn(),
    };
    const { rerender } = render(<UmaBuildResults {...props} />);

    const day1 = within(screen.getByRole("region", { name: "Round 1" }))
      .getByRole("region", { name: "Day 1" });
    await user.click(within(day1).getByRole("button", { name: "Add ticket" }));
    expect(onSaveTicket).toHaveBeenCalledWith("round1Day1", 1, []);

    rerender(
      <UmaBuildResults
        {...props}
      results={{
          ...props.results,
          round1Day1: [3, 0, 0, 0],
        }}
        buildAssignments={{
          round1Day1: {
            1: [{ buildId: "build-1", tickets: [1] }],
            2: [{ buildId: "build-2", tickets: [1] }],
            3: [{ buildId: "build-3", tickets: [1] }],
          },
        }}
        ticketBuildResults={{ round1Day1: { 1: [] } }}
        ticketCounts={{ ...props.ticketCounts, round1Day1: 1 }}
      />,
    );
    const savedDay1 = within(screen.getByRole("region", { name: "Round 1" }))
      .getByRole("region", { name: "Day 1" });
    expect(within(savedDay1).getByText("Team wins:", { exact: false }))
      .toHaveTextContent("Team wins: 3/5");
    [1, 2, 3].forEach((slot) => {
      expect(within(savedDay1).getByText(`Build ${slot}`)).toBeInTheDocument();
      expect(within(savedDay1).getByRole("button", {
        name: `Increase wins for Build ${slot} on Ticket 1`,
      })).toBeInTheDocument();
    });
    expect(within(savedDay1).queryByRole("button", {
      name: "Increase team wins on Ticket 1",
    })).not.toBeInTheDocument();
    expect(within(savedDay1).queryByText("Wins N/A")).not.toBeInTheDocument();
    expect(within(savedDay1).getByLabelText("Round 1 Day 1 win rate"))
      .toHaveTextContent("60% (3/5)");
    expect(screen.getByLabelText("Total win rate")).toHaveTextContent("60% WR");
    expect(screen.getByLabelText("Total win rate")).toHaveTextContent("3/5");
  });

  it("shows the same saved-build choices when swapping ticket builds", async () => {
    const user = userEvent.setup();
    const builds = [
      { id: "build-a", outfitId: "100101", name: "Build A" },
      { id: "build-b", outfitId: "100102", name: "Build B" },
      { id: "build-c", outfitId: "200101", name: "Build C" },
      { id: "build-plan", outfitId: "300101", name: "Plan", buildType: "plan" },
    ].map(({ buildType, ...build }) => ({
      ...createDefaultBuild(build.outfitId),
      ...build,
      ...(buildType ? { "build-type": buildType as "plan" } : {}),
      event: "CM 42",
      lastUpdate: 1,
    }));
    render(
      <UmaBuildResults
        event="CM 42"
        results={createDefaultTeamResults()}
        buildAssignments={{
          round1Day1: { 1: [{ buildId: "build-a", tickets: [1] }] },
        }}
        ticketBuildResults={{
          round1Day1: {
            1: [{ buildId: "build-a", slot: 1, wins: 0 }],
          },
        }}
        ticketCounts={{ ...createDefaultTicketCounts(), round1Day1: 1 }}
        initialBuildIds={[null, null, null]}
        finalPlacement={null}
        availableBuilds={builds}
        umaList={[
          { id: 100101, charaId: 1, baseCharacterName: "Character A", outfitTitle: "Uma A" },
          { id: 100102, charaId: 2, baseCharacterName: "Character B", outfitTitle: "Uma B" },
          { id: 200101, charaId: 3, baseCharacterName: "Character C", outfitTitle: "Uma C" },
          { id: 300101, charaId: 4, baseCharacterName: "Character Plan", outfitTitle: "Uma Plan" },
        ]}
        skillList={[]}
        showSupportCards={false}
        onSaveTicket={vi.fn()}
        onRemoveTicket={vi.fn()}
        onToggleRoundExcluded={vi.fn()}
        onSaveFinals={vi.fn()}
      />,
    );
    const day1 = within(screen.getByRole("region", { name: "Round 1" }))
      .getByRole("region", { name: "Day 1" });
    const ticketCard = within(day1).getByRole("article", { name: "Ticket 1" });
    const editButton = within(ticketCard).getByRole("button", { name: "Edit Ticket 1" });
    const buildButton = within(ticketCard).getByRole("button", {
      name: "Choose build by image for Uma 1",
    });
    expect(buildButton).toBeDisabled();
    await user.click(editButton);
    expect(editButton).toHaveAttribute("aria-pressed", "true");
    expect(buildButton).toBeEnabled();
    const firstBuildPicker = await openSavedBuildPicker(user, ticketCard, 1);
    expect(within(firstBuildPicker).getByRole("button", { name: /Build A/ }))
      .toHaveTextContent("Speed 1200");
    await user.click(within(firstBuildPicker).getByRole("button", {
      name: "Close saved builds",
    }));
    await user.click(within(ticketCard).getByRole("button", {
      name: "Choose build by name for Uma 1",
    }));
    expect(screen.getByRole("dialog", { name: "Swap to a saved build" }))
      .toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close saved builds" }));
    const secondBuildPicker = await openSavedBuildPicker(user, ticketCard, 2);
    expect(within(secondBuildPicker).getByRole("button", { name: /Build B/ }))
      .toBeInTheDocument();
    expect(within(secondBuildPicker).getByRole("button", { name: /Plan/ }))
      .toBeInTheDocument();
    expect(within(secondBuildPicker).getByRole("button", { name: /Build C/ }))
      .toBeInTheDocument();
    await user.click(within(secondBuildPicker).getByRole("button", {
      name: "Close saved builds",
    }));
    await user.click(editButton);
    expect(editButton).toHaveAttribute("aria-pressed", "false");
    expect(buildButton).toBeDisabled();
    await user.click(buildButton);
    expect(screen.queryByRole("dialog", { name: "Swap to a saved build" }))
      .not.toBeInTheDocument();
  });

  it("renders saved ticket builds and wins in the final ticket card", () => {
    const onSaveTicket = vi.fn();
    const builds = [1, 2, 3, 4].map((slot) => ({
      ...createDefaultBuild(String(slot)),
      id: `build-${slot}`,
      event: "CM 42",
      name: `Build ${slot}`,
      lastUpdate: slot,
    }));

    render(
      <UmaBuildResults
        event="CM 42"
        results={{ ...createDefaultTeamResults(), round1Day1: [5, 0, 0, 0] }}
        buildAssignments={{
          round1Day1: {
            1: [{ buildId: "build-1", tickets: [1] }],
            2: [{ buildId: "build-2", tickets: [1] }],
            3: [{ buildId: "build-3", tickets: [1] }],
          },
        }}
        ticketBuildResults={{
          round1Day1: {
            1: [
              { slot: 1, buildId: "build-1", wins: 4 },
              { slot: 2, buildId: "build-2", wins: 1 },
              { slot: 3, buildId: "build-3", wins: 0 },
            ],
          },
        }}
        ticketCounts={{ ...createDefaultTicketCounts(), round1Day1: 1 }}
        initialBuildIds={[null, null, null]}
        finalPlacement={null}
        availableBuilds={builds}
        umaList={[
          ...builds.map((_, index) => ({
            id: index + 1,
            charaId: index + 1,
            baseCharacterName: `Character ${index + 1}`,
            outfitTitle: `Uma ${index + 1}`,
          })),
        ]}
        skillList={[]}
        showSupportCards={false}
        onSaveTicket={onSaveTicket}
        onRemoveTicket={vi.fn()}
        onToggleRoundExcluded={vi.fn()}
        onSaveFinals={vi.fn()}
      />,
    );

    const round1Day1 = within(screen.getByRole("region", { name: "Round 1" }))
      .getByRole("region", { name: "Day 1" });
    const ticket = within(round1Day1).getByRole("article", { name: "Ticket 1" });
    expect(within(ticket).getByRole("button", {
      name: "Choose build by name for Uma 1",
    })).toHaveTextContent("Build 1");
    expect(within(ticket).getByRole("button", {
      name: "Increase wins for Build 1 on Ticket 1",
    })).toBeDisabled();
    expect(within(ticket).getByText("Team wins: 5/5")).toBeInTheDocument();
    expect(within(ticket).getByRole("button", { name: "Remove Ticket 1" }))
      .toBeInTheDocument();
    expect(onSaveTicket).not.toHaveBeenCalled();
  });

  it("copies the current team for the first ticket, then the previous ticket lineup", async () => {
    const user = userEvent.setup();
    const onSaveTicket = vi.fn();
    const builds = [1, 2, 3, 4].map((slot) => ({
      ...createDefaultBuild(String(slot)),
      id: `build-${slot}`,
      event: "CM 42",
      name: `Build ${slot}`,
      lastUpdate: slot,
    }));
    const { rerender } = render(
      <UmaBuildResults
        event="CM 42"
        results={createDefaultTeamResults()}
        buildAssignments={{}}
        ticketBuildResults={{}}
        ticketCounts={createDefaultTicketCounts()}
        initialBuildIds={builds.slice(0, 3).map((build) => build.id) as [string, string, string]}
        finalPlacement={null}
        availableBuilds={builds}
        umaList={builds.map((_, index) => ({
          id: index + 1,
          charaId: index + 1,
          baseCharacterName: `Character ${index + 1}`,
          outfitTitle: `Uma ${index + 1}`,
        }))}
        skillList={[]}
        showSupportCards={false}
        onSaveTicket={onSaveTicket}
        onRemoveTicket={vi.fn()}
        onToggleRoundExcluded={vi.fn()}
        onSaveFinals={vi.fn()}
      />,
    );

    const day1 = within(screen.getByRole("region", { name: "Round 1" }))
      .getByRole("region", { name: "Day 1" });
    await user.click(within(day1).getByRole("button", { name: "Add ticket" }));
    expect(onSaveTicket).toHaveBeenLastCalledWith("round1Day1", 1, [
      { buildId: "build-1", slot: 1, wins: 0 },
      { buildId: "build-2", slot: 2, wins: 0 },
      { buildId: "build-3", slot: 3, wins: 0 },
    ]);

    const ticketCounts = { ...createDefaultTicketCounts(), round1Day1: 1 as const };
    rerender(
      <UmaBuildResults
        event="CM 42"
        results={{
          ...createDefaultTeamResults(),
          round1Day1: [2, 0, 0, 0],
        }}
        buildAssignments={{
          round1Day1: {
            1: [{ buildId: "build-4", tickets: [1] }],
            2: [{ buildId: "build-2", tickets: [1] }],
            3: [{ buildId: "build-3", tickets: [1] }],
          },
        }}
        ticketBuildResults={{
          round1Day1: {
            1: [
              { buildId: "build-4", slot: 1, wins: 2 },
              { buildId: "build-2", slot: 2, wins: 0 },
              { buildId: "build-3", slot: 3, wins: 0 },
            ],
          },
        }}
        ticketCounts={ticketCounts}
        initialBuildIds={builds.slice(0, 3).map((build) => build.id) as [string, string, string]}
        finalPlacement={null}
        availableBuilds={builds}
        umaList={builds.map((_, index) => ({
          id: index + 1,
          charaId: index + 1,
          baseCharacterName: `Character ${index + 1}`,
          outfitTitle: `Uma ${index + 1}`,
        }))}
        skillList={[]}
        showSupportCards={false}
        onSaveTicket={onSaveTicket}
        onRemoveTicket={vi.fn()}
        onToggleRoundExcluded={vi.fn()}
        onSaveFinals={vi.fn()}
      />,
    );
    const updatedDay1 = within(screen.getByRole("region", { name: "Round 1" }))
      .getByRole("region", { name: "Day 1" });
    await user.click(within(updatedDay1).getByRole("button", { name: "Add ticket" }));
    expect(onSaveTicket).toHaveBeenLastCalledWith("round1Day1", 2, [
      { buildId: "build-4", slot: 1, wins: 0 },
      { buildId: "build-2", slot: 2, wins: 0 },
      { buildId: "build-3", slot: 3, wins: 0 },
    ]);
  });

  it("shows the final ticket lineup and calculates the rate using the configured ticket count", () => {
    const ticketCounts = { ...createDefaultTicketCounts(), round1Day1: 1 as const };
    const results = createDefaultTeamResults();
    results.round1Day1 = [5, 0, 0, 0];
    const builds = [1, 2, 3, 4].map((slot) => ({
      ...createDefaultBuild(String(slot)),
      id: `build-${slot}`,
      event: "CM 42",
      name: `Build ${slot}`,
      lastUpdate: slot,
    }));

    render(
      <UmaBuildResults
        event="CM 42"
        results={results}
        buildAssignments={{
          round1Day1: { 1: [{ buildId: builds[3].id, tickets: [1] }] },
        }}
        ticketBuildResults={{}}
        ticketCounts={ticketCounts}
        initialBuildIds={builds.slice(0, 3).map((build) => build.id) as [string, string, string]}
        finalPlacement={null}
        availableBuilds={builds}
        umaList={[
          { id: 1, charaId: 1, baseCharacterName: "Character A", outfitTitle: "Uma A" },
          { id: 2, charaId: 2, baseCharacterName: "Character B", outfitTitle: "Uma B" },
          { id: 3, charaId: 3, baseCharacterName: "Character C", outfitTitle: "Uma C" },
          { id: 4, charaId: 4, baseCharacterName: "Character D", outfitTitle: "Uma D" },
        ]}
        skillList={[]}
        showSupportCards={false}
        onSaveTicket={vi.fn()}
        onRemoveTicket={vi.fn()}
        onToggleRoundExcluded={vi.fn()}
        onSaveFinals={vi.fn()}
      />,
    );

    const day1 = within(screen.getByRole("region", { name: "Round 1" }))
      .getByRole("region", { name: "Day 1" });
    expect(within(day1).getByText("Build 4")).toBeInTheDocument();
    expect(within(day1).getByLabelText("Round 1 Day 1 win rate"))
      .toHaveTextContent("100% (5/5)");
    expect(within(day1).queryByRole("article", { name: "Ticket 2" }))
      .not.toBeInTheDocument();
  });

  it("records Finals from the summary and clears individual build selections", async () => {
    const user = userEvent.setup();
    const onSaveFinals = vi.fn();
    const builds = [1, 2, 3, 4].map((slot) => ({
      ...createDefaultBuild(
        slot === 1 ? "100101" : slot === 4 ? "100102" : `${slot}00101`,
      ),
      id: `build-${slot}`,
      event: "CM 42",
      name: `Build ${slot}`,
      lastUpdate: slot,
    })).concat({
      ...createDefaultBuild("900101"),
      "build-type": "plan" as const,
      id: "build-plan",
      event: "CM 42",
      name: "Plan",
      lastUpdate: 5,
    });
    const props = {
      event: "CM 42",
      results: createDefaultTeamResults(),
      buildAssignments: {},
      ticketBuildResults: {},
      ticketCounts: createDefaultTicketCounts(),
      initialBuildIds: ["build-1", "build-2", "build-3"] as [string, string, string],
      finalPlacement: null,
      finalBuildPlacements: [null, null, null] as [null, null, null],
      availableBuilds: builds,
      umaList: [
        { id: 100101, charaId: 1, baseCharacterName: "Character 1", outfitTitle: "Uma 1" },
        { id: 200101, charaId: 2, baseCharacterName: "Character 2", outfitTitle: "Uma 2" },
        { id: 300101, charaId: 3, baseCharacterName: "Character 3", outfitTitle: "Uma 3" },
        { id: 100102, charaId: 4, baseCharacterName: "Character 4", outfitTitle: "Uma 4" },
      ],
      skillList: [],
      showSupportCards: false,
      onSaveTicket: vi.fn(),
      onRemoveTicket: vi.fn(),
      onToggleRoundExcluded: vi.fn(),
      onSaveFinals,
    };
    const { rerender } = render(<UmaBuildResults {...props} />);

    await user.click(screen.getByRole("button", { name: "Add Finals results" }));
    const finalsDialog = screen.getByRole("dialog", { name: "Add Finals results" });
    await user.click(within(finalsDialog).getByRole("button", { name: "2nd" }));
    expect(within(finalsDialog).getByRole("button", { name: "1st" })).toBeDisabled();
    expect(
      within(
        within(finalsDialog).getByRole("combobox", { name: "Placement for Uma 1" }),
      ).getByRole("option", { name: "9th" }),
    ).toBeInTheDocument();
    const finalsBuildPicker = await openSavedBuildPicker(user, finalsDialog, 1);
    expect(within(finalsBuildPicker).queryByRole("button", { name: /Plan/ }))
      .not.toBeInTheDocument();
    const buildFourCard = within(finalsBuildPicker).getByRole("button", { name: /Build 4/ });
    expect(buildFourCard).toHaveTextContent("Uma 4");
    expect(buildFourCard).toHaveTextContent("Character 4");
    await user.click(buildFourCard);
    await user.selectOptions(
      within(finalsDialog).getByRole("combobox", { name: "Placement for Uma 1" }),
      "2",
    );
    await user.click(
      within(finalsDialog).getByRole("button", { name: "Clear selected build for Uma 3" }),
    );
    await user.click(within(finalsDialog).getByRole("button", { name: "Save Finals results" }));

    expect(onSaveFinals).toHaveBeenLastCalledWith(
      ["build-4", "build-2", null],
      [2, null, null],
      2,
    );

    rerender(
      <UmaBuildResults
        {...props}
        buildAssignments={{
          finals: {
            1: [{ buildId: "build-4", tickets: [1] }],
            2: [{ buildId: "build-2", tickets: [1] }],
            3: [{ buildId: null, tickets: [1] }],
          },
        }}
        finalBuildPlacements={[2, null, null]}
        finalPlacement={2}
      />,
    );
    const summary = screen.getByRole("region", { name: "Summary" });
    expect(within(summary).getByText("2nd")).toBeInTheDocument();
    expect(
      within(summary).getByRole("button", { name: "Show details for Finals Uma 1" }),
    ).toBeInTheDocument();
    expect(
      within(summary).getByRole("button", { name: "Show details for Finals Uma 1" }),
    ).toHaveTextContent("2nd place");
    expect(within(summary).getByRole("button", { name: "Edit Finals" }))
      .toBeInTheDocument();

    await user.click(within(summary).getByRole("button", { name: "Edit Finals" }));
    const editFinalsDialog = screen.getByRole("dialog", { name: "Edit Finals results" });
    await user.selectOptions(
      within(editFinalsDialog).getByRole("combobox", { name: "Placement for Uma 1" }),
      "1",
    );
    expect(within(editFinalsDialog).getByRole("button", { name: "1st" }))
      .toHaveAttribute("aria-pressed", "true");
    expect(within(editFinalsDialog).getByRole("button", { name: "2nd" })).toBeDisabled();
    expect(within(editFinalsDialog).getByRole("button", { name: "3rd" })).toBeDisabled();
    await user.click(within(editFinalsDialog).getByRole("button", { name: "Save Finals results" }));
    expect(onSaveFinals).toHaveBeenLastCalledWith(
      ["build-4", "build-2", null],
      [1, null, null],
      1,
    );
  });

  it("shows only full-detail rounds and removes round exclusion controls", () => {
    const props = {
      event: "CM 42",
      results: createDefaultTeamResults(),
      buildAssignments: {},
      ticketBuildResults: {},
      ticketCounts: createDefaultTicketCounts(),
      initialBuildIds: [null, null, null] as [null, null, null],
      finalPlacement: null,
      availableBuilds: [],
      umaList: [],
      onSaveTicket: vi.fn(),
      onSaveFinals: vi.fn(),
    };
    render(<UmaBuildResults {...props} />);

    const round1 = screen.getByRole("region", { name: "Round 1" });
    expect(within(round1).getAllByRole("region", { name: /^Day/ })).toHaveLength(2);
    expect(screen.queryByLabelText("Results detail mode")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Exclude Round 1" }))
      .not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Build performance summary" }))
      .toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add" })).not.toBeInTheDocument();
  });

});
