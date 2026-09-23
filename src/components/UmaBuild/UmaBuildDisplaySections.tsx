import type { SkillEntry } from "../../types/SkillEntry";
import type { UmaBuild as UmaBuildData } from "../../types/UmaBuild";
import UmaBuildAptitudes from "./UmaBuildAptitudes";
import UmaBuildStats from "./UmaBuildStats";
import { findSkill } from "./umaBuildUtils";

interface Props {
  build: UmaBuildData;
  uniqueSkill: SkillEntry | undefined;
  skillList: SkillEntry[];
  teamNumber: number;
}

export default function UmaBuildDisplaySections({ build, uniqueSkill, skillList, teamNumber }: Props) {
  return (
    <>
      <section className="uma-build__panel uma-build__stats-panel" aria-labelledby={`stats-heading-${teamNumber}`}>
        <div className="uma-build__stats-section">
          <div className="uma-build__section-heading">
            <h4 id={`stats-heading-${teamNumber}`}>
              Stats
            </h4>
          </div>
          <UmaBuildStats value={build} />
        </div>
        <div className="uma-build__aptitudes-section">
          <div className="uma-build__section-heading">
            <h4>Aptitudes</h4>
          </div>
          <UmaBuildAptitudes value={build} />
        </div>
      </section>

      <section className="uma-build__panel uma-build__skills" aria-labelledby={`skills-heading-${teamNumber}`}>
        <div className="uma-build__section-heading">
          <div>
            <h4 id={`skills-heading-${teamNumber}`}>Skills</h4>
          </div>
        </div>
        {build.skills.length === 0 ? <p>No skills added yet</p> : <div className="uma-build__skill-list">
          {build.skills.map((skill, index) => {
            const entry = findSkill(skillList, skill);
            const isUnique = entry?.id === uniqueSkill?.id;
            return <div className={`uma-build__skill-row${isUnique ? " uma-build__skill-row--special" : ""}`} key={`${skill}-${index}`}>
              {entry ? <img src={`/icons/skills/${entry.iconId || 0}.png`} alt="" /> : null}
              <span className={isUnique ? "uma-build__skill-value--special" : undefined}>{entry?.name ?? skill}</span>
            </div>;
          })}
        </div>}
      </section>
    </>
  );
}
