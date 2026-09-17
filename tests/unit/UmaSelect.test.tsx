import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UmaSelect from "../../src/components/UmaSelect";
import { loadDataFromR2 } from "../../src/lib/data";
import type { UmaEntry } from "../../src/types/UmaEntry";

const umas: UmaEntry[] = [
  {
    id: 1,
    charaId: 10,
    outfitTitle: "Brave",
    baseCharacterName: "Special Week",
    "stat-boosts": {
      guts: 0,
      power: 0,
      speed: 0,
      stamina: 20,
      wisdom: 10,
    },
    runningStyle: 1,
    distance: {
      sprint: 1,
      mile: 2,
      medium: 3,
      long: 4,
      front: 5,
      pace: 6,
      late: 7,
      end: 8,
      turf: 9,
      dirt: 10,
    },
  },
  {
    id: 2,
    charaId: 11,
    outfitTitle: "Cute",
    baseCharacterName: "Silence Suzuka",
    "stat-boosts": {
      guts: 0,
      power: 0,
      speed: 10,
      stamina: 0,
      wisdom: 20,
    },
    runningStyle: 2,
    distance: {
      sprint: 2,
      mile: 3,
      medium: 4,
      long: 5,
      front: 6,
      pace: 7,
      late: 8,
      end: 9,
      turf: 10,
      dirt: 11,
    },
  },
];

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

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
    expect(
      screen.getAllByRole("img").every(
        (image) => image.getAttribute("loading") === "lazy",
      ),
    ).toBe(true);
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

describe("loadDataFromR2", () => {
  it("loads versioned datasets referenced by the manifest", async () => {
    vi.stubEnv("VITE_R2_BASE_URL", "https://cdn.example.com");

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            "base-umas": {
              path: "data/base-umas/v1.json",
              version: 1,
              sha256: "base",
            },
            outfits: {
              path: "data/outfits/v2.json",
              version: 2,
              sha256: "outfits",
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sha256: "sha256:base",
          data: [{ id: 1 }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sha256: "sha256:outfits",
          data: [{ id: 1, charaId: 10 }],
        }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const result = await loadDataFromR2();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[0]).toMatch(
      /^https:\/\/cdn\.example\.com\/manifest\.json\?cacheBust=/,
    );
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("https://cdn.example.com/data/base-umas/v1.json?sha256="),
        expect.stringContaining("https://cdn.example.com/data/outfits/v2.json?sha256="),
      ]),
    );
    expect(result.outfits).toEqual([{ id: 1, charaId: 10 }]);
  });
});
