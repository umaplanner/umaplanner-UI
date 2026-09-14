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
  it("renders the team label and searchable options", async () => {
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

    await user.click(screen.getByRole("combobox"));
    expect(screen.getByText("Brave Special Week")).toBeInTheDocument();
    expect(screen.getByText("Cute Silence Suzuka")).toBeInTheDocument();
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

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByText("Brave Special Week"));

    expect(onChange.mock.calls[0]?.[0]).toEqual(umas[0]);
  });
});
