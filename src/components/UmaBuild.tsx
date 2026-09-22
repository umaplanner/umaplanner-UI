import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import type { UmaBuild as UmaBuildData } from "../types/UmaBuild";
import type { SkillEntry } from "../types/SkillEntry";
import "../styles/UmaBuild.css";

interface UmaBuildProps {
  teamNumber: number;
  value: UmaBuildData;
  onChange: (value: UmaBuildData) => void;
  selector: ReactNode;
  skillList: SkillEntry[];
  uniqueSkillId?: number;
}

const aptitudeOptions = ["S", "A", "B", "C", "D", "E", "F", "G"];
const aptitudeRankImages: Record<string, number> = {
  S: 14,
  A: 12,
  B: 10,
  C: 8,
  D: 6,
  E: 4,
  F: 2,
  G: 0,
};
const strategyOptions = ["Nige", "Senkou", "Sashi", "Oikomi", "Oonige"];
const strategyIcons: Record<string, string> = {
  Nige: "front",
  Senkou: "pace",
  Sashi: "late",
  Oikomi: "end",
};
const moodOptions = [-2, -1, 0, 1, 2];
const statFields = ["speed", "stamina", "power", "guts", "wisdom"] as const;
const maxStatRank = 97;

function getStatRank(stat: number) {
  const nonNegativeStat = Math.max(0, stat);

  if (nonNegativeStat < 400) {
    return Math.floor(nonNegativeStat / 50);
  }

  if (nonNegativeStat < 1100) {
    return 8 + Math.floor((nonNegativeStat - 400) / 100);
  }

  if (nonNegativeStat < 1150) {
    return 16;
  }

  if (nonNegativeStat <= 1200) {
    return 17;
  }

  if (nonNegativeStat < 1210) {
    return 18;
  }

  return Math.min(
    maxStatRank,
    19 + Math.floor((nonNegativeStat - 1210) / 10),
  );
}

