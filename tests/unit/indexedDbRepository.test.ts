import { describe, expect, it } from "vitest";
import { IndexedDbRepository } from "../../src/components/indexedDbRepository";

type Team = {
  event: string;
  uma1: number | null;
};

function createRepository(databaseName: string) {
  return new IndexedDbRepository<Team>({
    databaseName,
    version: 1,
    storeName: "teams",
    keyPath: "event",
    indexes: [{ name: "event", unique: true }],
  });
}

describe("IndexedDbRepository", () => {
  it("stores and retrieves records by key and index", async () => {
    const repository = createRepository("TeamDB-by-key");
    const team = { event: "CM 42", uma1: 101 };

    await repository.put(team);

    await expect(repository.getByKey("CM 42")).resolves.toEqual(team);
    await expect(repository.getSingle("event", "CM 42")).resolves.toEqual(team);
    await expect(repository.getAll()).resolves.toEqual([team]);
  });

  it("adds a batch and replaces an existing record", async () => {
    const repository = createRepository("TeamDB-batch");

    await repository.addMany([
      { event: "CM 41", uma1: null },
      { event: "CM 42", uma1: 102 },
    ]);
    await repository.put({ event: "CM 42", uma1: 103 });

    await expect(repository.getAll()).resolves.toEqual([
      { event: "CM 41", uma1: null },
      { event: "CM 42", uma1: 103 },
    ]);
  });
});
