import { useCallback, useEffect, useState } from "react";
import type { SkillEntry } from "../../../types/SkillEntry";
import type { UmaBuild as UmaBuildData } from "../../../types/UmaBuild";
import {
  findSkill,
  hasRunawaySkill,
  isRunawaySkill,
  normalizeStrategyName,
  runawaySkillId,
  runawayStrategy,
} from "../utils";
import { useSkillPickerPreferences } from "../../Preferences";

interface Options {
  value: UmaBuildData;
  onChange: (value: UmaBuildData) => void;
  skillList: SkillEntry[];
  uniqueSkillId?: number;
  buildName: string;
  buildId: string | null;
  savedBuilds: { id: string; name: string }[];
  onNewBuild?: () => void;
  onBuildLoaded?: (build: UmaBuildData) => void;
}

const emptyBuild: UmaBuildData = {
  outfitId: "",
  "build-type": "standard",
  starCount: 3,
  uniqueLv: 3,
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
  onBuildLoaded,
}: Options) {
  const [skillPickerIndex, setSkillPickerIndex] = useState<number | null>(null);
  const [isSkillPickerOpen, setIsSkillPickerOpen] = useState(false);
  const [skillSearch, setSkillSearch] = useState("");
  const {
    sort: skillSort,
    setSort: setSkillSort,
    ascending: skillSortAscending,
    setAscending: setSkillSortAscending,
  } = useSkillPickerPreferences();
  const [isBuildCopied, setIsBuildCopied] = useState(false);
  const [isBuildLoaded, setIsBuildLoaded] = useState(false);
  const [openAptitude, setOpenAptitude] = useState<string | null>(null);
  const [openChoice, setOpenChoice] = useState<string | null>(null);
  const [draftBuildName, setDraftBuildName] = useState(buildName);
  const uniqueSkill = uniqueSkillId === undefined
    ? undefined
    : skillList.find((skill) => skill.id === String(uniqueSkillId));
  const getSkillId = useCallback(
    (skill: string) => findSkill(skillList, skill)?.id ?? skill,
    [skillList],
  );

  useEffect(() => setDraftBuildName(buildName), [buildName]);

  useEffect(() => {
    const shouldForceUniqueSkill = uniqueSkill !== undefined &&
      (!isRunawaySkill(skillList, uniqueSkill.id) ||
        value.strategy === runawayStrategy);
    const previouslyForcedSkills = new Set(
      Object.keys(value.forcedSkillPositions).map(getSkillId),
    );
    const retainedSkills = value.skills.filter((skill) => {
      const skillId = getSkillId(skill);
      return !previouslyForcedSkills.has(skillId) &&
        !(uniqueSkill && !shouldForceUniqueSkill && skillId === uniqueSkill.id);
    });
    const skills = shouldForceUniqueSkill && uniqueSkill
      ? [
          uniqueSkill.id,
          ...retainedSkills.filter((skill) => getSkillId(skill) !== uniqueSkill.id),
        ]
      : retainedSkills;
    const forcedSkillPositions = shouldForceUniqueSkill && uniqueSkill
      ? { [uniqueSkill.id]: 0 }
      : {};

    if (
      value.skills.length === skills.length &&
      value.skills.every((skill, index) => skill === skills[index]) &&
      Object.keys(value.forcedSkillPositions).every(
        (skill) => forcedSkillPositions[skill] === value.forcedSkillPositions[skill],
      )
    ) return;

    onChange({ ...value, skills, forcedSkillPositions });
  }, [getSkillId, onChange, skillList, uniqueSkill, value]);

  useEffect(() => {
    if (!isSkillPickerOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSkillPicker();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSkillPickerOpen]);

  function updateField<K extends keyof UmaBuildData>(field: K, nextValue: UmaBuildData[K]) {
    if (field === "strategy" && typeof nextValue === "string") {
      if (nextValue === runawayStrategy) {
        const runawaySkill = skillList.find((skill) =>
          isRunawaySkill(skillList, skill.id),
        );
        const skills = hasRunawaySkill(skillList, value.skills)
          ? value.skills
          : [...value.skills, runawaySkill?.id ?? runawaySkillId];
        onChange({ ...value, strategy: nextValue, skills });
        return;
      }

      const removeRunawaySkills = nextValue !== runawayStrategy &&
        hasRunawaySkill(skillList, value.skills);
      if (removeRunawaySkills) {
        const skills = value.skills.filter(
          (skill) => !isRunawaySkill(skillList, skill),
        );
        const forcedSkillPositions = Object.fromEntries(
          Object.entries(value.forcedSkillPositions).filter(([skill]) =>
            skills.some((current) => getSkillId(current) === getSkillId(skill)),
          ),
        );
        onChange({ ...value, strategy: nextValue, skills, forcedSkillPositions });
        return;
      }
    }
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

  function isForcedSkill(skillId: string) {
    return uniqueSkill?.id === getSkillId(skillId) &&
      !isRunawaySkill(skillList, skillId);
  }

  function isUnavailableSkill(skill: SkillEntry) {
    return !skill.isGeneralSkill && skill.id.startsWith("1");
  }

  function sortPickerSkills(skills: SkillEntry[]) {
    return [...skills].sort((left, right) => {
      const comparison = skillSort === "alphabetical"
        ? left.name.localeCompare(right.name)
        : skillSort === "rarity"
          ? left.rarity - right.rarity
          : left.displayOrder - right.displayOrder;
      return skillSortAscending ? comparison : -comparison;
    });
  }

  function selectSkill(skillId: string) {
    const selectedSkill = skillList.find((entry) => entry.id === skillId);
    const selectedSkillId = selectedSkill?.id ?? skillId;
    const hadRunawaySkill = hasRunawaySkill(skillList, value.skills);

    if (value.skills.some((skill) => getSkillId(skill) === selectedSkillId) &&
      skillPickerIndex === null) return;

    const replacedSkillIndex = selectedSkill?.groupId
      ? value.skills.findIndex((skill) => findSkill(skillList, skill)?.groupId === selectedSkill.groupId)
      : -1;

    const skillsWithoutGroup = value.skills.filter((skill, index) => {
      if (skillPickerIndex !== null && index === skillPickerIndex) {
        return false;
      }
      return !selectedSkill?.groupId ||
        findSkill(skillList, skill)?.groupId !== selectedSkill.groupId ||
        isForcedSkill(skill);
    });

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
    const hasRunawayAfterChange = hasRunawaySkill(skillList, skills);
    const strategy = !hadRunawaySkill && hasRunawayAfterChange
      ? runawayStrategy
      : hadRunawaySkill && !hasRunawayAfterChange && value.strategy === runawayStrategy
        ? "Nige"
        : value.strategy;

    onChange({
      ...value,
      skills,
      forcedSkillPositions,
      strategy,
    });
  }

  function removeSkill(index: number) {
    const skillId = value.skills[index];

    if (skillId && isForcedSkill(skillId)) return;

    const forcedSkillPositions = { ...value.forcedSkillPositions };

    if (skillId) delete forcedSkillPositions[skillId];
    const skills = value.skills.filter((_, skillIndex) => skillIndex !== index);
    const strategy = value.strategy === runawayStrategy &&
        isRunawaySkill(skillList, skillId ?? "") &&
        !hasRunawaySkill(skillList, skills)
      ? "Nige"
      : value.strategy;

    onChange({
      ...value,
      skills,
      forcedSkillPositions,
      strategy,
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
        strategy: normalizeStrategyName(value.strategy),
        mood: 2,
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

    const numberFieldsValid = numberFields.every((field) => 
      rawBuild[field] === undefined || (typeof rawBuild[field] === "number" && Number.isFinite(rawBuild[field]))
    );
    const stringFieldsValid = stringFields.every((field) => typeof rawBuild[field] === "string");
    const moodValid = (rawBuild.mood as number) >= -2 && (rawBuild.mood as number) <= 2;
    const skillsValid = Array.isArray(rawBuild.skills) && rawBuild.skills.every((skill) => typeof skill === "string");
    const forcedSkillPositionsValid = rawBuild.forcedSkillPositions && typeof rawBuild.forcedSkillPositions === "object" &&
      !Array.isArray(rawBuild.forcedSkillPositions) &&
      (Object.keys(rawBuild.forcedSkillPositions).length === 0 || 
       Object.values(rawBuild.forcedSkillPositions).every((position) => typeof position === "number" && Number.isFinite(position)));
    const buildTypeValid = rawBuild["build-type"] === undefined ||
      rawBuild["build-type"] === "standard" ||
      rawBuild["build-type"] === "plan";

    const valid = rawBuild && typeof rawBuild === "object" &&
      numberFieldsValid &&
      stringFieldsValid &&
      buildTypeValid &&
      moodValid &&
      skillsValid &&
      forcedSkillPositionsValid;

    if (!valid) throw new Error("Uma build JSON has an invalid format");

    // Set defaults for omitted build fields.
    if (rawBuild.starCount === undefined) {
      rawBuild.starCount = 3;
    }
    if (rawBuild.uniqueLv === undefined) {
      rawBuild.uniqueLv = 3;
    }
    if (rawBuild["build-type"] === undefined) {
      rawBuild["build-type"] = "standard";
    }

    const loadedBuild = rawBuild as unknown as UmaBuildData;
    if (onBuildLoaded) {
      onBuildLoaded(loadedBuild);
    } else {
      onChange(loadedBuild);
    }
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
    skillSort,
    setSkillSort,
    skillSortAscending,
    setSkillSortAscending,
    isBuildCopied,
    isBuildLoaded,
    openAptitude,
    setOpenAptitude,
    openChoice,
    setOpenChoice,
    draftBuildName,
    setDraftBuildName,
    saveName: draftBuildName.trim(),
    willOverrideBuild: buildId !== null ||
      savedBuilds.some((build) => build.name === draftBuildName.trim() && build.id !== buildId),
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
    filteredSkills: sortPickerSkills(skillList.filter((skill) =>
      !isUnavailableSkill(skill) && skill.name.toLowerCase().includes(skillSearch.trim().toLowerCase()),
    )),
  };
}
