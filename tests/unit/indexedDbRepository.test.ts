import { describe, expect, it } from "vitest";
import { openDB } from "idb";
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
  it("creates the database and store when becoming ready", async () => {
    const databaseName = "TeamDB-ready";
    const repository = createRepository(databaseName);

    await repository.ready();

    const database = await openDB(databaseName);
    expect(database.objectStoreNames.contains("teams")).toBe(true);
    database.close();
  });

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

  it("adds missing indexes when an existing database is upgraded", async () => {
    const databaseName = "TeamDB-upgrade";
    const initialDatabase = await openDB(databaseName, 1, {
      upgrade(database) {
        database.createObjectStore("teams", { keyPath: "event" });
      },
    });
    await initialDatabase.put("teams", { event: "CM 42", uma1: 101 });
    initialDatabase.close();

    const upgradedRepository = new IndexedDbRepository<Team>({
      databaseName,
      version: 2,
      storeName: "teams",
      keyPath: "event",
      indexes: [{ name: "event", unique: true }],
    });

    await expect(upgradedRepository.getSingle("event", "CM 42")).resolves.toEqual({
      event: "CM 42",
      uma1: 101,
    });
  });
});
