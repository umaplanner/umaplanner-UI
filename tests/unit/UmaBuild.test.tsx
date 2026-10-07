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
    expect(planCheckbox.closest("label")).toHaveTextContent("plan");
    await user.click(planCheckbox);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ "build-type": "plan" }),
    );
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
