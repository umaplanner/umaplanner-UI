import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import UmaBuildSkills from "../../src/components/UmaBuild/editor/Skills";
import type { SkillEntry } from "../../src/types/SkillEntry";
import type { UmaBuild } from "../../src/types/UmaBuild";

const skillList: SkillEntry[] = [
  {
    id: "202051",
    name: "Runaway",
    groupId: null,
    iconId: 1,
    isGeneralSkill: true,
    displayOrder: 1,
    rarity: 1,
  },
  {
    id: "30001",
    name: "Ordinary skill",
    groupId: null,
    iconId: 2,
    isGeneralSkill: true,
    displayOrder: 2,
    rarity: 1,
  },
];

const value: UmaBuild = {
  outfitId: "1001",
  starCount: 3,
  uniqueLv: 1,
  speed: 1200,
  stamina: 1200,
  power: 800,
  guts: 400,
  wisdom: 400,
  strategy: "Oonige",
  distanceAptitude: "S",
  surfaceAptitude: "A",
  strategyAptitude: "A",
  mood: 0,
  skills: ["30001", "202051"],
  forcedSkillPositions: {},
};

describe("UmaBuildSkills", () => {
  it("removes the displayed skill, even when display order differs from stored order", async () => {
    const user = userEvent.setup();
    const removeSkill = vi.fn();

    render(
      <UmaBuildSkills
        value={value}
        skillList={skillList}
        skillPickerIndex={null}
        isSkillPickerOpen={false}
        skillSearch=""
        skillSort="rarity"
        setSkillSort={vi.fn()}
        skillSortAscending={false}
        setSkillSortAscending={vi.fn()}
        filteredSkills={[]}
        getSkillId={(skill) => skill}
        isForcedSkill={() => false}
        isUnavailableSkill={() => false}
        setSkillSearch={vi.fn()}
        openSkillPicker={vi.fn()}
        closeSkillPicker={vi.fn()}
        selectSkill={vi.fn()}
        removeSkill={removeSkill}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Remove skill 1" }));

    expect(removeSkill).toHaveBeenCalledWith(1);
  });
});
