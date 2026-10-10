import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminPage from "../../src/pages/AdminPage";
import { useAuth } from "../../src/contexts/AuthContext";
import { EventProvider } from "../../src/contexts/EventContext";

vi.mock("../../src/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

function mockResponse(body: unknown, ok = true) {
  return {
    ok,
    status: ok ? 200 : 500,
    text: async () => typeof body === "string" ? body : JSON.stringify(body),
  } as Response;
}

function renderAdminPage() {
  return render(
    <MemoryRouter>
      <EventProvider>
        <AdminPage />
      </EventProvider>
    </MemoryRouter>,
  );
}

describe("AdminPage", () => {
  beforeEach(() => {
    localStorage.setItem("selectedEvent", "Cup 42/Final");
    vi.mocked(useAuth).mockReturnValue({
      user: {
        username: "admin",
        avatarUrl: "",
        isAdmin: true,
      },
      isLoading: false,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/admin/stats/max-days")) {
          return mockResponse({
            maxDays: 8,
            earliestDate: "2026-10-03",
            latestDate: "2026-10-10",
          });
        }
        if (url.includes("/admin/stats/events")) {
          return mockResponse({
            dailyCounts: [
              { date: "2026-10-07", event: "Cup A", teams: 1 },
              { date: "2026-10-08", event: "Cup A", teams: 2 },
              { date: "2026-10-09", event: "Cup A", teams: 3 },
              { date: "2026-10-10", event: "Cup A", teams: 4 },
            ],
          });
        }
        return mockResponse({
          dailyCounts: [
            { date: "2026-10-07", users: 2, builds: 2 },
            { date: "2026-10-08", users: 4, builds: 4 },
            { date: "2026-10-09", users: 6, builds: 6 },
            { date: "2026-10-10", users: 8, builds: 8 },
          ],
        });
      }),
    );
  });

  it("shows daily count cards and percentage comparisons", async () => {
    renderAdminPage();

    expect(await screen.findByRole("heading", { name: "Overall daily counts" })).toBeInTheDocument();
    expect(await screen.findAllByRole("heading", { name: "2026-10-10" })).toHaveLength(2);
    const positiveChanges = screen.getAllByText("+300%");
    expect(positiveChanges).toHaveLength(3);
    expect(positiveChanges[0]).toHaveClass("admin-change-positive");
    expect(screen.getAllByText("Users")).toHaveLength(8);
    expect(screen.getAllByText("Builds")).toHaveLength(8);
    expect(screen.getAllByText("Teams")).toHaveLength(8);
    const periodSelector = screen.getByRole("combobox", { name: "Comparison period" });
    expect(periodSelector).toBeInTheDocument();
    expect(await screen.findByRole("option", { name: "Last 7 days" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Last 1 day" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Last 3 days" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Last 7 days" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Last 14 days" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Data available from 2026-10-03 to 2026-10-10 (8 days).",
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/admin\/stats\?compareTo=3$/),
      expect.objectContaining({ credentials: "include" }),
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/admin\/stats\/events\?event=Cup%2042%2FFinal&compareTo=3$/),
      expect.objectContaining({ credentials: "include" }),
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/admin\/stats\/max-days$/),
      expect.objectContaining({ credentials: "include" }),
    );
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch).not.toHaveBeenCalledWith(
      expect.stringMatching(/\?days=/),
      expect.anything(),
    );
    expect(fetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/admin/moderators"),
      expect.anything(),
    );
  });

  it("changes the selected comparison period", async () => {
    renderAdminPage();

    const periodSelector = await screen.findByRole("combobox", {
      name: "Comparison period",
    });
    await screen.findByRole("option", { name: "Last 7 days" });
    fireEvent.change(periodSelector, { target: { value: "7" } });
    expect(periodSelector).toHaveValue("7");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/admin\/stats\?compareTo=7$/),
      expect.objectContaining({ credentials: "include" }),
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/admin\/stats\/events\?event=Cup%2042%2FFinal&compareTo=7$/),
      expect.objectContaining({ credentials: "include" }),
    );
    expect(fetch).toHaveBeenCalledTimes(5);
  });

  it("shows separate metric fields when some counts are missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/admin/stats/max-days")) {
          return mockResponse({ maxDays: 1 });
        }
        return mockResponse({
          dailyCounts: [{ date: "2026-10-10", users: 3 }],
        });
      }),
    );

    renderAdminPage();

    expect(await screen.findAllByText("3")).toHaveLength(2);
    expect(screen.getAllByText("Users")).toHaveLength(2);
    expect(screen.getAllByText("Builds")).toHaveLength(2);
    expect(screen.getAllByText("Teams")).toHaveLength(2);
    expect(screen.getAllByText("—")).toHaveLength(4);
    expect(screen.getByRole("combobox", { name: "Comparison period" })).toBeEnabled();
    expect(screen.getByRole("option", { name: "Last 1 day" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Last 3 days" })).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders top-level count responses as cards instead of JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/admin/stats/max-days")) {
          return mockResponse({ maxDays: 1 });
        }
        return mockResponse({ users: 3, builds: 7, teams: 2 });
      }),
    );

    renderAdminPage();

    expect(await screen.findAllByText("3")).toHaveLength(2);
    expect(screen.getAllByText("7")).toHaveLength(2);
    expect(screen.getAllByText("2")).toHaveLength(2);
    expect(screen.getAllByText("Users")).toHaveLength(2);
    expect(screen.queryByText(/\{/)).not.toBeInTheDocument();
  });

  it("uses comparison percentages from event-grouped statistics responses", async () => {
    localStorage.setItem("selectedEvent", "CM 20");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/admin/stats/max-days")) {
          return mockResponse({ maxDays: 1 });
        }
        return mockResponse({
          periodDays: 1,
          events: {
            "CM 20": [{ date: "2026-10-10", users: 2, builds: 45, teams: 2 }],
          },
          comparison: {
            usersPercentChange: 100,
            buildsPercentChange: -6.25,
            teamsPercentChange: -60,
          },
        });
      }),
    );

    renderAdminPage();

    expect(await screen.findAllByText("+100%")).toHaveLength(2);
    expect(screen.getAllByText("-6.25%")).toHaveLength(2);
    expect(screen.getAllByText("-60%")).toHaveLength(2);
    expect(screen.getAllByText("45")).toHaveLength(2);
    expect(screen.queryByText("Additional details")).not.toBeInTheDocument();
  });

  it("formats negative comparisons with a minus sign and red styling", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/admin/stats/max-days")) {
          return mockResponse({ maxDays: 3 });
        }
        return mockResponse({
          dailyCounts: [
            { date: "2026-10-07", users: 8, builds: 0, teams: 4 },
            { date: "2026-10-10", users: 4, builds: 0, teams: 8 },
          ],
        });
      }),
    );

    renderAdminPage();

    const negativeChange = await screen.findAllByText("-50%");
    expect(negativeChange).toHaveLength(2);
    expect(negativeChange[0]).toHaveClass("admin-change-negative");
    expect(screen.getAllByText("0%")).toHaveLength(2);
    expect(screen.getAllByText("+100%")).toHaveLength(2);
  });

  it("displays the API message when no daily snapshots are available", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/admin/stats/max-days")) {
          return mockResponse({
            maxDays: 1,
            earliestDate: "2026-10-10",
            latestDate: "2026-10-10",
          });
        }
        return mockResponse("No daily statistics snapshots are available.");
      }),
    );

    renderAdminPage();

    expect(
      await screen.findAllByText(/No daily statistics snapshots are available\./),
    ).toHaveLength(2);
    expect(screen.getByRole("status")).toHaveTextContent("2026-10-10");
  });

  it("does not allow access when isAdmin is false", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        username: "user",
        avatarUrl: "",
        isAdmin: false,
      },
      isLoading: false,
    });

    renderAdminPage();

    expect(screen.queryByRole("heading", { name: "Admin" })).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
