import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import UmaBuild from "../../src/components/UmaBuild/editor/BuildEditor";
import UmaBuildDisplay from "../../src/components/UmaBuild/display/Display";
import { createDefaultBuild } from "../../src/features/planner/plannerTypes";

describe("UmaBuild aptitude selectors", () => {
  it("closes the aptitude selector when clicking outside it", async () => {
    const user = userEvent.setup();

    render(
      <UmaBuild
        teamNumber={1}
        value={createDefaultBuild()}
        onChange={vi.fn()}
        umaList={[]}
        selectedUma={null}
        onSelectUma={vi.fn()}
        skillList={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Surface aptitude A" }));
    expect(
      screen.getByRole("group", { name: "Surface aptitude options" }),
    ).toBeInTheDocument();

    await user.click(screen.getByText("Stats"));

    expect(
      screen.queryByRole("group", { name: "Surface aptitude options" }),
    ).not.toBeInTheDocument();
  });

  it("closes an aptitude selector when clicking elsewhere in the aptitude panel", async () => {
    const user = userEvent.setup();

    render(
      <UmaBuild
        teamNumber={1}
        value={createDefaultBuild()}
        onChange={vi.fn()}
        umaList={[]}
        selectedUma={null}
        onSelectUma={vi.fn()}
        skillList={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Surface aptitude A" }));
    expect(
      screen.getByRole("group", { name: "Surface aptitude options" }),
    ).toBeInTheDocument();

    await user.click(screen.getByText("Distance"));

    expect(
      screen.queryByRole("group", { name: "Surface aptitude options" }),
    ).not.toBeInTheDocument();
  });

  it("closes the strategy selector when clicking outside it", async () => {
    const user = userEvent.setup();

    render(
      <UmaBuild
        teamNumber={1}
        value={createDefaultBuild()}
        onChange={vi.fn()}
        umaList={[]}
        selectedUma={null}
        onSelectUma={vi.fn()}
        skillList={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Strategy Senkou" }));
    expect(screen.getByRole("group", { name: "Strategy options" })).toBeInTheDocument();

    await user.click(screen.getByText("Stats"));

    expect(screen.queryByRole("group", { name: "Strategy options" })).not.toBeInTheDocument();
  });

  it("marks an edited build as a plan when the checkbox is checked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <UmaBuild
        teamNumber={1}
        value={createDefaultBuild()}
        onChange={onChange}
        umaList={[]}
        selectedUma={null}
        onSelectUma={vi.fn()}
        skillList={[]}
      />,
    );

    const planCheckbox = screen.getByRole("checkbox", { name: "Plan build" });
    expect(planCheckbox.closest("label")?.firstElementChild).toBe(planCheckbox);
    expect(planCheckbox.closest("label")).toHaveTextContent("Plan");
    await user.click(planCheckbox);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ "build-type": "plan" }),
    );
  });

  it("opens the saved-build picker from the editor toolbar", async () => {
    const user = userEvent.setup();
    const onSelectSavedBuild = vi.fn();
    const savedBuild = {
      ...createDefaultBuild("100101"),
      id: "build-1",
      event: "CM 42",
      name: "Build 1",
      lastUpdate: 1,
    };

    render(
      <UmaBuild
        teamNumber={1}
        value={createDefaultBuild()}
        onChange={vi.fn()}
        umaList={[
          {
            id: 100101,
            charaId: 1,
            outfitTitle: "Classic",
            baseCharacterName: "Special Week",
          },
        ]}
        selectedUma={null}
        onSelectUma={vi.fn()}
        skillList={[]}
        savedBuilds={[savedBuild]}
        onSelectSavedBuild={onSelectSavedBuild}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Load" }));
    expect(screen.getByRole("heading", { name: "Load a saved build" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Build 1/ }));

    expect(onSelectSavedBuild).toHaveBeenCalledWith("build-1");
  });

  it("copies a saved build from the editor toolbar", async () => {
    const user = userEvent.setup();
    const onCopySavedBuild = vi.fn();
    const savedBuild = {
      ...createDefaultBuild("100101"),
      id: "build-1",
      event: "CM 42",
      name: "Build 1",
      lastUpdate: 1,
    };

    render(
      <UmaBuild
        teamNumber={1}
        value={createDefaultBuild()}
        onChange={vi.fn()}
        umaList={[
          {
            id: 100101,
            charaId: 1,
            outfitTitle: "Classic",
            baseCharacterName: "Special Week",
          },
        ]}
        selectedUma={null}
        onSelectUma={vi.fn()}
        skillList={[]}
        savedBuilds={[savedBuild]}
        onSelectSavedBuild={vi.fn()}
        onCopySavedBuild={onCopySavedBuild}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(screen.getByRole("heading", { name: "Copy a saved build" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Build 1/ }));

    expect(onCopySavedBuild).toHaveBeenCalledWith("build-1");
  });

  it("shows an inline duplicate-name error for a new build", async () => {
    const user = userEvent.setup();
    const savedBuild = {
      ...createDefaultBuild("100101"),
      id: "build-1",
      event: "CM 42",
      name: "Existing build",
      lastUpdate: 1,
    };

    render(
      <UmaBuild
        teamNumber={1}
        value={createDefaultBuild("100101")}
        onChange={vi.fn()}
        umaList={[]}
        selectedUma={{
          id: 100101,
          charaId: 1,
          outfitTitle: "Classic",
          baseCharacterName: "Special Week",
        }}
        onSelectUma={vi.fn()}
        skillList={[]}
        savedBuilds={[savedBuild]}
        onSaveBuild={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));
    const nameInput = screen.getByRole("textbox", { name: "Build name" });
    await user.clear(nameInput);
    await user.type(nameInput, savedBuild.name);

    const duplicateError = screen.getByRole("alert");
    expect(duplicateError).toHaveTextContent("already exists");
    expect(nameInput.nextElementSibling).toBe(duplicateError);
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
  });

  it("shows a plan label in the Uma display box for plan builds", () => {
    const build = {
      ...createDefaultBuild(),
      "build-type": "plan" as const,
      id: "build-1",
      event: "CM 42",
      name: "Plan",
      lastUpdate: 1,
    };

    render(
      <UmaBuildDisplay
        teamNumber={1}
        build={build}
        availableBuilds={[]}
        umaList={[]}
        skillList={[]}
        onSelectBuild={vi.fn()}
      />,
    );

    expect(screen.getByText("PLAN").closest('[aria-label="Selected Uma"]')).toBeInTheDocument();
  });

  it("displays legacy Sashi strategies as Sasi", () => {
    const build = {
      ...createDefaultBuild("100101"),
      strategy: "Sashi",
      id: "build-1",
      event: "CM 42",
      name: "Build 1",
      lastUpdate: 1,
    };

    render(
      <UmaBuildDisplay
        teamNumber={1}
        build={build}
        availableBuilds={[build]}
        umaList={[]}
        skillList={[]}
        onSelectBuild={vi.fn()}
      />,
    );

    expect(screen.getByAltText("Sasi")).toBeInTheDocument();
    expect(screen.queryByAltText("Sashi")).not.toBeInTheDocument();
  });

  it.each([
    { currentMood: -1, copiedMood: 2 },
    { currentMood: 2, copiedMood: 2 },
  ])("copies Sashi builds as Sasi with mood set to 2", async ({ currentMood, copiedMood }) => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const build = {
      ...createDefaultBuild("100101"),
      strategy: "Sashi",
      mood: currentMood,
      id: "build-1",
      event: "CM 42",
      name: "Build 1",
      lastUpdate: 1,
    };

    try {
      render(
        <UmaBuildDisplay
          teamNumber={1}
          build={build}
          availableBuilds={[build]}
          umaList={[]}
          skillList={[]}
          onSelectBuild={vi.fn()}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Copy build JSON" }));

      expect(JSON.parse(writeText.mock.calls[0][0])).toMatchObject({
        strategy: "Sasi",
        mood: copiedMood,
      });
      expect(build.mood).toBe(currentMood);
    } finally {
      if (clipboardDescriptor) {
        Object.defineProperty(navigator, "clipboard", clipboardDescriptor);
      } else {
        Reflect.deleteProperty(navigator, "clipboard");
      }
    }
  });

  it("allows clearing a selected team build", async () => {
    const user = userEvent.setup();
    const onSelectBuild = vi.fn();
    const build = {
      ...createDefaultBuild("100101"),
      id: "build-1",
      event: "CM 42",
      name: "Build 1",
      lastUpdate: 1,
    };

    render(
      <UmaBuildDisplay
        teamNumber={1}
        build={build}
        availableBuilds={[build]}
        umaList={[]}
        skillList={[]}
        canClearBuild
        onSelectBuild={onSelectBuild}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Swap" }));
    await user.click(screen.getByRole("button", { name: "Clear selected build" }));
    expect(onSelectBuild).toHaveBeenCalledWith(null);
  });

  it("allows adding a saved build to an empty display slot", async () => {
    const user = userEvent.setup();
    const onSelectBuild = vi.fn();
    const build = {
      ...createDefaultBuild("100101"),
      id: "build-1",
      event: "CM 42",
      name: "Build 1",
      lastUpdate: 1,
    };

    render(
      <UmaBuildDisplay
        teamNumber={1}
        build={null}
        availableBuilds={[build]}
        umaList={[
          {
            id: 100101,
            charaId: 1,
            outfitTitle: "Classic",
            baseCharacterName: "Special Week",
          },
        ]}
        skillList={[]}
        onSelectBuild={onSelectBuild}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Select build" }));
    await user.click(screen.getByRole("button", { name: /Build 1/ }));

    expect(onSelectBuild).toHaveBeenCalledWith("build-1");
  });

  it("selects a mobile team build for details without copy or swap controls", async () => {
    const user = userEvent.setup();
    const onToggleMobileDetails = vi.fn();
    const build = {
      ...createDefaultBuild("100101"),
      id: "build-1",
      event: "CM 42",
      name: "Build 1",
      lastUpdate: 1,
    };

    render(
      <UmaBuildDisplay
        teamNumber={1}
        build={build}
        availableBuilds={[build]}
        umaList={[]}
        skillList={[]}
        onSelectBuild={vi.fn()}
        showCopyButton={false}
        showSwapButton={false}
        mobileSummary
        onToggleMobileDetails={onToggleMobileDetails}
      />,
    );

    const teamBuild = screen.getByRole("button", { name: "Build Uma 1" });
    await user.click(teamBuild);

    expect(onToggleMobileDetails).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Swap" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copy build JSON" })).not.toBeInTheDocument();
  });
});
