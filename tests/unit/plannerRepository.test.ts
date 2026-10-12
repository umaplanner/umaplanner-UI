import { openDB } from "idb";
import { describe, expect, it } from "vitest";
import { createResultsRepository } from "../../src/features/results/resultsRepository";
import { createEmptyEventResults } from "../../src/features/results/resultsTypes";

describe("results repository migration", () => {
  it("rewrites legacy IndexedDB results into grouped containers when loaded", async () => {
    const event = "CM migration test";
    const legacy = createEmptyEventResults(event);
    legacy.results.round1Day1 = [2, 0, 0, 0];
    legacy.ticketCounts.round1Day1 = 1;
    legacy.ticketBuildResults.round1Day1 = {
      1: [
        { buildId: "build-a", slot: 1, wins: 2 },
        { buildId: "build-b", slot: 2, wins: 0 },
        { buildId: "build-c", slot: 3, wins: 0 },
      ],
    };
    legacy.buildAssignments.round1Day1 = {
      1: [{ buildId: "build-a", tickets: [1] }],
      2: [{ buildId: "build-b", tickets: [1] }],
      3: [{ buildId: "build-c", tickets: [1] }],
    };
    const resultsRepository = createResultsRepository();
    await resultsRepository.getByKey("initialize");
    const database = await openDB("TeamResultsDB", 1);
    await database.put("results", legacy);

    try {
      const loaded = await resultsRepository.getByKey(event);
      const stored = await database.get("results", event);

      expect(loaded?.results.round1Day1?.[0]).toBe(2);
      expect(stored).not.toHaveProperty("results");
      expect(stored.round1Day1).toEqual({
        1: {
          builds: [
            { buildId: "build-a", wins: 2 },
            { buildId: "build-b", wins: 0 },
            { buildId: "build-c", wins: 0 },
          ],
        },
      });
    } finally {
      await database.delete("results", event);
      database.close();
    }
  });
});
