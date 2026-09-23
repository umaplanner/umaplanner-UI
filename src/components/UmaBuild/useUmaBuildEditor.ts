import { useEffect, useState } from "react";
import type { SkillEntry } from "../../types/SkillEntry";
import type { UmaBuild as UmaBuildData } from "../../types/UmaBuild";
import { findSkill } from "./umaBuildUtils";

interface Options {
  value: UmaBuildData;
  onChange: (value: UmaBuildData) => void;
  skillList: SkillEntry[];
  uniqueSkillId?: number;
  buildName: string;
  buildId: string | null;
  savedBuilds: { id: string; name: string }[];
  onNewBuild?: () => void;
}

const emptyBuild: UmaBuildData = {
  outfitId: "",
  starCount: 3,
  uniqueLv: 1,
  speed: 1200,
  stamina: 1200,
  power: 800,
  guts: 400,
  wisdom: 400,
  strategy: "Senkou",
  distanceAptitude: "S",
  surfaceAptitude: "A",
  strategyAptitude: "A",
  mood: 0,
  skills: [],
  forcedSkillPositions: {},
};

export default function useUmaBuildEditor({
  value,
  onChange,
  skillList,
  uniqueSkillId,
  buildName,
  buildId,
  savedBuilds,
  onNewBuild,
}: Options) {
  const [skillPickerIndex, setSkillPickerIndex] = useState<number | null>(null);
  const [isSkillPickerOpen, setIsSkillPickerOpen] = useState(false);
  const [skillSearch, setSkillSearch] = useState("");
  const [isBuildCopied, setIsBuildCopied] = useState(false);
  const [isBuildLoaded, setIsBuildLoaded] = useState(false);
  const [openAptitude, setOpenAptitude] = useState<string | null>(null);
  const [openChoice, setOpenChoice] = useState<string | null>(null);
  const [draftBuildName, setDraftBuildName] = useState(buildName);
  const uniqueSkill = uniqueSkillId === undefined
    ? undefined
    : skillList.find((skill) => skill.id === String(uniqueSkillId));

  useEffect(() => setDraftBuildName(buildName), [buildName]);

  useEffect(() => {
    const skills = uniqueSkill
      ? [
          uniqueSkill.id,
          ...value.skills.filter((skill) =>
            getSkillId(skill) !== uniqueSkill.id &&
            value.forcedSkillPositions[skill] === undefined,
          ),
        ]
      : value.skills;
    const forcedSkillPositions = Object.fromEntries(
      Object.entries(value.forcedSkillPositions).filter(([skillName]) =>
        skills.includes(skillName) &&
          (!uniqueSkill || skillName === uniqueSkill.id),
      ),
    );

    if (uniqueSkill) {
      forcedSkillPositions[uniqueSkill.id] = 0;
    }

    if (
      value.skills.length === skills.length &&
      value.skills.every((skill, index) => skill === skills[index]) &&
      Object.keys(value.forcedSkillPositions).every(
        (skill) => forcedSkillPositions[skill] === value.forcedSkillPositions[skill],
      )
    ) return;

    onChange({ ...value, skills, forcedSkillPositions });
  }, [onChange, skillList, uniqueSkill, value]);

  useEffect(() => {
    if (!isSkillPickerOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSkillPicker();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSkillPickerOpen]);

  function updateField<K extends keyof UmaBuildData>(field: K, nextValue: UmaBuildData[K]) {
    onChange({ ...value, [field]: nextValue });
  }

  function startNewBuild() {
    setDraftBuildName("");
    if (onNewBuild) {
      onNewBuild();
    } else {
      onChange(emptyBuild);
    }
  }

  function getSkillId(skill: string) {
    return findSkill(skillList, skill)?.id ?? skill;
  }

  function isForcedSkill(skillId: string) {
    return uniqueSkill?.id === getSkillId(skillId);
  }

  function isUnavailableSkill(skill: SkillEntry) {
    return !skill.isGeneralSkill && skill.id.startsWith("1") &&
      skill.id !== uniqueSkill?.id;
  }

  function selectSkill(skillId: string) {
    const selectedSkill = skillList.find((entry) => entry.id === skillId);
    const selectedSkillId = selectedSkill?.id ?? skillId;

    if (value.skills.some((skill) => getSkillId(skill) === selectedSkillId) &&
      skillPickerIndex === null) return;

    const replacedSkillIndex = selectedSkill?.groupId
      ? value.skills.findIndex((skill) => findSkill(skillList, skill)?.groupId === selectedSkill.groupId)
      : -1;

    const skillsWithoutGroup = selectedSkill?.groupId
      ? value.skills.filter((skill) =>
        findSkill(skillList, skill)?.groupId !== selectedSkill.groupId || isForcedSkill(skill))
      : value.skills;

    const skills = [...skillsWithoutGroup];

    const insertionIndex = skillPickerIndex === null
      ? replacedSkillIndex === -1 ? skills.length : Math.min(replacedSkillIndex, skills.length)
      : Math.min(skillPickerIndex, skills.length);

    if (!skills.some((skill) => getSkillId(skill) === selectedSkillId)) {
      skills.splice(insertionIndex, 0, selectedSkillId);
    }

    const forcedSkillPositions = Object.fromEntries(
      Object.entries(value.forcedSkillPositions).filter(([skill]) =>
        skills.some((current) => getSkillId(current) === getSkillId(skill)),
      ),
    );

    onChange({ ...value, skills, forcedSkillPositions });
  }

  function removeSkill(index: number) {
    const skillId = value.skills[index];

    if (skillId && isForcedSkill(skillId)) return;

    const forcedSkillPositions = { ...value.forcedSkillPositions };

    if (skillId) delete forcedSkillPositions[skillId];

    onChange({
      ...value,
      skills: value.skills.filter((_, skillIndex) => skillIndex !== index),
      forcedSkillPositions,
    });
  }

  function openSkillPicker(index: number | null = null) {
    setSkillPickerIndex(index);
    setIsSkillPickerOpen(true);
    setSkillSearch("");
  }

  function closeSkillPicker() {
    setSkillPickerIndex(null);
    setIsSkillPickerOpen(false);
    setSkillSearch("");
  }

  async function copyBuildJson() {
    const normalise = (skill: string) => findSkill(skillList, skill)?.id ?? skill;
    try {
      await navigator.clipboard.writeText(JSON.stringify({
        ...value,
        skills: value.skills.map(normalise),
        forcedSkillPositions: Object.fromEntries(
          Object.entries(value.forcedSkillPositions).map(([skill, position]) => [normalise(skill), position]),
        ),
      }, null, 2));

      setIsBuildCopied(true);
      window.setTimeout(() => setIsBuildCopied(false), 2000);
    } catch (error) {
      console.error("Error copying Uma build:", error);
    }
  }

  async function loadBuildJson() {
    try {
      const rawBuild = JSON.parse(await navigator.clipboard.readText()) as Record<string, unknown>;
      const numberFields = ["starCount", "uniqueLv", "speed", "stamina", "power", "guts", "wisdom", "mood"];
      const stringFields = ["outfitId", "strategy", "distanceAptitude", "surfaceAptitude", "strategyAptitude"];

      const numberFieldsValid = numberFields.every((field) => typeof rawBuild[field] === "number" && Number.isFinite(rawBuild[field]));
      const stringFieldsValid = stringFields.every((field) => typeof rawBuild[field] === "string");
      const moodValid = (rawBuild.mood as number) >= -2 && (rawBuild.mood as number) <= 2;
      const skillsValid = Array.isArray(rawBuild.skills) && rawBuild.skills.every((skill) => typeof skill === "string");
      const forcedSkillPositionsValid = rawBuild.forcedSkillPositions && typeof rawBuild.forcedSkillPositions === "object" &&
        !Array.isArray(rawBuild.forcedSkillPositions) &&
        Object.values(rawBuild.forcedSkillPositions).every((position) => typeof position === "number" && Number.isFinite(position));

      const valid = rawBuild && typeof rawBuild === "object" &&
        numberFieldsValid &&
        stringFieldsValid &&
        moodValid &&
        skillsValid &&
        forcedSkillPositionsValid;


      if (!valid) throw new Error("Uma build JSON has an invalid format");
      onChange(rawBuild as unknown as UmaBuildData);
      setIsBuildLoaded(true);
      window.setTimeout(() => setIsBuildLoaded(false), 2000);
    } catch (error) {
      console.error("Error loading Uma build:", error);
    }
  }

  return {
    uniqueSkill,
    skillPickerIndex,
    isSkillPickerOpen,
    skillSearch,
    setSkillSearch,
    isBuildCopied,
    isBuildLoaded,
    openAptitude,
    setOpenAptitude,
    openChoice,
    setOpenChoice,
    draftBuildName,
    setDraftBuildName,
    saveName: draftBuildName.trim(),
    hasDuplicateName: savedBuilds.some((build) => build.name === draftBuildName.trim() && build.id !== buildId),
    updateField,
    startNewBuild,
    getSkillId,
    isForcedSkill,
    isUnavailableSkill,
    selectSkill,
    removeSkill,
    openSkillPicker,
    closeSkillPicker,
    copyBuildJson,
    loadBuildJson,
    filteredSkills: skillList.filter((skill) =>
      !isUnavailableSkill(skill) && skill.name.toLowerCase().includes(skillSearch.trim().toLowerCase()),
    ),
  };
}
