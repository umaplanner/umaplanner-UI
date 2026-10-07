import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BuildFetchResult } from "../../src/features/planner/buildApi";
import {
  createBuildRepository,
  createTeamRepository,
} from "../../src/features/planner/plannerRepository";
import { useTeam } from "../../src/features/planner/useTeam";
import { createDefaultBuild } from "../../src/features/planner/plannerTypes";
import type { StoredUmaBuild } from "../../src/types/UmaBuild";

const mocks = vi.hoisted(() => ({
  user: { username: "test-user", avatarUrl: "" },
  fetchBuilds: vi.fn(async (): Promise<BuildFetchResult> => ({
    builds: [],
    deletedIds: [],
    migratedStrategyIds: [],
  })),
  postBuilds: vi.fn(async () => undefined),
  deleteBuild: vi.fn(async () => undefined),
  fetchTeams: vi.fn(async () => []),
  postTeams: vi.fn(async () => undefined),
  fetchAllResults: vi.fn(async () => []),
  fetchCurrentEventResults: vi.fn(async () => null),
  postResults: vi.fn(async () => undefined),
}));

vi.mock("../../src/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mocks.user,
    isLoading: false,
  }),
}));

vi.mock("../../src/features/planner/buildApi", () => ({
  fetchBuilds: mocks.fetchBuilds,
  postBuilds: mocks.postBuilds,
  deleteBuild: mocks.deleteBuild,
}));

vi.mock("../../src/features/planner/teamApi", () => ({
  fetchTeams: mocks.fetchTeams,
  postTeams: mocks.postTeams,
}));

vi.mock("../../src/features/planner/resultsApi", () => ({
  fetchAllResults: mocks.fetchAllResults,
  fetchCurrentEventResults: mocks.fetchCurrentEventResults,
  postResults: mocks.postResults,
}));

describe("useTeam build sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debounces build saves and supplies a missing unique level before syncing", async () => {
    const { result, unmount } = renderHook(() => useTeam("CM save test"));
    const buildWithoutUniqueLevel = createDefaultBuild("123");
    Reflect.deleteProperty(buildWithoutUniqueLevel, "uniqueLv");
    let firstSavedId: string | null = null;
    let secondSavedId: string | null = null;
    await act(async () => {
      firstSavedId = await result.current.saveBuild(
        buildWithoutUniqueLevel,
        "Build without unique level",
      );
      secondSavedId = await result.current.saveBuild(
        createDefaultBuild("456"),
        "Second build",
      );
    });

    expect(firstSavedId).not.toBeNull();
    expect(secondSavedId).not.toBeNull();
    expect(mocks.postBuilds).not.toHaveBeenCalled();
    unmount();
    expect(mocks.postBuilds).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: firstSavedId,
          event: "CM save test",
          name: "Build without unique level",
          uniqueLv: 3,
        }),
        expect.objectContaining({
          id: secondSavedId,
          uniqueLv: 3,
        }),
      ]),
    );
  });

  it("stores builds returned by the backend in IndexedDB", async () => {
    const remoteBuild: StoredUmaBuild = {
      ...createDefaultBuild("123"),
      id: "remote-build",
      event: "CM 42",
      name: "Remote build",
      lastUpdate: 1,
    };
    mocks.fetchBuilds.mockResolvedValueOnce({
      builds: [remoteBuild],
      deletedIds: [],
      migratedStrategyIds: [],
    });

    const { unmount } = renderHook(() => useTeam("CM 42"));
    const repository = createBuildRepository();
    await waitFor(async () => {
      expect(await repository.getByKey(["CM 42", "remote-build"])).toEqual(
        remoteBuild,
      );
    });
    unmount();
  });

  it("loads the local team before waiting for remote build sync", async () => {
    const event = "CM local-first test";
    const localBuild: StoredUmaBuild = {
      ...createDefaultBuild("123"),
      id: "local-build",
      event,
      name: "Local build",
      lastUpdate: 1,
    };
    await createBuildRepository().put(localBuild);
    await createTeamRepository().put({
      event,
      uma1: localBuild.id,
      uma2: null,
      uma3: null,
      lastUpdate: 1,
    });
    mocks.fetchBuilds.mockImplementation(
      () => new Promise<BuildFetchResult>(() => undefined),
    );

    const { result, unmount } = renderHook(() => useTeam(event));
    expect(result.current.isTeamLoading).toBe(true);
    await waitFor(() => {
      expect(result.current.umas.uma1).toBe(localBuild.id);
      expect(result.current.allBuilds).toContainEqual(localBuild);
      expect(result.current.isTeamLoading).toBe(false);
    });

    expect(mocks.fetchBuilds).toHaveBeenCalled();
    unmount();
  });
});
