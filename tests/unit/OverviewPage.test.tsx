import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OverviewPage from "../../src/pages/OverviewPage";
import { EventProvider } from "../../src/contexts/EventContext";
import { fetchAndCacheOverview, getCachedOverview } from "../../src/lib/data";

describe("OverviewPage", () => {
  let overviewPayload: unknown;
  let overviewNextUpdate: string | undefined;

  beforeEach(() => {
    overviewNextUpdate = undefined;
    localStorage.setItem("selectedEvent", "CM 42/Final");
    overviewPayload = {
      userCount: 10,
      outfits: {
        "1": 3,
        "2": 2,
        "3": 1,
        "4": 4,
        "5": 5,
        "6": 6,
      },
      runningStyleCombinations: {
        "Nige,Nige,Nige": 1,
      },
    };
    vi.stubEnv("VITE_R2_BASE_URL", "https://cdn.example.com");
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function () {
      return this.classList.contains("overview-popup__list-viewport") ? 420 : 80;
    });
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(800);
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
              skills: {
                path: "data/skills.json",
                version: 1,
                sha256: "skills",
              },
              supportCards: {
                path: "data/supportCards.json",
                version: 1,
                sha256: "supportCards",
              },
            },
          }
          : url.includes("/data/overview/")
            ? {
              sha256: "overview",
              ...(overviewNextUpdate ? { nextUpdate: overviewNextUpdate } : {}),
              data: overviewPayload,
            }
            : url.includes("/data/skills.json")
              ? {
                sha256: "skills",
                data: [{ id: "100211", name: "Corner Adept", iconId: 211 }],
              }
            : url.includes("/data/supportCards.json")
              ? {
                sha256: "supportCards",
                data: [
                  { id: 20012, title: "Speed Training", uma: "Kitasan Black" },
                  { id: 20031, title: "Stamina Training", uma: "Super Creek" },
                  { id: 30010, title: "Card 30010", uma: "Uma 30010" },
                  { id: 30016, title: "Card 30016", uma: "Uma 30016" },
                  { id: 30028, title: "Card 30028", uma: "Uma 30028" },
                  { id: 30074, title: "Card 30074", uma: "Uma 30074" },
                  { id: 30137, title: "Card 30137", uma: "Uma 30137" },
                  { id: 30153, title: "Card 30153", uma: "Uma 30153" },
                  { id: 30157, title: "Card 30157", uma: "Uma 30157" },
                  { id: 30158, title: "Card 30158", uma: "Uma 30158" },
                  { id: 30159, title: "Wisdom Training", uma: "Fine Motion" },
                  { id: 30160, title: "Card 30160", uma: "Uma 30160" },
                  { id: 30161, title: "Card 30161", uma: "Uma 30161" },
                ],
              }
            : {
              sha256: "outfits",
              data: [
                { id: 1, charaId: 10, outfitTitle: "Classic", baseCharacterName: "Special Week" },
                { id: 2, charaId: 20, outfitTitle: "Uniform", baseCharacterName: "Silence Suzuka" },
                { id: 3, charaId: 30, outfitTitle: "Wedding", baseCharacterName: "Grass Wonder" },
                { id: 100201, charaId: 10, outfitTitle: "Crimson Runner", baseCharacterName: "Special Week" },
                { id: 100501, charaId: 20, outfitTitle: "Skyline", baseCharacterName: "Silence Suzuka" },
                { id: 102101, charaId: 30, outfitTitle: "Moonlight", baseCharacterName: "Grass Wonder" },
              ],
            };

        return { ok: true, json: async () => body } as Response;
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("caches event data and displays outfits and team setups with instance counts", async () => {
    render(
      <EventProvider>
        <OverviewPage />
      </EventProvider>,
    );

    expect(await screen.findAllByText("Classic")).not.toHaveLength(0);
    expect(screen.getByRole("heading", { name: "Outfits", level: 3 })).toBeInTheDocument();
    expect(screen.getByText("Team setups")).toBeInTheDocument();
    const outfitList = screen.getByRole("list", { name: "Outfits" });
    expect(within(outfitList).getAllByRole("listitem")).toHaveLength(5);
    expect(within(outfitList).queryByText("Wedding")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Expand" }));
    const outfitDialog = screen.getByRole("dialog", { name: "Outfits" });
    const allOutfits = within(outfitDialog).getByRole("list", { name: "Outfits all" });
    expect(allOutfits.querySelectorAll("li")).toHaveLength(6);
    fireEvent.click(within(outfitDialog).getByRole("button", { name: "Close" }));
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getAllByText("1")).toHaveLength(1);
    expect(screen.queryByText("Running style")).not.toBeInTheDocument();
    expect(screen.getAllByAltText("Nige")).toHaveLength(3);
    const stylePanel = screen.getByRole("heading", { name: "Style-specific stats" }).closest("section");
    expect(
      Array.from(stylePanel?.querySelectorAll(".overview-style-button") ?? [])
        .map((button) => button.textContent?.trim()),
    ).toEqual(["Runaway", "Front", "Pace", "Late", "End"]);
    expect(within(stylePanel as HTMLElement).getByText("No average stat data available."))
      .toBeInTheDocument();
    expect(within(stylePanel as HTMLElement).getByText("No outfit data available."))
      .toBeInTheDocument();
    expect(within(stylePanel as HTMLElement).getByText("No skill data available."))
      .toBeInTheDocument();
    expect(within(stylePanel as HTMLElement).getByText("No support card data available."))
      .toBeInTheDocument();
    expect(await getCachedOverview("CM 42/Final")).toEqual({
      userCount: 10,
      outfits: {
        "1": 3,
        "2": 2,
        "3": 1,
        "4": 4,
        "5": 5,
        "6": 6,
      },
      runningStyleCombinations: { "Nige,Nige,Nige": 1 },
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://cdn.example.com/data/overview/CM%2042%2FFinal.json",
      { cache: "no-store" },
    );
  });

  it("expires cached overview data at its nextUpdate timestamp", async () => {
    const event = "Cache expiry test";
    const now = Date.now();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
    const payload = {
      outfits: { "1": 1 },
    };
    overviewPayload = payload;
    overviewNextUpdate = new Date(now + 60_000).toISOString();
    const expectedData = { ...payload, nextUpdate: overviewNextUpdate };

    try {
      await fetchAndCacheOverview(event);
      expect(await getCachedOverview(event)).toEqual(expectedData);

      vi.setSystemTime(now + 60_001);
      expect(await getCachedOverview(event)).toBeUndefined();

      vi.setSystemTime(now + 59_999);
      expect(await getCachedOverview(event)).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows total build usage and interactive style-specific statistics", async () => {
    const nextUpdate = new Date(Date.now() + 60_000).toISOString();
    overviewPayload = {
      userCount: 1,
      outfits: {
        "100201": 1,
        "100501": 1,
        "102101": 1,
      },
      skills: {
        "100211": 1,
        "100212": 1,
        "100213": 1,
        "100214": 1,
        "100215": 1,
        "100216": 1,
        "100217": 1,
      },
      supportCards: {
        "20012": 1,
        "20031": 1,
        "30010": 1,
        "30016": 1,
        "30028": 1,
        "30074": 1,
        "30137": 1,
        "30153": 1,
        "30157": 1,
        "30158": 1,
        "30159": 2,
        "30160": 1,
        "30161": 1,
      },
      runningStyles: [
        {
          style: "Oikomi",
          count: 1,
          outfits: { "102101": 1 },
          skills: {
            "100211": 1,
            "100212": 1,
            "100213": 1,
            "100214": 1,
            "100215": 1,
            "100216": 1,
            "100217": 1,
          },
          supportCards: {
            "20012": 1,
            "20031": 1,
            "30010": 1,
            "30016": 1,
            "30028": 1,
            "30074": 1,
          },
          averageStats: {
            guts: 528,
            power: 878,
            speed: 1200,
            stamina: 1025,
            wisdom: 902,
          },
        },
        {
          style: "Oonige",
          count: 1,
          outfits: { "100201": 1 },
          skills: {},
          supportCards: {
            "30137": 1,
            "30153": 1,
            "30157": 1,
            "30158": 1,
            "30159": 2,
            "30160": 1,
            "30161": 1,
          },
          averageStats: {},
        },
        {
          style: "Senkou",
          count: 1,
          outfits: { "100501": 1 },
          skills: { "100051": 1 },
          supportCards: {},
          averageStats: {
            guts: 400,
            power: 800,
            speed: 1200,
            stamina: 1200,
            wisdom: 400,
          },
        },
      ],
      runningStyleCombinations: {
        "Oikomi,Oonige,Senkou": 1,
      },
    };
    overviewNextUpdate = nextUpdate;

    render(
      <EventProvider>
        <OverviewPage />
      </EventProvider>,
    );

    expect(await screen.findByText("1 user · 3 builds taken into account")).toBeInTheDocument();
    expect(await getCachedOverview("CM 42/Final"))
      .toEqual(expect.objectContaining({ nextUpdate }));
    const summaryRow = screen.getByText("1 user · 3 builds taken into account").parentElement;
    expect(summaryRow).toHaveClass("overview-summary-row");
    expect(within(summaryRow as HTMLElement).getByRole("timer"))
      .toHaveTextContent("Next update in");
    expect(screen.getByRole("heading", { name: "Support card usage" })).toBeInTheDocument();
    const infoButton = screen.getByRole("button", {
      name: "Support card percentage information",
    });
    fireEvent.click(infoButton);
    expect(infoButton).toHaveAttribute("aria-expanded", "true");
    expect(infoButton.parentElement).toHaveClass("is-open");
    expect(screen.getByText(/Percentages estimate build usage/)).toBeInTheDocument();
    fireEvent.click(infoButton);
    const globalPanel = screen.getByRole("heading", { name: "Support card usage" }).closest("section");
    const globalCard = within(globalPanel as HTMLElement).getByText("Speed Training").closest("li");
    expect(globalCard).toHaveClass("overview-style-item");
    expect(globalCard?.textContent).toMatch(/33[,.]3%/);
    expect(globalCard).toHaveTextContent("Kitasan Black");
    expect(globalCard?.querySelector("img")).toHaveClass("overview-style-item__image");
    expect(globalCard?.querySelector("img")).toHaveAttribute(
      "src",
      expect.stringMatching(/\/images\/support_cards\/full\/20012\.png$/),
    );
    const globalCardList = within(globalPanel as HTMLElement).getByRole("list", {
      name: "Support card usage",
    });
    expect(within(globalCardList).getAllByRole("listitem")).toHaveLength(6);
    fireEvent.click(within(globalPanel as HTMLElement).getByRole("button", { name: "Expand" }));
    const globalCardDialog = screen.getByRole("dialog", { name: "Support card usage" });
    expect(within(globalCardList).getAllByRole("listitem")).toHaveLength(6);
    const allCardsList = within(globalCardDialog).getByRole("list", {
      name: "Support card usage all",
    });
    expect(within(allCardsList).getAllByRole("listitem")).toHaveLength(13);
    fireEvent.click(within(globalCardDialog).getByRole("button", { name: "Close" }));

    const stylePanel = screen.getByRole("heading", { name: "Style-specific stats" }).closest("section");
    await screen.findByRole("button", { name: "Runaway" });
    expect(
      Array.from(stylePanel?.querySelectorAll(".overview-style-button") ?? [])
        .map((button) => button.textContent?.trim()),
    ).toEqual(["Runaway", "Front", "Pace", "Late", "End"]);
    fireEvent.click(screen.getByRole("button", { name: "End" }));
    expect(screen.getByText("Speed")).toBeInTheDocument();
    const usageRow = screen.getByRole("heading", { name: "Skills", level: 3 }).closest("section");
    expect(usageRow?.parentElement).toHaveClass("overview-global-usage-columns");
    expect(within(usageRow as HTMLElement).getByText("Corner Adept").closest("li"))
      .toHaveTextContent(/33[,.]3%/);
    expect(within(stylePanel as HTMLElement).getByText("Corner Adept").closest("li"))
      .toHaveTextContent("100%");
    const averageStatsPanel = within(stylePanel as HTMLElement)
      .getByRole("heading", { name: "Average stats" })
      .closest("section");
    expect(averageStatsPanel).toHaveClass("overview-style-average-stats");
    expect(averageStatsPanel?.nextElementSibling).toHaveClass("overview-style-columns");
    expect(
      Array.from(averageStatsPanel?.querySelectorAll(".overview-average-stat__value") ?? [])
        .map((value) => value.parentElement?.querySelector(".overview-average-stat__label-full")?.textContent),
    ).toEqual(["Speed", "Stamina", "Power", "Guts", "Wit"]);
    expect(
      Array.from(averageStatsPanel?.querySelectorAll(".overview-average-stat__label-short") ?? [])
        .map((label) => label.textContent),
    ).toEqual(["SPE", "STA", "POW", "GUTS", "WIT"]);
    const speedStat = within(averageStatsPanel as HTMLElement).getByText("Speed").closest("li");
    expect(speedStat?.querySelector("img")).toHaveAttribute(
      "src",
      "/icons/statrank/rank_17.png",
    );
    const styleSkillsPanel = within(stylePanel as HTMLElement)
      .getByRole("heading", { name: "Skills" })
      .closest("section");
    const styleSkillsList = within(styleSkillsPanel as HTMLElement).getByRole("list", {
      name: "Style skills",
    });
    expect(within(styleSkillsList).getAllByRole("listitem")).toHaveLength(6);
    fireEvent.click(within(styleSkillsPanel as HTMLElement).getByRole("button", { name: "Expand" }));
    const skillsDialog = screen.getByRole("dialog", { name: "Skills" });
    expect(
      within(skillsDialog).getByRole("list", { name: "Style skills all" }).querySelectorAll("li"),
    ).toHaveLength(7);
    fireEvent.click(within(skillsDialog).getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Runaway" }));
    expect(screen.getByText("1 build taken into account")).toBeInTheDocument();
    expect(screen.getByText("1 build taken into account").parentElement)
      .toHaveClass("overview-style-panel__heading");
    expect(screen.getByRole("button", { name: "Runaway" })).toHaveAttribute("aria-pressed", "true");
    const styleOutfitsList = within(
      within(stylePanel as HTMLElement)
        .getByRole("heading", { name: "Outfits" })
        .closest("section") as HTMLElement,
    ).getByRole("list", { name: "Style outfits" });
    const styleOutfit = within(styleOutfitsList).getByText("Crimson Runner").closest("li");
    expect(styleOutfit).toHaveTextContent("Special Week");
    const supportCardsPanel = within(stylePanel as HTMLElement)
      .getByRole("heading", { name: "Support cards" })
      .closest("section");
    const visibleStyleSupportCards = within(supportCardsPanel as HTMLElement).getByRole("list", {
      name: "Style support cards",
    });
    expect(within(visibleStyleSupportCards).getAllByRole("listitem")).toHaveLength(4);
    fireEvent.click(within(supportCardsPanel as HTMLElement).getByRole("button", { name: "Expand" }));
    const styleSupportDialog = screen.getByRole("dialog", { name: "Support cards" });
    const styleSupportList = within(styleSupportDialog).getByRole("list", {
      name: "Style support cards all",
    });
    expect(styleSupportList).toHaveClass("overview-support-card-list");
    expect(within(styleSupportList).getAllByRole("listitem")).toHaveLength(7);
    const styleCard = within(styleSupportList).getByText("Wisdom Training").closest("li");
    expect(styleCard).toHaveTextContent("Fine Motion");
    expect(styleCard).toHaveTextContent("100%");
    expect(styleCard?.querySelector("img")).toHaveAttribute(
      "src",
      expect.stringMatching(/\/images\/support_cards\/full\/30159\.png$/),
    );
  });
});
