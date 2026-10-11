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

  it("loads results saved in grouped round and Finals containers", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        event: "CM 42",
        data: {
          round1Day1: {
            1: {
              builds: [
                { buildId: "build-a", wins: 2 },
                { buildId: "build-b", wins: 1 },
                { buildId: "build-c", wins: 1 },
              ],
            },
          },
          finals: {
            placement: 2,
            builds: [
              { buildId: "build-a", placement: 2 },
              { buildId: "build-b", placement: 3 },
              { buildId: null, placement: null },
            ],
          },
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const results = await fetchCurrentEventResults("CM 42");

    expect(results?.ticketCounts.round1Day1).toBe(1);
    expect(results?.results.round1Day1?.[0]).toBe(4);
    expect(results?.finalPlacement).toBe(2);
    expect(results?.finalBuildPlacements).toEqual([2, 3, null]);
    expect(results?.ticketBuildResults.round1Day1?.[1]).toHaveLength(3);
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
    expect(payload).toHaveLength(1);
    expect(payload[0].event).toBe("CM 42");
    expect(payload[0].data).toEqual({
      lastUpdate: 0,
      round1Day1: null,
      round1Day2: null,
      round2Day1: {},
      round2Day2: {},
      finals: {
        placement: null,
        builds: [
          { buildId: null, placement: null },
          { buildId: null, placement: null },
          { buildId: "build-3", placement: null },
        ],
      },
    });
    expect(payload[0]).not.toHaveProperty("results");
  });

  it("stores only used tickets with their three builds and wins", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const results = createEmptyEventResults("CM 42");
    results.ticketCounts.round1Day1 = 2;
    results.ticketBuildResults.round1Day1 = {
      1: [
        { buildId: "build-1", slot: 1, wins: 2 },
        { buildId: "build-2", slot: 2, wins: 1 },
        { buildId: "build-3", slot: 3, wins: 1 },
      ],
    };
    results.buildAssignments.round1Day1 = {
      1: [{ buildId: "build-1", tickets: [1] }],
      2: [{ buildId: "build-2", tickets: [1] }],
      3: [{ buildId: "build-3", tickets: [1] }],
    };

    await postResults([results]);

    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload[0].data.round1Day1).toEqual({
      1: {
        builds: [
          { buildId: "build-1", wins: 2 },
          { buildId: "build-2", wins: 1 },
          { buildId: "build-3", wins: 1 },
        ],
      },
    });
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
      results.map((result) => ({
        event: result.event,
        data: {
          lastUpdate: 0,
          round1Day1: {},
          round1Day2: {},
          round2Day1: {},
          round2Day2: {},
          finals: {
            placement: null,
            builds: [
              { buildId: null, placement: null },
              { buildId: null, placement: null },
              { buildId: null, placement: null },
            ],
          },
        },
      })),
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