export default function UmaBuild({
  teamNumber,
  value,
  onChange,
  selector,
  skillList,
  uniqueSkillId,
}: UmaBuildProps) {
  const [skillPickerIndex, setSkillPickerIndex] = useState<number | null>(null);
  const [isSkillPickerOpen, setIsSkillPickerOpen] = useState(false);
  const [skillSearch, setSkillSearch] = useState("");
  const [isBuildCopied, setIsBuildCopied] = useState(false);
  const [isBuildLoaded, setIsBuildLoaded] = useState(false);
  const [openAptitude, setOpenAptitude] = useState<string | null>(null);
  const [openChoice, setOpenChoice] = useState<string | null>(null);
  const copiedTimeoutRef = useRef<number | null>(null);
  const loadedTimeoutRef = useRef<number | null>(null);
  const uniqueSkill = uniqueSkillId === undefined
    ? undefined
    : skillList.find((skill) => skill.id === String(uniqueSkillId));

  function getSkillEntry(skillId: string) {
    return skillList.find((skill) => skill.id === skillId) ??
      skillList.find((skill) => skill.name === skillId);
  }

  function getSkillId(skill: string) {
    return getSkillEntry(skill)?.id ?? skill;
  }

  function isForcedSkill(skillId: string) {
    return uniqueSkill?.id === getSkillId(skillId);
  }

  function isUniqueSkill(skill: SkillEntry) {
    return !skill.isGeneralSkill && skill.id.startsWith("1");
  }

  function isUnavailableSkill(skill: SkillEntry) {
    return isUniqueSkill(skill) || skill.name === uniqueSkill?.name;
  }

  useEffect(() => {
    if (!uniqueSkill) {
      return;
    }

    const skills = [
      uniqueSkill.id,
      ...value.skills.filter((skill) => {
        const skillEntry = skillList.find(
          (entry) => entry.id === skill || entry.name === skill,
        );
        return skillEntry?.name !== uniqueSkill.name &&
          (skillEntry?.id ?? skill) !== uniqueSkill.id;
      }),
    ];
    const forcedSkillPositions = Object.fromEntries(
      Object.entries(value.forcedSkillPositions).filter(([skillName]) =>
        skills.includes(skillName),
      ),
    );
    forcedSkillPositions[uniqueSkill.id] = 0;

    if (
      value.skills.length === skills.length &&
      value.skills.every((skill, index) => skill === skills[index]) &&
      value.forcedSkillPositions[uniqueSkill.id] === 0
    ) {
      return;
    }

    onChange({
      ...value,
      skills,
      forcedSkillPositions,
    });
  }, [onChange, skillList, uniqueSkill, value]);

  function updateField<K extends keyof UmaBuildData>(
    field: K,
    nextValue: UmaBuildData[K],
  ) {
    onChange({ ...value, [field]: nextValue });
  }

  function handleNumberChange(
    event: ChangeEvent<HTMLInputElement>,
    field: keyof UmaBuildData,
  ) {
    updateField(field, Math.max(0, Number(event.target.value)));
  }

  function clearBuild() {
    onChange({
      ...value,
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
    });
  }

  async function copyBuildJson() {
    const skillIdByName = new Map(
      skillList.map((skill) => [skill.name, skill.id]),
    );
    const skills = value.skills.map((skill) =>
      getSkillEntry(skill)?.id ?? skillIdByName.get(skill) ?? skill
    );
    const forcedSkillPositions = Object.fromEntries(
      Object.entries(value.forcedSkillPositions).map(([skill, position]) => [
        getSkillEntry(skill)?.id ?? skillIdByName.get(skill) ?? skill,
        position,
      ]),
    );
    const buildJson = JSON.stringify({
      ...value,
      skills,
      forcedSkillPositions,
    }, null, 2);

    try {
      await navigator.clipboard.writeText(buildJson);
      setIsBuildCopied(true);
      if (copiedTimeoutRef.current !== null) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
      copiedTimeoutRef.current = window.setTimeout(
        () => setIsBuildCopied(false),
        2000,
      );
    } catch (error) {
      console.error("Error copying Uma build:", error);
    }
  }

  async function loadBuildJson() {
    try {
      const parsed: unknown = JSON.parse(await navigator.clipboard.readText());

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        throw new Error("Uma build JSON must be an object");
      }

      const rawBuild = parsed as Record<string, unknown>;
      const requiredNumberFields = [
        "starCount",
        "uniqueLv",
        "speed",
        "stamina",
        "power",
        "guts",
        "wisdom",
        "mood",
      ];
      const hasValidNumberFields = requiredNumberFields.every(
        (field) =>
          typeof rawBuild[field] === "number" &&
          Number.isFinite(rawBuild[field]),
      );
      const hasValidStringFields = [
        "outfitId",
        "strategy",
        "distanceAptitude",
        "surfaceAptitude",
        "strategyAptitude",
      ].every((field) => typeof rawBuild[field] === "string");
      const skills = rawBuild.skills;
      const forcedSkillPositions = rawBuild.forcedSkillPositions;

      if (
        !hasValidNumberFields ||
        !hasValidStringFields ||
        (rawBuild.mood as number) < -2 ||
        (rawBuild.mood as number) > 2 ||
        !Array.isArray(skills) ||
        !skills.every((skill) => typeof skill === "string") ||
        !forcedSkillPositions ||
        typeof forcedSkillPositions !== "object" ||
        Array.isArray(forcedSkillPositions) ||
        !Object.values(forcedSkillPositions).every(
          (position) =>
            typeof position === "number" && Number.isFinite(position),
        )
      ) {
        throw new Error("Uma build JSON has an invalid format");
      }

      const validatedForcedSkillPositions =
        forcedSkillPositions as Record<string, number>;
      const loadedBuild: UmaBuildData = {
        outfitId: rawBuild.outfitId as string,
        starCount: rawBuild.starCount as number,
        uniqueLv: rawBuild.uniqueLv as number,
        speed: rawBuild.speed as number,
        stamina: rawBuild.stamina as number,
        power: rawBuild.power as number,
        guts: rawBuild.guts as number,
        wisdom: rawBuild.wisdom as number,
        strategy: rawBuild.strategy as string,
        distanceAptitude: rawBuild.distanceAptitude as string,
        surfaceAptitude: rawBuild.surfaceAptitude as string,
        strategyAptitude: rawBuild.strategyAptitude as string,
        mood: rawBuild.mood as number,
        skills,
        forcedSkillPositions: validatedForcedSkillPositions,
      };
      onChange(loadedBuild);
      setIsBuildLoaded(true);
      if (loadedTimeoutRef.current !== null) {
        window.clearTimeout(loadedTimeoutRef.current);
      }
      loadedTimeoutRef.current = window.setTimeout(
        () => setIsBuildLoaded(false),
        2000,
      );
    } catch (error) {
      console.error("Error loading Uma build:", error);
    }
  }

  function selectSkill(skillId: string) {
    const selectedSkill = skillList.find((entry) => entry.id === skillId);
    const selectedSkillId = selectedSkill?.id ?? skillId;
    if (value.skills.some((currentSkill) => getSkillId(currentSkill) === selectedSkillId) && skillPickerIndex === null) {
      return;
    }

    const replacedSkillIndex = selectedSkill?.groupId
      ? value.skills.findIndex((currentSkill) => {
          const currentEntry = getSkillEntry(currentSkill);
          return currentEntry?.groupId === selectedSkill.groupId;
        })
      : -1;
    const skillsWithoutGroup = selectedSkill?.groupId
      ? value.skills.filter((currentSkill) => {
          const currentEntry = getSkillEntry(currentSkill);
          return currentEntry?.groupId !== selectedSkill.groupId ||
            isForcedSkill(currentSkill);
        })
      : value.skills;

    const skills = [...skillsWithoutGroup];
    if (skillPickerIndex === null) {
      const insertionIndex = replacedSkillIndex === -1
        ? skills.length
        : Math.min(replacedSkillIndex, skills.length);
      skills.splice(insertionIndex, 0, selectedSkillId);
    } else {
      const replacementIndex = Math.min(skillPickerIndex, skills.length);
      if (!skills.some((currentSkill) => getSkillId(currentSkill) === selectedSkillId)) {
        skills.splice(replacementIndex, 0, selectedSkillId);
      }
    }

    const forcedSkillPositions = Object.fromEntries(
      Object.entries(value.forcedSkillPositions).filter(([skillId]) =>
        skills.some((currentSkill) => getSkillId(currentSkill) === getSkillId(skillId)),
      ),
    );
    onChange({ ...value, skills, forcedSkillPositions });
  }

  function removeSkill(index: number) {
    const skillId = value.skills[index];
    if (skillId && isForcedSkill(skillId)) {
      return;
    }

    const forcedSkillPositions = { ...value.forcedSkillPositions };
    if (skillId) {
      delete forcedSkillPositions[skillId];
    }
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

  const filteredSkills = skillList.filter((skill) =>
    !isUnavailableSkill(skill) &&
    skill.name.toLowerCase().includes(skillSearch.trim().toLowerCase()),
  );

  useEffect(() => {
    if (!isSkillPickerOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeSkillPicker();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSkillPickerOpen]);

  useEffect(() => () => {
    if (copiedTimeoutRef.current !== null) {
      window.clearTimeout(copiedTimeoutRef.current);
    }
    if (loadedTimeoutRef.current !== null) {
      window.clearTimeout(loadedTimeoutRef.current);
    }
  }, []);

  return (
    <section className="uma-build" aria-label={`Build Uma ${teamNumber}`}>
      <div className="uma-build__selector">{selector}</div>

      <section className="uma-build__panel uma-build__stats-panel" aria-labelledby={`stats-heading-${teamNumber}`}>
        <div className="uma-build__stats-section">
          <div className="uma-build__section-heading">
          <h4 id={`stats-heading-${teamNumber}`}>Stats</h4>
          <div>
            <button type="button" onClick={() => void copyBuildJson()}>
              {isBuildCopied ? "Copied" : "Copy JSON"}
            </button>
            <button type="button" onClick={() => void loadBuildJson()}>
              {isBuildLoaded ? "Loaded" : "Load JSON"}
            </button>
            <button type="button" onClick={clearBuild}>Clear build</button>
          </div>
          </div>
          <div className="uma-build__stats">
          {statFields.map((field) => (
            <label key={field}>
              <span>{field}</span>
              <span className="uma-build__stat-control">
                <img
                  src={`/icons/statrank/rank_${String(getStatRank(value[field])).padStart(2, "0")}.png`}
                  alt={`${field} rank ${getStatRank(value[field])}`}
                />
                <input
                  type="number"
                  min="0"
                  value={Math.max(0, value[field])}
                  onChange={(event) => handleNumberChange(event, field)}
                />
              </span>
            </label>
          ))}
          </div>
        </div>
        <div className="uma-build__aptitudes-section">
          <div className="uma-build__section-heading">
            <h4 id={`aptitudes-heading-${teamNumber}`}>Aptitudes</h4>
          </div>
          <div className="uma-build__aptitudes">
          {([
            ["surfaceAptitude", "Surface"],
            ["distanceAptitude", "Distance"],
            ["strategyAptitude", "Style"],
          ] as const).map(([field, label]) => (
            <label key={field}>
              <span>{label}</span>
              <span className="uma-build__aptitude-selector">
                <button
                  className="uma-build__aptitude-current"
                  type="button"
                  aria-label={`${label} aptitude ${value[field]}`}
                  aria-expanded={openAptitude === field}
                  onClick={() => {
                    setOpenChoice(null);
                    setOpenAptitude(openAptitude === field ? null : field);
                  }}
                >
                  <img
                    src={`/icons/statrank/rank_${String(aptitudeRankImages[value[field]]).padStart(2, "0")}.png`}
                    alt={value[field]}
                  />
                </button>
                {openAptitude === field ? (
                  <span className="uma-build__aptitude-options" role="group" aria-label={`${label} aptitude options`}>
                    {aptitudeOptions.map((aptitude) => (
                      <button
                        className={value[field] === aptitude ? "uma-build__aptitude-option--selected" : undefined}
                        type="button"
                        key={aptitude}
                        aria-label={`${label} aptitude ${aptitude}`}
                        aria-pressed={value[field] === aptitude}
                        onClick={() => {
                          updateField(field, aptitude);
                          setOpenAptitude(null);
                        }}
                      >
                        <img
                          src={`/icons/statrank/rank_${String(aptitudeRankImages[aptitude]).padStart(2, "0")}.png`}
                          alt={aptitude}
                        />
                      </button>
                    ))}
                  </span>
                ) : null}
              </span>
            </label>
          ))}
          <label>
            <span>Mood</span>
            <span className="uma-build__choice-selector uma-build__mood-selector">
              <button
                className="uma-build__choice-current"
                type="button"
                aria-label={`Mood ${value.mood > 0 ? `+${value.mood}` : value.mood}`}
                aria-expanded={openChoice === "mood"}
                onClick={() => {
                  setOpenAptitude(null);
                  setOpenChoice(openChoice === "mood" ? null : "mood");
                }}
              >
                <img
                  src={`/icons/mood/mood_${value.mood + 2}.png`}
                  alt={`Mood ${value.mood > 0 ? `+${value.mood}` : value.mood}`}
                />
              </button>
              {openChoice === "mood" ? (
                <span className="uma-build__choice-options" role="group" aria-label="Mood options">
                  {moodOptions.map((mood) => (
                    <button
                      type="button"
                      key={mood}
                      aria-label={`Mood ${mood > 0 ? `+${mood}` : mood}`}
                      onClick={() => {
                        updateField("mood", mood);
                        setOpenChoice(null);
                      }}
                    >
                      <img
                        src={`/icons/mood/mood_${mood + 2}.png`}
                        alt={`Mood ${mood > 0 ? `+${mood}` : mood}`}
                      />
                    </button>
                  ))}
                </span>
                ) : null}
              </span>
            </label>
            <label className="uma-build__strategy">
              <span>Strategy</span>
              <span className="uma-build__choice-selector">
                <button
                  className="uma-build__choice-current"
                  type="button"
                  aria-label={`Strategy ${value.strategy}`}
                  aria-expanded={openChoice === "strategy"}
                  onClick={() => {
                    setOpenAptitude(null);
                    setOpenChoice(openChoice === "strategy" ? null : "strategy");
                  }}
                >
                  {strategyIcons[value.strategy] ? (
                    <img src={`/icons/style/${strategyIcons[value.strategy]}.webp`} alt={value.strategy} />
                  ) : value.strategy}
                </button>
                {openChoice === "strategy" ? (
                  <span className="uma-build__choice-options" role="group" aria-label="Strategy options">
                    {strategyOptions.map((strategy) => (
                      <button
                        type="button"
                        key={strategy}
                        aria-label={`Strategy ${strategy}`}
                        onClick={() => {
                          updateField("strategy", strategy);
                          setOpenChoice(null);
                        }}
                      >
                        {strategyIcons[strategy] ? (
                          <img src={`/icons/style/${strategyIcons[strategy]}.webp`} alt={strategy} />
                        ) : strategy}
                      </button>
                    ))}
                  </span>
                ) : null}
              </span>
            </label>
          </div>
        </div>
      </section>

      <section className="uma-build__panel uma-build__skills" aria-labelledby={`skills-heading-${teamNumber}`}>
        <div className="uma-build__section-heading">
          <div>
            <h4 id={`skills-heading-${teamNumber}`}>Skills</h4>
            <span>{value.skills.length} selected</span>
          </div>
          <button className="uma-build__add-skill" type="button" onClick={() => openSkillPicker()}>
            + Add skill
          </button>
        </div>
        {value.skills.length === 0 ? (
          <button className="uma-build__empty" type="button" onClick={() => openSkillPicker()}>
            <strong>No skills added yet</strong>
            <span>Click to search and add a skill</span>
          </button>
        ) : (
          <div className="uma-build__skill-list">
            {value.skills.map((skill, index) => (
              <div className="uma-build__skill-row" key={`${skill}-${index}`}>
                {(() => {
                  const skillEntry = getSkillEntry(skill);
                  const isSpecialSkill = skillEntry
                    ? !skillEntry.isGeneralSkill && skillEntry.id.startsWith("1")
                    : false;
                  return (
                    <button
                      className={`uma-build__skill-value${isSpecialSkill ? " uma-build__skill-value--special" : ""}`}
                      type="button"
                      onClick={() => {
                        if (!isForcedSkill(skill)) {
                          openSkillPicker(index);
                        }
                      }}
                    >
                  {skillEntry ? (
                    <img
                      src={`/icons/skills/${skillEntry.iconId || 0}.png`}
                      alt=""
                    />
                  ) : null}
                  {skillEntry?.name ?? skill}
                    </button>
                  );
                })()}
                <button className="uma-build__remove-skill" type="button" aria-label={`Remove skill ${index + 1}`} disabled={isForcedSkill(skill)} onClick={() => removeSkill(index)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {isSkillPickerOpen ? (
        <div className="uma-build__skill-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeSkillPicker();
        }}>
          <section className="uma-build__skill-dialog" role="dialog" aria-label="Select a skill">
            <header>
              <h3>{skillPickerIndex === null ? "Add skill" : "Change skill"}</h3>
              <button type="button" aria-label="Close skill selector" onClick={closeSkillPicker}>×</button>
            </header>
            <input autoFocus type="search" value={skillSearch} placeholder="Search skills" onChange={(event) => setSkillSearch(event.target.value)} />
            <div className="uma-build__skill-options">
              {filteredSkills.slice(0, 50).map((skill) => (
                <button
                  type="button"
                  key={skill.id}
                  className={
                    isUnavailableSkill(skill)
                      ? "uma-build__skill-option--special"
                      : undefined
                  }
                  disabled={value.skills.some((currentSkill) => getSkillId(currentSkill) === skill.id)}
                  onClick={() => selectSkill(skill.id)}
                >
                  <img src={`/icons/skills/${skill.iconId || 0}.png`} alt="" />
                  {skill.name}
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
