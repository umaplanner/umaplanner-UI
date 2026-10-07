import { describe, expect, it, vi } from "vitest";
import { fetchTeams, postTeams } from "../../src/features/planner/teamApi";
import { createEmptyTeam } from "../../src/features/planner/plannerTypes";

vi.mock("../../src/lib/config", () => ({
  config: { apiBaseUrl: "https://api.example.com" },
}));

describe("team API", () => {
  it("returns team data separately from legacy embedded results", async () => {
    const legacyResults = {
      day1: [1, 2, 3, 4],
      day2: [0, 1, 0, 1],
      finals: [5, 5, 5, 5],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { ...createEmptyTeam("CM 42"), results: legacyResults },
        { ...createEmptyTeam("CM 44"), results: undefined },
      ],
    });
    vi.stubGlobal("fetch", fetchMock);

    const teams = await fetchTeams("CM 42");
    expect(teams).toHaveLength(1);
    expect(teams[0].team).toEqual(createEmptyTeam("CM 42"));
    expect(teams[0].legacyResults?.results.round1Day1).toEqual([1, 2, 3, 4]);

    const olderTeams = await fetchTeams("CM 44");
    expect(olderTeams[0].team).toEqual(createEmptyTeam("CM 44"));
    expect(olderTeams[0].legacyResults).toBeNull();
  });

  it("posts only event team selection fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const team = createEmptyTeam("CM 42");

    await postTeams([team]);

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual([team]);
  });
});
