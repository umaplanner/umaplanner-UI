import { describe, expect, it, vi } from "vitest";
import { createDefaultBuild } from "../../src/features/planner/plannerTypes";
import { fetchBuilds, postBuilds } from "../../src/features/planner/buildApi";
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
  it("sends Oonige builds unchanged", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await postBuilds([makeBuild("runaway", "Oonige")]);

    const request = fetchMock.mock.calls[0][1];
    expect(JSON.parse(request.body)).toEqual([
      expect.objectContaining({
        id: "runaway",
        data: expect.objectContaining({ strategy: "Oonige" }),
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
        data: { ...data, strategy: "Oonige" },
      }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchBuilds(event);

    expect(result.builds[0].strategy).toBe("Oonige");
  });
});
