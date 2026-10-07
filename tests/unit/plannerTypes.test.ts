import { describe, expect, it } from "vitest";
import {
  createDefaultTicketCounts,
  createDefaultTeamResults,
  createEmptyEventResults,
  isTeamTicketBuildResults,
  normalizeEventResults,
  resolveResultBuildId,
  getBaseUmaId,
  hasDuplicateBaseUmaIds,
  setTeamResultRoundExcluded,
  setBuildAssignmentTickets,
  type TeamBuildAssignments,
} from "../../src/features/planner/plannerTypes";

describe("planner result build assignments", () => {
  it("identifies matching base Uma IDs from the first four outfit ID digits", () => {
    expect(getBaseUmaId("100101")).toBe("1001");
    expect(hasDuplicateBaseUmaIds([
      { outfitId: "100101" },
      { outfitId: "100102" },
      { outfitId: "200101" },
    ])).toBe(true);
    expect(hasDuplicateBaseUmaIds([
      { outfitId: "100101" },
      { outfitId: "200101" },
      null,
    ])).toBe(false);
  });

  it("starts result rows with no tickets and validates per-build ticket wins", () => {
    const empty = createEmptyEventResults("CM 42");
    expect(empty.ticketCounts).toEqual({
      round1Day1: 0,
      round1Day2: 0,
      round2Day1: 0,
      round2Day2: 0,
      finals: 1,
    });
    expect(empty.finalBuildPlacements).toEqual([null, null, null]);

    const ticketBuildResults = {
      round1Day1: {
        1: [
          { buildId: "build-a", slot: 1, wins: 2 },
          { buildId: "build-b", slot: 2, wins: 3 },
        ],
        2: [{ buildId: "build-c", slot: 1, wins: 0 }],
      },
    };
    expect(isTeamTicketBuildResults(ticketBuildResults)).toBe(true);
    expect(isTeamTicketBuildResults({ round1Day1: { 1: [] } })).toBe(true);
    expect(isTeamTicketBuildResults({
      round1Day1: {
        1: [
          { buildId: "build-a", slot: 1, wins: 2 },
          { buildId: "build-b", slot: 2, wins: 2 },
          { buildId: "build-c", slot: 3, wins: 2 },
          { buildId: "build-d", slot: 1, wins: 0 },
        ],
      },
    })).toBe(false);
    expect(isTeamTicketBuildResults({
      round1Day1: {
        1: [
          { buildId: "build-a", slot: 1, wins: 3 },
          { buildId: "build-b", slot: 2, wins: 3 },
        ],
      },
    })).toBe(false);

    const normalized = normalizeEventResults({
      ...empty,
      ticketCounts: { ...empty.ticketCounts, round1Day1: 1 },
      ticketBuildResults,
    }, "CM 42");
    expect(normalized.ticketBuildResults.round1Day1).toEqual({
      1: ticketBuildResults.round1Day1[1],
    });

  });

  it("normalizes each Finals Uma placement into the 1-to-9 range", () => {
    const empty = createEmptyEventResults("CM 42");
    expect(normalizeEventResults({
      ...empty,
      finalBuildPlacements: [1, 9, 10],
    }, "CM 42").finalBuildPlacements).toEqual([1, 9, null]);
    expect(normalizeEventResults({
      ...empty,
      finalBuildPlacements: [2],
    }, "CM 42").finalBuildPlacements).toEqual([null, null, null]);
  });

  it("keeps at most one explicit build assigned to each ticket and slot", () => {
    const initial: TeamBuildAssignments = {
      round1Day1: {
        1: [
          { buildId: "build-a", tickets: [1, 2] },
          { buildId: "build-b", tickets: [3] },
        ],
      },
    };

    const reassigned = setBuildAssignmentTickets(
      initial,
      "round1Day1",
      1,
      "build-b",
      2,
    );
    expect(reassigned.round1Day1?.[1]).toEqual([
      { buildId: "build-a", tickets: [1] },
      { buildId: "build-b", tickets: [2, 3] },
    ]);

    const removed = setBuildAssignmentTickets(
      reassigned,
      "round1Day1",
      1,
      null,
      3,
    );
    expect(removed.round1Day1?.[1]).toEqual([
      { buildId: "build-a", tickets: [1] },
      { buildId: "build-b", tickets: [2] },
      { buildId: null, tickets: [3] },
    ]);
  });

  it("copies the initial team into round one and inherits each following row's displayed lineup", () => {
    const results = {
      ...createEmptyEventResults("CM 42"),
      ticketCounts: { ...createDefaultTicketCounts(), round1Day1: 4 as const },
      initialBuildIds: ["initial-1", "initial-2", "initial-3"] as [
        string,
        string,
        string,
      ],
      buildAssignments: {
        round1Day1: {
          1: [{ buildId: "round-one-build", tickets: [4] as [4] }],
        },
      },
    };

    expect(resolveResultBuildId(results, "round1Day1", 1, 1)).toBe("initial-1");
    expect(resolveResultBuildId(results, "round1Day2", 1, 1)).toBe("round-one-build");
    expect(resolveResultBuildId(results, "round2Day1", 1, 1)).toBe("round-one-build");

    const removed = {
      ...results,
      buildAssignments: setBuildAssignmentTickets(
        results.buildAssignments,
        "round1Day1",
        1,
        null,
        4,
      ),
    };
    expect(resolveResultBuildId(removed, "round1Day1", 4, 1)).toBeNull();
    expect(resolveResultBuildId(removed, "round1Day2", 1, 1)).toBeNull();
    expect(removed.initialBuildIds[0]).toBe("initial-1");
  });

  it("migrates earlier ticket overrides and trims values beyond the ticket count", () => {
    const migrated = normalizeEventResults({
      event: "CM 42",
      results: {
        ...createDefaultTeamResults(),
        round1Day1: [5, 4, 3, 2],
      },
      buildOverrides: {
        round1Day1: {
          1: { 1: "build-a" },
          2: { 1: "build-b" },
          3: { 1: "build-a" },
          4: { 1: "build-c" },
        },
      },
      ticketCounts: { ...createDefaultTicketCounts(), round1Day1: 3 },
    }, "CM 42");

    expect(migrated.buildAssignments.round1Day1?.[1]).toEqual([
      { buildId: "build-a", tickets: [1, 3] },
      { buildId: "build-b", tickets: [2] },
    ]);
    expect(migrated.results.round1Day1).toEqual([5, 4, 3, 0]);
  });

  it("persists excluded round results as null and restores empty rows when included", () => {
    const excludedResults = setTeamResultRoundExcluded(
      createDefaultTeamResults(),
      "round2",
      true,
    );
    const normalized = normalizeEventResults({
      ...createEmptyEventResults("CM 42"),
      results: excludedResults,
    }, "CM 42");

    expect(normalized.results.round2Day1).toBeNull();
    expect(normalized.results.round2Day2).toBeNull();
    expect(setTeamResultRoundExcluded(normalized.results, "round2", false))
      .toEqual(createDefaultTeamResults());
  });

  it("normalizes Finals to one ticket and removes unassigned extra builds", () => {
    const normalized = normalizeEventResults({
      ...createEmptyEventResults("CM 42"),
      finalPlacement: 2,
      ticketCounts: { ...createDefaultTicketCounts(), finals: 4 },
      buildAssignments: {
        finals: {
          1: [{ buildId: "extra-build", tickets: [] }],
        },
      },
    }, "CM 42");

    expect(normalized.finalPlacement).toBe(2);
    expect(normalized.ticketCounts.finals).toBe(1);
    expect(normalized.buildAssignments.finals?.[1]).toBeUndefined();
  });
});
