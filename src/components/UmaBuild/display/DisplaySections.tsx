import type { SkillEntry } from "../../../types/SkillEntry";
import type { UmaBuild as UmaBuildData } from "../../../types/UmaBuild";
import UmaBuildAptitudes from "../editor/Aptitudes";
import UmaBuildStats from "../editor/Stats";
import { findSkill, sortSkillsByDisplayOrder } from "../utils";
import SupportCardImage from "../support-cards/Image";

interface Props {
  build: UmaBuildData;
  uniqueSkill: SkillEntry | undefined;
  skillList: SkillEntry[];
  teamNumber: number;
  showSupportCards: boolean;
}

export default function UmaBuildDisplaySections({ build, uniqueSkill, skillList, teamNumber, showSupportCards }: Props) {
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

      {showSupportCards && build.supportCards && build.supportCards.length > 0 ? (
        <section className="uma-build__panel uma-build__support-cards" aria-labelledby={`support-cards-heading-${teamNumber}`}>
          <div className="uma-build__section-heading">
            <h4 id={`support-cards-heading-${teamNumber}`}>Support Cards</h4>
          </div>
          <div className="uma-build__support-card-list">
            {build.supportCards.map((card) => (
              <div className="uma-build__support-card" key={card.position}>
                <SupportCardImage card={card} />
                <small>LB {card.limit_break_count}</small>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="uma-build__panel uma-build__skills" aria-labelledby={`skills-heading-${teamNumber}`}>
        <div className="uma-build__section-heading">
          <div>
            <h4 id={`skills-heading-${teamNumber}`}>Skills</h4>
          </div>
        </div>
        {build.skills.length === 0 ? <p className="uma-build__skills-placeholder">No skills added yet</p> : <div className="uma-build__skill-list">
          {sortSkillsByDisplayOrder(build.skills, skillList).map((skill, index) => {
            const entry = findSkill(skillList, skill);
            const isUnique = entry?.id === uniqueSkill?.id;
            return <div className={`uma-build__skill-row${isUnique ? " uma-build__skill-row--special" : ""}`} key={`${skill}-${index}`}>
              {entry ? <img src={`/icons/skills/${entry.iconId || 0}.png`} alt="" /> : null}
              <span className={isUnique ? "uma-build__skill-value--special" : undefined}>
                {entry?.name ?? skill}
              </span>
            </div>;
          })}
        </div>}
      </section>
    </>
  );
}
