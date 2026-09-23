import type { SkillEntry } from "../../types/SkillEntry";
import type { UmaBuild as UmaBuildData } from "../../types/UmaBuild";

interface Props {
  value: UmaBuildData;
  skillList: SkillEntry[];
  skillPickerIndex: number | null;
  isSkillPickerOpen: boolean;
  skillSearch: string;
  filteredSkills: SkillEntry[];
  getSkillId: (skill: string) => string;
  isForcedSkill: (skill: string) => boolean;
  isUnavailableSkill: (skill: SkillEntry) => boolean;
  setSkillSearch: (value: string) => void;
  openSkillPicker: (index?: number | null) => void;
  closeSkillPicker: () => void;
  selectSkill: (id: string) => void;
  removeSkill: (index: number) => void;
}

export default function UmaBuildSkills({ 
  value, skillList, skillPickerIndex, isSkillPickerOpen, 
  skillSearch, filteredSkills, getSkillId, isForcedSkill, 
  isUnavailableSkill, setSkillSearch, openSkillPicker, 
  closeSkillPicker, selectSkill, removeSkill 
}: Props) {
  const getEntry = (skill: string) => skillList.find((entry) => entry.id === skill || entry.name === skill);

  return <section className="uma-build__panel uma-build__skills" aria-labelledby="skills-heading">
    <div 
      className="uma-build__section-heading"
    >
      <div>
        <h4 id="skills-heading">Skills</h4>
        <span>{value.skills.length} selected</span>
      </div>
      <button className="uma-build__add-skill" type="button" onClick={() => openSkillPicker()}>+ Add skill</button>
    </div>

    {value.skills.length === 0 ? <button className="uma-build__empty" type="button" onClick={() => openSkillPicker()}><strong>No skills added yet</strong><span>Click to search and add a skill</span></button> :
      <div className="uma-build__skill-list">{value.skills.map((skill, index) => {
        const entry = getEntry(skill);
        const special = entry ? !entry.isGeneralSkill && entry.id.startsWith("1") : false;
        return <div className="uma-build__skill-row" key={`${skill}-${index}`}>
          <button 
            className={`uma-build__skill-value${special ? " uma-build__skill-value--special" : ""}`} 
            type="button" 
            onClick={() => { if (!isForcedSkill(skill)) openSkillPicker(index); }}
          >
            {entry ? <img src={`/icons/skills/${entry.iconId || 0}.png`} alt="" /> : null}{entry?.name ?? skill}
          </button>
          <button 
            className="uma-build__remove-skill" 
            type="button" 
            aria-label={`Remove skill ${index + 1}`} 
            disabled={isForcedSkill(skill)} 
            onClick={() => removeSkill(index)}
          >×</button>
        </div>;
      })}
      </div>
    }

    {isSkillPickerOpen ? <div className="uma-build__skill-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeSkillPicker(); }}>
      <section className="uma-build__skill-dialog" role="dialog" aria-label="Select a skill">

        <header>
          <h3>{skillPickerIndex === null ? "Add skill" : "Change skill"}</h3>
          <button 
            type="button" 
            aria-label="Close skill selector" 
            onClick={closeSkillPicker}
          >×</button>
        </header>
        <input 
          autoFocus 
          type="search" 
          value={skillSearch} 
          placeholder="Search skills" 
          onChange={(event) => setSkillSearch(event.target.value)} 
        />
        <div className="uma-build__skill-options">
          {filteredSkills.slice(0, 50).map((skill) => 
              <button 
                type="button" 
                key={skill.id} 
                className={isUnavailableSkill(skill) ? "uma-build__skill-option--special" : undefined} 
                disabled={value.skills.some((current) => getSkillId(current) === skill.id)} 
                onClick={() => selectSkill(skill.id)}
              >
                <img src={`/icons/skills/${skill.iconId || 0}.png`} alt="" />{skill.name}
              </button>
            )
          }
        </div>
      </section>
    </div> : null}
  </section>;
}
