import { describe, expect, it, vi } from "vitest";
import { createDefaultBuild } from "../../src/features/planner/plannerTypes";
import {
  deleteBuild,
  fetchBuilds,
  postBuilds,
} from "../../src/features/planner/buildApi";
import type { StoredUmaBuild } from "../../src/types/UmaBuild";

vi.mock("../../src/lib/config", () => ({
  config: { apiBaseUrl: "https://api.example.com" },
}));

function makeBuild(id: string, strategy: string): StoredUmaBuild {
  return {
    ...createDefaultBuild("123"),
    id,
    event: "CM 42",
    name: `Build ${id}`,
    lastUpdate: 1,
    strategy,
  };
}

describe("postBuilds", () => {
  it("normalizes legacy Sashi values before sending builds", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await postBuilds([makeBuild("legacy", "Sashi")]);

    const request = fetchMock.mock.calls[0][1];
    expect(JSON.parse(request.body)[0].data.strategy).toBe("Sasi");
  });

  it("sends Oonige builds unchanged", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await postBuilds([makeBuild("runaway", "Oonige")]);

    const request = fetchMock.mock.calls[0][1];
    expect(JSON.parse(request.body)).toEqual([
      expect.objectContaining({
        id: "runaway",
        data: expect.objectContaining({
          strategy: "Oonige",
          "build-type": "standard",
        }),
      }),
    ]);
  });

  it("sends regular and Oonige builds in the same batch", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await postBuilds([
      makeBuild("normal", "Senkou"),
      makeBuild("runaway", "Oonige"),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = fetchMock.mock.calls[0][1];
    const payload = JSON.parse(request.body);
    expect(payload).toEqual([
      expect.objectContaining({
        event: "CM 42",
        id: "normal",
        data: expect.objectContaining({ strategy: "Senkou" }),
      }),
      expect.objectContaining({
        event: "CM 42",
        id: "runaway",
        data: expect.objectContaining({ strategy: "Oonige" }),
      }),
    ]);
  });

  it("preserves Oonige when loading builds from the API", async () => {
    const { event, id, ...data } = makeBuild("runaway", "Oonige");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{
        event,
        id,
        data: { ...data, strategy: "Oonige", "build-type": "plan" },
      }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchBuilds(event);

    expect(result.builds[0].strategy).toBe("Oonige");
    expect(result.builds[0]["build-type"]).toBe("plan");
  });

  it("normalizes legacy Sashi values when loading builds from the API", async () => {
    const { event, id, ...data } = makeBuild("legacy", "Sashi");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ event, id, data }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchBuilds(event);

    expect(result.builds[0].strategy).toBe("Sasi");
    expect(result.migratedStrategyIds).toEqual(["legacy"]);
  });

  it("loads builds with null legacy optional fields", async () => {
    const { event, id, ...data } = makeBuild("legacy-fields", "Senkou");
    const legacyData: Record<string, unknown> = {
      ...data,
      name: null,
      "build-type": null,
      create_time: null,
      forcedSkillPositions: null,
      supportCards: null,
    };
    delete legacyData.uniqueLv;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{
        event,
        id,
        data: legacyData,
      }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchBuilds(event);

    expect(result.builds[0]).toMatchObject({
      id,
      name: "",
      "build-type": "standard",
      uniqueLv: 3,
      forcedSkillPositions: {},
      supportCards: [],
    });
    expect(result.builds[0].create_time).toBeUndefined();
  });
});

describe("deleteBuild", () => {
  it("waits two seconds before sending the delete request", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const deletion = deleteBuild("CM 42", "build-1");
    await vi.advanceTimersByTimeAsync(1_999);
    expect(fetchMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await deletion;

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/builds/delete",
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ event: "CM 42", id: "build-1" }),
      }),
    );
    vi.useRealTimers();
  });
});
