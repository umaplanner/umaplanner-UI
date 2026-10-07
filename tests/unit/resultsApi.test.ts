import { describe, expect, it, vi } from "vitest";
import {
  fetchAllResults,
  fetchCurrentEventResults,
  postResults,
} from "../../src/features/planner/resultsApi";
import {
  createEmptyEventResults,
  createDefaultTeamResults,
  setTeamResultRoundExcluded,
  type EventResults,
} from "../../src/features/planner/plannerTypes";

vi.mock("../../src/lib/config", () => ({
  config: { apiBaseUrl: "https://api.example.com" },
}));

describe("results API", () => {
  it("fetches the current event from its dedicated endpoint", async () => {
    const results: EventResults = {
      ...createEmptyEventResults("CM 42"),
      finalPlacement: 3,
      finalBuildPlacements: [2, null, null],
      results: {
        ...createDefaultTeamResults(),
        round1Day1: [1, 2, 3, 4],
      },
      buildAssignments: {
        round1Day1: {
          1: [{ buildId: "build-2", tickets: [2, 4] }],
        },
      },
      ticketCounts: { ...createEmptyEventResults().ticketCounts, round1Day1: 4 },
      lastUpdate: 42,
    };
    const { event, ...data } = results;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ event, data }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchCurrentEventResults("CM 42")).resolves.toEqual(results);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.example.com/results/CM%2042",
    );
  });

  it("fetches all results from the collection endpoint", async () => {
    const results = [
      createEmptyEventResults("CM 42"),
      createEmptyEventResults("CM 43"),
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => results.map(({ event, ...data }) => ({ event, data })),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchAllResults()).resolves.toEqual(results);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example.com/results");
  });

  it("posts results as a batch without including team selections", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const results = createEmptyEventResults("CM 42");
    results.results = setTeamResultRoundExcluded(results.results, "round1", true);
    results.buildAssignments = {
      finals: { 3: [{ buildId: "build-3", tickets: [1, 2, 3, 4] }] },
    };

    await postResults([results]);

    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example.com/results");
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    const { event, ...data } = results;
    expect(payload).toEqual([{ event, data }]);
    expect(payload[0].event).toBe("CM 42");
    expect(payload[0].data.results.round1Day1).toBeNull();
    expect(payload[0]).not.toHaveProperty("results");
  });

  it("posts all provided events in one batch request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const results = [
      createEmptyEventResults("CM 42"),
      createEmptyEventResults("CM 43"),
    ];

    await postResults(results);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(
      results.map(({ event, ...data }) => ({ event, data })),
    );
  });

  it("migrates legacy row-wide build overrides into ticket assignments", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        event: "CM 42",
        data: {
          ...createEmptyEventResults("CM 42"),
          buildAssignments: undefined,
          buildOverrides: { round1Day1: { 1: "build-2" } },
          ticketCounts: { ...createEmptyEventResults().ticketCounts, round1Day1: 4 },
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const results = await fetchCurrentEventResults("CM 42");

    expect(results?.buildAssignments.round1Day1?.[1]).toEqual([
      { buildId: "build-2", tickets: [1, 2, 3, 4] },
    ]);
    expect(results?.ticketCounts.round1Day1).toBe(4);
  });
});
