import { describe, expect, it, vi } from "vitest";
import { createEmptyEventResults } from "../../src/features/planner/plannerTypes";
import { createResultActions } from "../../src/features/planner/resultActions";

describe("result actions", () => {
  it("requires all three builds and saves team wins without per-build wins", () => {
    const current = createEmptyEventResults("CM 42");
    const saveEventResults = vi.fn();
    const { saveTicketResult } = createResultActions({
      selectedEvent: "CM 42",
      allBuilds: [],
      getCurrentResults: () => current,
      saveEventResults,
    });

    saveTicketResult("round1Day1", 1, [
      { buildId: "build-1", slot: 1, wins: 0 },
      { buildId: "build-2", slot: 2, wins: 0 },
      { buildId: "build-3", slot: 3, wins: 0 },
    ], 3);

    expect(saveEventResults).toHaveBeenCalledWith(expect.objectContaining({
      results: expect.objectContaining({ round1Day1: [3, 0, 0, 0] }),
      buildAssignments: {
        round1Day1: {
          1: [{ buildId: "build-1", tickets: [1] }],
          2: [{ buildId: "build-2", tickets: [1] }],
          3: [{ buildId: "build-3", tickets: [1] }],
        },
      },
      ticketBuildResults: { round1Day1: { 1: [] } },
    }));
  });

  it("does not save a ticket with fewer than three builds", () => {
    const current = createEmptyEventResults("CM 42");
    const saveEventResults = vi.fn();
    const { saveTicketResult } = createResultActions({
      selectedEvent: "CM 42",
      allBuilds: [],
      getCurrentResults: () => current,
      saveEventResults,
    });

    saveTicketResult("round1Day1", 1, [
      { buildId: "build-1", slot: 1, wins: 3 },
      { buildId: "build-2", slot: 2, wins: 0 },
    ]);

    expect(saveEventResults).not.toHaveBeenCalled();
  });
});
