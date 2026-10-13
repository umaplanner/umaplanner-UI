import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ImportedBuildCard from "../../src/features/uma-import/ImportedBuildCard";
import { copyElementAsPng } from "../../src/lib/copyElementAsPng";
import { createDefaultBuild } from "../../src/features/planner/domain/types";

vi.mock("../../src/lib/copyElementAsPng", () => ({
  copyElementAsPng: vi.fn().mockResolvedValue("copied"),
}));

const dialogPrototype = HTMLDialogElement.prototype;
const originalShowModal = Object.getOwnPropertyDescriptor(dialogPrototype, "showModal");
const originalClose = Object.getOwnPropertyDescriptor(dialogPrototype, "close");

beforeEach(() => {
  Object.defineProperty(dialogPrototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(dialogPrototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    },
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  if (originalShowModal) Object.defineProperty(dialogPrototype, "showModal", originalShowModal);
  else Reflect.deleteProperty(dialogPrototype, "showModal");
  if (originalClose) Object.defineProperty(dialogPrototype, "close", originalClose);
  else Reflect.deleteProperty(dialogPrototype, "close");
});

describe("ImportedBuildCard", () => {
  it("copies the single build as an image from its details dialog", async () => {
    const user = userEvent.setup();
    const build = {
      card_id: 100101,
      name: "Extractor build",
      speed: 1200,
      stamina: 1100,
      power: 1000,
      guts: 800,
      wiz: 900,
      proper_ground_turf: 5,
      proper_ground_dirt: 1,
      proper_distance_short: 2,
      proper_distance_mile: 3,
      proper_distance_middle: 4,
      proper_distance_long: 5,
      proper_running_style_nige: 5,
      proper_running_style_senko: 4,
      proper_running_style_sashi: 3,
      proper_running_style_oikomi: 2,
      running_style: 1,
      skill_array: [],
    };

    render(
      <ImportedBuildCard
        build={build}
        uma={{
          id: build.card_id,
          charaId: 1,
          baseCharacterName: "Special Week",
          outfitTitle: "Classic",
        }}
        groundType="turf"
        distanceType="mile"
        skillList={[]}
        currentEvent="CM 42"
        savedBuilds={[]}
        onSaveBuild={vi.fn(async () => "new-build")}
        onRemoveBuild={vi.fn(async () => true)}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Details" }));
    const image = document.querySelector(".result-image--team");
    expect(image).not.toBeNull();
    expect(image?.querySelectorAll(".uma-build--team")).toHaveLength(1);
    expect(screen.getByText("Image")).toBeInTheDocument();
    expect(screen.getByText("Json")).toBeInTheDocument();

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Copy build image" }));

    expect(copyElementAsPng).toHaveBeenCalledWith(
      image,
      "umaplanner-cm-42-extractor-build.png",
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Image copied to clipboard.");
    const teamActions = screen.getByRole("dialog").querySelector(".uma-build__team-actions");
    const imageActions = teamActions?.firstElementChild;
    expect(imageActions?.firstElementChild).toBe(status);
    expect(imageActions?.lastElementChild).toHaveAccessibleName("Copy build image");
    expect(teamActions?.children[1]).toHaveTextContent("Json");
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("adds imports using the Uma name and the next available event suffix", async () => {
    const user = userEvent.setup();
    const build = {
      card_id: 100101,
      name: "Extractor build",
      created_time: 1_700_000_000,
      speed: 1200,
      stamina: 1100,
      power: 1000,
      guts: 800,
      wiz: 900,
      proper_ground_turf: 5,
      proper_ground_dirt: 1,
      proper_distance_short: 2,
      proper_distance_mile: 3,
      proper_distance_middle: 4,
      proper_distance_long: 5,
      proper_running_style_nige: 5,
      proper_running_style_senko: 4,
      proper_running_style_sashi: 3,
      proper_running_style_oikomi: 2,
      running_style: 1,
      skill_array: [],
    };
    const uma = {
      id: build.card_id,
      charaId: 1,
      baseCharacterName: "Special Week",
      outfitTitle: "Classic",
    };
    const onSaveBuild = vi.fn(async () => "new-build");
    const savedBuilds = ["Special Week", "Special Week 2"].map((name, index) => ({
      ...createDefaultBuild(String(100200 + index)),
      id: `saved-${index}`,
      event: "CM 42",
      name,
      lastUpdate: index,
    }));

    render(
      <ImportedBuildCard
        build={build}
        uma={uma}
        groundType="turf"
        distanceType="mile"
        skillList={[]}
        currentEvent="CM 42"
        savedBuilds={savedBuilds}
        onSaveBuild={onSaveBuild}
        onRemoveBuild={vi.fn(async () => true)}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save build to current event" }));

    expect(onSaveBuild).toHaveBeenCalledWith(
      expect.objectContaining({ outfitId: String(build.card_id) }),
      "Special Week 3",
    );
  });

  it("allows renaming the saved build name shown on an import card", async () => {
    const user = userEvent.setup();
    const build = {
      card_id: 100101,
      name: "Extractor build",
      created_time: 1_700_000_000,
      speed: 1200,
      stamina: 1100,
      power: 1000,
      guts: 800,
      wiz: 900,
      proper_ground_turf: 5,
      proper_ground_dirt: 1,
      proper_distance_short: 2,
      proper_distance_mile: 3,
      proper_distance_middle: 4,
      proper_distance_long: 5,
      proper_running_style_nige: 5,
      proper_running_style_senko: 4,
      proper_running_style_sashi: 3,
      proper_running_style_oikomi: 2,
      running_style: 1,
      skill_array: [],
    };
    const uma = {
      id: build.card_id,
      charaId: 1,
      baseCharacterName: "Special Week",
      outfitTitle: "Classic",
    };
    const savedBuild = {
      ...createDefaultBuild(String(build.card_id)),
      id: "saved-build",
      event: "CM 42",
      name: "Event name",
      create_time: build.created_time,
      lastUpdate: 1,
    };
    const onSaveBuild = vi.fn(async () => savedBuild.id);

    render(
      <ImportedBuildCard
        build={build}
        uma={uma}
        groundType="turf"
        distanceType="mile"
        skillList={[]}
        currentEvent="CM 42"
        savedBuilds={[savedBuild]}
        onSaveBuild={onSaveBuild}
        onRemoveBuild={vi.fn(async () => true)}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Rename Event name" }));
    const nameInput = screen.getByRole("textbox", { name: "Build name Event name" });
    await user.clear(nameInput);
    await user.type(nameInput, "Renamed event build");
    await user.keyboard("{Enter}");

    expect(onSaveBuild).toHaveBeenCalledWith(
      expect.objectContaining({ outfitId: String(build.card_id) }),
      "Renamed event build",
      savedBuild.id,
    );
  });
});
