import { StrictMode } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import UmaBuildResults from "../../src/components/UmaBuild/results/Results";
import UmaBuildSavedBuildDialog from "../../src/components/UmaBuild/display/SavedBuildDialog";
import {
  createDefaultTicketCounts,
  createDefaultBuild,
  createDefaultTeamResults,
  setTeamResultRoundExcluded,
} from "../../src/features/planner/plannerTypes";

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
    within(parent).getByRole("button", { name: `Choose build for Uma ${slot}` }),
  );
  return screen.getByRole("dialog", { name: "Choose a saved build" });
}

async function chooseSavedBuild(
  user: ReturnType<typeof userEvent.setup>,
  parent: HTMLElement,
  slot: number,
  buildName: RegExp,
) {
  const picker = await openSavedBuildPicker(user, parent, slot);
  await user.click(within(picker).getByRole("button", { name: buildName }));
}

describe("UmaBuildResults", () => {
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

  it("shows rounds with two day rows and computes rates out of 20", () => {
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
    const day1 = within(round1).getByRole("row", { name: /Day 1/ });
    expect(within(day1).getByLabelText("Round 1 Day 1 win rate")).toHaveTextContent("50%");
    expect(within(day1).getAllByRole("article", { name: /^Ticket / })).toHaveLength(4);
    expect(within(day1).getAllByText("Build 1").length).toBeGreaterThan(0);
    expect(within(day1).getAllByText("0 wins").length).toBeGreaterThan(0);
    fireEvent.click(
      within(within(day1).getByRole("article", { name: "Ticket 1" }))
        .getByRole("button", { name: "Edit" }),
    );
    const editDialog = screen.getByRole("dialog", {
      name: "Edit ticket — Round 1 Day 1",
    });
    expect(editDialog.querySelector(".uma-build-results__ticket-build-icon"))
      .toHaveAttribute("src", expect.stringContaining("/images/characters/thumb/1.png"));
    expect(within(editDialog).queryByRole("button", { name: "Add build" }))
      .not.toBeInTheDocument();
    fireEvent.click(within(editDialog).getByRole("button", { name: "Cancel" }));

    const round2 = screen.getByRole("region", { name: "Round 2" });
    const round2Rows = within(round2).getAllByRole("row");
    expect(round2Rows).toHaveLength(3);
    expect(round2Rows[1]).toHaveTextContent("Day 1");
    expect(round2Rows[2]).toHaveTextContent("Day 2");
    expect(screen.queryByRole("region", { name: "Finals" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Finals results" })).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(within(day1).queryByRole("button", { name: "Add ticket" }))
      .not.toBeInTheDocument();
    const removeTicket = within(day1).getByRole("button", { name: "Remove Ticket 2" });
    expect(removeTicket).toHaveClass("uma-build-results__ticket-remove");
    fireEvent.click(removeTicket);
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
      within(round1.getByRole("row", { name: /Day 1/ }))
        .getByRole("button", { name: "Add ticket" }),
    ).toBeEnabled();
    expect(
      within(round1.getByRole("row", { name: /Day 2/ }))
        .getByRole("button", { name: "Add ticket" }),
    ).toBeDisabled();
    const round2 = within(screen.getByRole("region", { name: "Round 2" }));
    expect(
      within(round2.getByRole("row", { name: /Day 1/ }))
        .getByRole("button", { name: "Add ticket" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add Finals results" }))
      .toBeDisabled();
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

  it("summarizes Finals builds and win rates across round tickets", async () => {
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
        }}
        ticketBuildResults={{
          round1Day1: { 1: [{ buildId: buildA.id, slot: 1, wins: 5 }] },
          round1Day2: { 1: [{ buildId: buildC.id, slot: 2, wins: 0 }] },
          round2Day1: { 1: [{ buildId: buildB.id, slot: 1, wins: 3 }] },
          round2Day2: { 1: [{ buildId: buildB.id, slot: 1, wins: 2 }] },
        }}
        ticketCounts={ticketCounts}
        initialBuildIds={[buildA.id, null, null]}
        finalPlacement={2}
        availableBuilds={[buildA, buildB, buildC]}
        umaList={[
          { id: 1, charaId: 1, baseCharacterName: "Character A", outfitTitle: "Uma A" },
          { id: 2, charaId: 2, baseCharacterName: "Character B", outfitTitle: "Uma B" },
          { id: 3, charaId: 3, baseCharacterName: "Character C", outfitTitle: "Uma C" },
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
    expect(within(summary).getByText("2nd")).toBeInTheDocument();
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

  it("records team wins without build assignment and displays per-build results as N/A", async () => {
    const user = userEvent.setup();
    const onSaveTicket = vi.fn();
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
      onSaveTicket,
      onRemoveTicket: vi.fn(),
      onToggleRoundExcluded: vi.fn(),
      onSaveFinals: vi.fn(),
    };
    const { rerender } = render(<UmaBuildResults {...props} />);

    const day1 = within(screen.getByRole("region", { name: "Round 1" }))
      .getByRole("row", { name: /Day 1/ });
    await user.click(within(day1).getByRole("button", { name: "Add ticket" }));
    const dialog = screen.getByRole("dialog", {
      name: "Add ticket — Round 1 Day 1",
    });
    await user.click(within(dialog).getByRole("checkbox", {
      name: "Record team wins instead of per-build wins",
    }));
    fireEvent.change(within(dialog).getByRole("spinbutton", { name: "Team wins" }), {
      target: { value: "3" },
    });
    await user.click(within(dialog).getByRole("button", { name: "Submit ticket" }));
    expect(onSaveTicket).toHaveBeenCalledWith("round1Day1", 1, [], 3);

    rerender(
      <UmaBuildResults
        {...props}
        results={{
          ...props.results,
          round1Day1: [3, 0, 0, 0],
        }}
        ticketBuildResults={{ round1Day1: { 1: [] } }}
        ticketCounts={{ ...props.ticketCounts, round1Day1: 1 }}
      />,
    );
    const savedDay1 = within(screen.getByRole("region", { name: "Round 1" }))
      .getByRole("row", { name: /Day 1/ });
    expect(within(savedDay1).getByText("Per-build wins: N/A · Team wins: 3/5"))
      .toBeInTheDocument();
    expect(within(savedDay1).getByLabelText("Round 1 Day 1 win rate"))
      .toHaveTextContent("60% (3/5)");
    expect(screen.getByLabelText("Total win rate")).toHaveTextContent("60% WR");
    expect(screen.getByLabelText("Total win rate")).toHaveTextContent("3/5");
  });

  it("prevents ticket builds with duplicate base Umas and excludes plan builds", async () => {
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
        buildAssignments={{}}
        ticketBuildResults={{}}
        ticketCounts={createDefaultTicketCounts()}
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
    await user.click(
      within(within(screen.getByRole("region", { name: "Round 1" }))
        .getByRole("row", { name: /Day 1/ }))
        .getByRole("button", { name: "Add ticket" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Add ticket — Round 1 Day 1",
    });
    const firstBuildPicker = await openSavedBuildPicker(user, dialog, 1);
    const buildACard = within(firstBuildPicker).getByRole("button", { name: /Build A/ });
    expect(buildACard).toHaveTextContent("Uma A");
    expect(buildACard).toHaveTextContent("Character A");
    expect(buildACard).toHaveTextContent("Speed 1200");
    await user.click(buildACard);
    await user.click(within(dialog).getByRole("button", { name: "Add build" }));
    const secondBuildPicker = await openSavedBuildPicker(user, dialog, 2);
    expect(within(secondBuildPicker).queryByRole("button", { name: /Build B/ }))
      .not.toBeInTheDocument();
    expect(within(secondBuildPicker).queryByRole("button", { name: /Plan/ }))
      .not.toBeInTheDocument();
    expect(within(secondBuildPicker).getByRole("button", { name: /Build C/ }))
      .toBeInTheDocument();
    await user.click(within(secondBuildPicker).getByRole("button", {
      name: "Close saved builds",
    }));
  });

  it("adds a ticket with up to three builds and limits combined wins to five", async () => {
    const user = userEvent.setup();
    const onSaveTicket = vi.fn();
    const builds = [1, 2, 3, 4].map((slot) => ({
      ...createDefaultBuild(String(slot)),
      id: `build-${slot}`,
      event: "CM 42",
      name: `Build ${slot}`,
      lastUpdate: slot,
    }));

    const { unmount } = render(
      <UmaBuildResults
        event="CM 42"
        results={createDefaultTeamResults()}
        buildAssignments={{}}
        ticketBuildResults={{}}
        ticketCounts={createDefaultTicketCounts()}
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
      .getByRole("row", { name: /Day 1/ });
    await user.click(within(round1Day1).getByRole("button", { name: "Add ticket" }));

    const dialog = screen.getByRole("dialog", { name: "Add ticket — Round 1 Day 1" });
    await user.click(within(dialog).getByRole("button", { name: "Add build" }));
    await chooseSavedBuild(user, dialog, 1, /Build 1/);
    expect(within(dialog).getByRole("spinbutton", { name: "Wins for Build 1" }))
      .toHaveValue(0);
    await user.click(within(dialog).getByRole("button", { name: "Add build" }));
    await chooseSavedBuild(user, dialog, 2, /Build 2/);

    fireEvent.change(
      within(dialog).getByRole("spinbutton", { name: "Wins for Build 1" }),
      { target: { value: "4" } },
    );
    const secondWins = within(dialog).getByRole("spinbutton", {
      name: "Wins for Build 2",
    });
    expect(secondWins).toHaveAttribute("max", "1");
    fireEvent.change(secondWins, { target: { value: "2" } });
    expect(secondWins).toHaveValue(1);
    expect(within(dialog).getByText("Total wins: 5/5")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Add build" }));
    await chooseSavedBuild(user, dialog, 3, /Build 3/);
    expect(within(dialog).getAllByRole("button", { name: /Choose build for Uma/ }))
      .toHaveLength(3);
    expect(within(dialog).getByRole("button", { name: "Add build" })).toBeDisabled();

    await user.click(within(dialog).getByRole("button", { name: "Submit ticket" }));
    expect(onSaveTicket).toHaveBeenCalledWith("round1Day1", 1, [
      { slot: 1, buildId: "build-1", wins: 4 },
      { slot: 2, buildId: "build-2", wins: 1 },
      { slot: 3, buildId: "build-3", wins: 0 },
    ]);
    unmount();
  });

  it("copies the current team for the first ticket, then the previous ticket lineup", async () => {
    const user = userEvent.setup();
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
        onSaveTicket={vi.fn()}
        onRemoveTicket={vi.fn()}
        onToggleRoundExcluded={vi.fn()}
        onSaveFinals={vi.fn()}
      />,
    );

    const day1 = within(screen.getByRole("region", { name: "Round 1" }))
      .getByRole("row", { name: /Day 1/ });
    await user.click(within(day1).getByRole("button", { name: "Add ticket" }));
    const dialog = screen.getByRole("dialog", {
      name: "Add ticket — Round 1 Day 1",
    });
    expect(within(dialog).getAllByRole("button", { name: /Choose build for Uma/ }))
      .toHaveLength(3);
    [1, 2, 3].forEach((slot) => {
      const buildPicker = within(dialog).getByRole("button", {
        name: `Choose build for Uma ${slot}`,
      });
      expect(buildPicker).toHaveTextContent(`Build ${slot}`);
      expect(buildPicker).toHaveTextContent(`Uma ${slot}`);
      expect(buildPicker).toHaveTextContent(`Character ${slot}`);
      expect(
        within(dialog).getByRole("spinbutton", { name: `Wins for Build ${slot}` }),
      ).toHaveValue(0);
    });
    expect(within(dialog).getByRole("button", { name: "Add build" })).toBeDisabled();
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    const ticketCounts = { ...createDefaultTicketCounts(), round1Day1: 1 as const };
    rerender(
      <UmaBuildResults
        event="CM 42"
        results={{
          ...createDefaultTeamResults(),
          round1Day1: [2, 0, 0, 0],
        }}
        buildAssignments={{
          round1Day1: { 1: [{ buildId: "build-4", tickets: [1] }] },
        }}
        ticketBuildResults={{
          round1Day1: { 1: [{ buildId: "build-4", slot: 1, wins: 2 }] },
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
        onSaveTicket={vi.fn()}
        onRemoveTicket={vi.fn()}
        onToggleRoundExcluded={vi.fn()}
        onSaveFinals={vi.fn()}
      />,
    );
    const updatedDay1 = within(screen.getByRole("region", { name: "Round 1" }))
      .getByRole("row", { name: /Day 1/ });
    await user.click(within(updatedDay1).getByRole("button", { name: "Add ticket" }));
    const nextTicketDialog = screen.getByRole("dialog", {
      name: "Add ticket — Round 1 Day 1",
    });
    expect(within(nextTicketDialog).getByRole("button", { name: "Choose build for Uma 1" }))
      .toHaveTextContent("Build 4");
    expect(within(nextTicketDialog).getByRole("button", { name: "Choose build for Uma 2" }))
      .toHaveTextContent("Build 2");
    expect(within(nextTicketDialog).getByRole("button", { name: "Choose build for Uma 3" }))
      .toHaveTextContent("Build 3");
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
      .getByRole("row", { name: /Day 1/ });
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

  it("excludes round rows, saves null results, and allows the round to be restored", async () => {
    const user = userEvent.setup();
    const onToggleRoundExcluded = vi.fn();
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
      onRemoveTicket: vi.fn(),
      onToggleRoundExcluded,
      onSaveFinals: vi.fn(),
    };
    const { rerender } = render(<UmaBuildResults {...props} />);

    const round1 = screen.getByRole("region", { name: "Round 1" });
    expect(within(round1).getAllByRole("row")).toHaveLength(3);
    expect(screen.queryByRole("checkbox", { name: "Exclude Finals" })).not.toBeInTheDocument();
    const excludeRound1 = within(round1).getByRole("checkbox", { name: "Exclude Round 1" });
    expect(excludeRound1).not.toBeChecked();
    await user.click(excludeRound1);
    expect(onToggleRoundExcluded).toHaveBeenCalledWith("round1", true);

    const excludedResults = setTeamResultRoundExcluded(props.results, "round1", true);
    expect(excludedResults.round1Day1).toBeNull();
    expect(excludedResults.round1Day2).toBeNull();
    rerender(<UmaBuildResults {...props} results={excludedResults} />);

    expect(within(round1).queryByRole("row")).not.toBeInTheDocument();
    expect(within(round1).getByRole("checkbox", { name: "Exclude Round 1" }))
      .toBeChecked();
    await user.click(within(round1).getByRole("checkbox", { name: "Exclude Round 1" }));
    expect(onToggleRoundExcluded).toHaveBeenLastCalledWith("round1", false);
  });

});
