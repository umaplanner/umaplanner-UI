import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventProvider } from "../../src/contexts/EventContext";
import Builds from "../../src/components/UmaBuild/list/List";
import { createBuildRepository } from "../../src/features/planner/plannerRepository";
import { createDefaultBuild } from "../../src/features/planner/plannerTypes";

vi.mock("../../src/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, isLoading: false }),
}));

vi.mock("../../src/lib/data", () => ({
  ensureDataLoaded: vi.fn(async () => ({ outfits: [], skills: [] })),
  getCachedDataset: vi.fn(async () => null),
}));

describe("saved build names", () => {
  beforeEach(() => {
    localStorage.setItem("selectedEvent", "CM rename test");
  });

  it("saves a changed name when the input loses focus", async () => {
    const user = userEvent.setup();
    const build = {
      ...createDefaultBuild("100101"),
      id: "rename-build",
      event: "CM rename test",
      name: "Original name",
      lastUpdate: 1,
    };
    const onSaveBuild = vi.fn(async (_build, _name, id) => id);
    await createBuildRepository().put(build);

    render(
      <EventProvider>
        <Builds onSaveBuild={onSaveBuild} />
      </EventProvider>,
    );

    await user.click(await screen.findByRole("button", { name: "Rename Original name" }));
    const nameInput = screen.getByRole("textbox", { name: "Build name Original name" });
    await user.clear(nameInput);
    await user.type(nameInput, "Updated name");
    fireEvent.blur(nameInput);

    await waitFor(() => {
      expect(onSaveBuild).toHaveBeenCalledWith(build, "Updated name", build.id);
    });
    expect(await screen.findByRole("button", { name: "Rename Updated name" })).toBeInTheDocument();
  });
});
