import SupportCardImage from "../../../components/UmaBuild/support-cards/Image";
import type { SkillEntry } from "../../../types/SkillEntry";
import type { SupportCardEntry } from "../../../types/UmaBuild";
import ExpandableList from "../components/ExpandableList";
import InfoTooltip from "../components/InfoTooltip";
import type { CountedId } from "../types";
import { formatPercent } from "../utils";

type GlobalUsageProps = {
  supportCardCounts: CountedId[];
  skillCounts: CountedId[];
  supportCardList: SupportCardEntry[];
  skillList: SkillEntry[];
  totalRunningBuilds: number;
  isLoading: boolean;
};

export default function GlobalUsage({
  supportCardCounts,
  skillCounts,
  supportCardList,
  skillList,
  totalRunningBuilds,
  isLoading,
}: GlobalUsageProps) {
  return (
    <div className="overview-global-usage-columns">
      <section className="overview-panel" aria-labelledby="overview-support-cards">
        <ExpandableList
          className="overview-style-list"
          popupClassName="overview-support-card-list"
          columns={2}
          estimatedItemSize={100}
          itemGap={9}
          label="Support card usage"
          title="Support card usage"
          titleId="overview-support-cards"
          headingLevel="h3"
          titleAdornment={
            <InfoTooltip
              label="Support card percentage information"
              text="Percentages estimate build usage from aggregated card counts, capped at each style's build count."
            />
          }
          emptyMessage={!isLoading ? "No support card data available." : undefined}
        >
          {supportCardCounts.map(({ id, count }) => {
            const cardId = Number(id);
            const card = supportCardList.find((entry) => String(entry.id) === id);
            return (
              <li
                className="overview-style-item overview-style-support-card"
                key={id}
              >
                {Number.isFinite(cardId) ? (
                  <SupportCardImage
                    cardId={cardId}
                    variant="full"
                    className="overview-style-item__image"
                    alt={card?.title ?? `Support card ${id}`}
                    loading="lazy"
                  />
                ) : null}
                <span className="overview-style-item__label">
                  <strong>{card?.title ?? `Card ${id}`}</strong>
                  <small>{card?.uma ?? "Unknown Uma"}</small>
                </span>
                <strong>{formatPercent(count, totalRunningBuilds)}</strong>
              </li>
            );
          })}
        </ExpandableList>
      </section>

      <section className="overview-panel" aria-labelledby="overview-skills">
        <ExpandableList
          className="overview-style-list"
          popupClassName="overview-style-list overview-style-list--separated"
          label="Skills"
          title="Skills"
          titleId="overview-skills"
          headingLevel="h3"
          previewLimit={10}
          emptyMessage={!isLoading ? "No skill data available." : undefined}
        >
          {skillCounts.map(({ id, count }) => {
            const skill = skillList.find((entry) => entry.id === id);
            return (
              <li className="overview-style-item" key={id}>
                {skill ? (
                  <img
                    className="overview-style-item__image"
                    src={`/icons/skills/${skill.iconId || 0}.png`}
                    alt=""
                  />
                ) : null}
                <span className="overview-style-item__label">
                  {skill?.name ?? `Skill ${id}`}
                </span>
                <strong>{formatPercent(count, totalRunningBuilds)}</strong>
              </li>
            );
          })}
        </ExpandableList>
      </section>
    </div>
  );
}
