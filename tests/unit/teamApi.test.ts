import { describe, expect, it, vi } from "vitest";
import { fetchTeams, postTeams } from "../../src/features/planner/data/teamApi";
import { postAnonymousTeam } from "../../src/features/planner/data/anonymousTeamApi";
import { createEmptyTeam } from "../../src/features/planner/domain/types";
import type { StoredUmaBuild } from "../../src/types/UmaBuild";

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

  it("posts anonymous team and build data without build names", async () => {
    localStorage.clear();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const team = {
      ...createEmptyTeam("CM 42"),
      uma1: "build-1",
      lastUpdate: 123,
    };
    const build: StoredUmaBuild = {
      id: "build-1",
      event: "CM 42",
      name: "Private local label",
      lastUpdate: 123,
      outfitId: "101",
      "build-type": "standard",
      starCount: 3,
      uniqueLv: 3,
      speed: 1200,
      stamina: 800,
      power: 900,
      guts: 400,
      wisdom: 500,
      strategy: "Senkou",
      distanceAptitude: "S",
      surfaceAptitude: "A",
      strategyAptitude: "A",
      mood: 0,
      skills: ["skill-1"],
      forcedSkillPositions: {},
      supportCards: [{
        position: 1,
        support_card_id: 1234,
        limit_break_count: 4,
      }],
    };

    await postAnonymousTeam(team, [build]);

    const [url, options] = fetchMock.mock.calls[0];
    const payload = JSON.parse(options.body);
    expect(url).toBe("https://api.example.com/anonymous/teams");
    expect(payload.anonymousId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(payload.team).toEqual({
      uma1: "build-1",
      uma2: null,
      uma3: null,
      lastUpdate: 123,
    });
    expect(payload.builds).toEqual([{
      id: "build-1",
      "build-type": "standard",
      outfitId: "101",
      strategy: "Senkou",
      speed: 1200,
      stamina: 800,
      power: 900,
      guts: 400,
      wisdom: 500,
      skills: ["skill-1"],
      supportCards: [{
        position: 1,
        supportCardId: 1234,
        limitBreakCount: 4,
      }],
    }]);
    expect(JSON.stringify(payload)).not.toContain("Private local label");
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty("credentials");
  });
});
