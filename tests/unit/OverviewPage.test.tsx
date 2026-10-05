import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OverviewPage from "../../src/pages/OverviewPage";
import { EventProvider } from "../../src/contexts/EventContext";
import { getCachedOverview } from "../../src/lib/data";

describe("OverviewPage", () => {
  beforeEach(() => {
    localStorage.setItem("selectedEvent", "CM 42/Final");
    vi.stubEnv("VITE_R2_BASE_URL", "https://cdn.example.com");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        const body = url.includes("/manifest.json")
          ? {
            data: {
              outfits: {
                path: "data/outfits.json",
                version: 1,
                sha256: "outfits",
              },
            },
          }
          : url.includes("/data/overview/")
            ? {
              sha256: "overview",
              data: {
                userCount: 10,
                outfits: {
                  "1": 3,
                  "2": 2,
                  "3": 1,
                },
                runningStyleCombinations: {
                  "Nige,Nige,Nige": 1,
                },
              },
            }
            : {
              sha256: "outfits",
              data: [
                { id: 1, charaId: 10, outfitTitle: "Classic", baseCharacterName: "Special Week" },
                { id: 2, charaId: 20, outfitTitle: "Uniform", baseCharacterName: "Silence Suzuka" },
                { id: 3, charaId: 30, outfitTitle: "Wedding", baseCharacterName: "Grass Wonder" },
              ],
            };

        return { ok: true, json: async () => body } as Response;
      }),
    );
  });

  it("caches event data and displays outfits and team setups with instance counts", async () => {
    render(
      <EventProvider>
        <OverviewPage />
      </EventProvider>,
    );

    expect(await screen.findAllByText("Classic")).not.toHaveLength(0);
    expect(screen.getByText("Outfits")).toBeInTheDocument();
    expect(screen.getByText("Team setups")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getAllByText("1")).toHaveLength(2);
    expect(screen.queryByText("Running style")).not.toBeInTheDocument();
    expect(screen.getAllByAltText("Nige")).toHaveLength(3);
    expect(await getCachedOverview("CM 42/Final")).toEqual({
      userCount: 10,
      outfits: { "1": 3, "2": 2, "3": 1 },
      runningStyleCombinations: { "Nige,Nige,Nige": 1 },
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://cdn.example.com/data/overview/CM%2042%2FFinal.json",
      { cache: "no-store" },
    );
  });
});
