import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import UmaBuild from "../../src/components/UmaBuild/UmaBuild";
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
});
