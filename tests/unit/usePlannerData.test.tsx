import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePlannerData } from "../../src/features/planner/usePlannerData";

const mocks = vi.hoisted(() => ({
  ensureDataLoaded: vi.fn(),
  getCachedDataset: vi.fn(),
}));

vi.mock("../../src/lib/data", () => ({
  ensureDataLoaded: mocks.ensureDataLoaded,
  getCachedDataset: mocks.getCachedDataset,
}));

describe("usePlannerData support card data", () => {
  beforeEach(() => {
    mocks.getCachedDataset.mockResolvedValue(null);
    mocks.ensureDataLoaded.mockResolvedValue({
      supportCardsJson: {
        data: {
          "101": { id: 101, title: "Speed Support", uma: "Special Week" },
          "202": { id: 202, title: "Stamina Support", uma: "Silence Suzuka" },
        },
      },
    });
  });

  it("loads support card objects from the dataset data property", async () => {
    const { result } = renderHook(() => usePlannerData(null));

    await waitFor(() => {
      expect(result.current.supportCardList).toEqual([
        { id: 101, title: "Speed Support", uma: "Special Week" },
        { id: 202, title: "Stamina Support", uma: "Silence Suzuka" },
      ]);
    });
  });
});
