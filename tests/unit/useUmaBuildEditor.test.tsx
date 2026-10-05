import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SkillEntry } from "../../src/types/SkillEntry";
import type { UmaBuild } from "../../src/types/UmaBuild";
import useUmaBuildEditor from "../../src/components/UmaBuild/useUmaBuildEditor";

const runawaySkill: SkillEntry = {
  id: "202051",
  name: "Runaway",
  groupId: null,
  iconId: 1,
  isGeneralSkill: true,
  displayOrder: 1,
  rarity: 1,
};

const ordinarySkill: SkillEntry = {
  id: "30001",
  name: "Ordinary skill",
  groupId: "ordinary-group",
  iconId: 2,
  isGeneralSkill: true,
  displayOrder: 2,
  rarity: 1,
};

function createBuild(strategy: string, skills: string[]): UmaBuild {
  return {
    outfitId: "1001",
    starCount: 3,
    uniqueLv: 1,
    speed: 1200,
    stamina: 1200,
    power: 800,
    guts: 400,
    wisdom: 400,
    strategy,
    distanceAptitude: "S",
    surfaceAptitude: "A",
    strategyAptitude: "A",
    mood: 0,
    skills,
    forcedSkillPositions: {},
  };
}

function renderEditor(value: UmaBuild, onChange = vi.fn()) {
  const hook = renderHook(() =>
    useUmaBuildEditor({
      value,
      onChange,
      skillList: [runawaySkill, ordinarySkill],
      buildName: "",
      buildId: null,
      savedBuilds: [],
    }),
  );
  return { ...hook, onChange };
}

describe("useUmaBuildEditor runaway skill behavior", () => {
  it("sets Oonige when the runaway skill is added", () => {
    const { result, onChange } = renderEditor(createBuild("Nige", []));

    act(() => result.current.selectSkill(runawaySkill.id));

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        strategy: "Oonige",
        skills: [runawaySkill.id],
      }),
    );
  });

  it("adds the runaway skill when Oonige is selected", () => {
    const { result, onChange } = renderEditor(createBuild("Nige", []));

    act(() => result.current.updateField("strategy", "Oonige"));

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        strategy: "Oonige",
        skills: [runawaySkill.id],
      }),
    );
  });

  it("allows another strategy while retaining the runaway skill only until that change", () => {
    const onChange = vi.fn();
    const initialBuild = createBuild("Oonige", [runawaySkill.id, ordinarySkill.id]);
    const { result, rerender } = renderHook(
      ({ value }) => useUmaBuildEditor({
        value,
        onChange,
        skillList: [runawaySkill, ordinarySkill],
        buildName: "",
        buildId: null,
        savedBuilds: [],
      }),
      { initialProps: { value: initialBuild } },
    );

    act(() => result.current.updateField("strategy", "Nige"));

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        strategy: "Nige",
        skills: [ordinarySkill.id],
      }),
    );

    rerender({ value: { ...initialBuild, strategy: "Nige", skills: [runawaySkill.id] } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("changes to Nige when the runaway skill is removed", () => {
    const { result, onChange } = renderEditor(
      createBuild("Oonige", [ordinarySkill.id, runawaySkill.id]),
    );

    act(() => result.current.removeSkill(1));

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        strategy: "Nige",
        skills: [ordinarySkill.id],
      }),
    );
  });

  it("changes to Nige when the runaway skill is replaced", () => {
    const { result, onChange } = renderEditor(
      createBuild("Oonige", [runawaySkill.id]),
    );

    act(() => result.current.openSkillPicker(0));
    act(() => result.current.selectSkill(ordinarySkill.id));

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        strategy: "Nige",
        skills: [ordinarySkill.id],
      }),
    );
  });
});
