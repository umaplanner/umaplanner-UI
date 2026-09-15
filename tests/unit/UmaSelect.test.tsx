import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import UmaSelect from "../../src/components/UmaSelect";
import type { UmaEntry } from "../../src/types/UmaEntry";

const umas: UmaEntry[] = [
  {
    id: 1,
    charaId: 10,
    outfitTitle: "Brave",
    baseCharacterName: "Special Week",
  },
  {
    id: 2,
    charaId: 11,
    outfitTitle: "Cute",
    baseCharacterName: "Silence Suzuka",
  },
];

describe("UmaSelect", () => {
  it("opens a searchable card popup", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <UmaSelect
        teamNumber={2}
        umaList={umas}
        value={null}
        onChange={onChange}
      />,
    );

    expect(screen.getByText("Uma 2:")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Select an Uma for team 2" }),
    );
    expect(screen.getByRole("dialog", { name: "Select Uma 2" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search by outfit or character")).toBeInTheDocument();
    expect(screen.getByText("Brave")).toBeInTheDocument();
    expect(screen.getByText("Special Week")).toBeInTheDocument();
    expect(screen.getByText("Cute")).toBeInTheDocument();
    expect(screen.getByText("Silence Suzuka")).toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(2);
  });

  it("reports the selected Uma", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <UmaSelect
        teamNumber={1}
        umaList={umas}
        value={null}
        onChange={onChange}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Select an Uma for team 1" }),
    );
    await user.click(screen.getAllByRole("button", { name: /Brave/ })[0]);

    expect(onChange.mock.calls[0]?.[0]).toEqual(umas[0]);
  });

  it("clears the search when the popup is closed", async () => {
    const user = userEvent.setup();

    render(
      <UmaSelect
        teamNumber={1}
        umaList={umas}
        value={null}
        onChange={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Select an Uma for team 1" }),
    );

    const searchInput = screen.getByPlaceholderText(
      "Search by outfit or character",
    );
    await user.type(searchInput, "Brave");
    await user.click(screen.getByRole("button", { name: "Close Uma selector" }));

    await user.click(
      screen.getByRole("button", { name: "Select an Uma for team 1" }),
    );

    expect(
      screen.getByPlaceholderText("Search by outfit or character"),
    ).toHaveValue("");
  });
});
