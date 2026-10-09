import UmaImage from "../../../components/UmaImage";
import {
  getStatRank,
  statFields,
  strategyIcons,
} from "../../../components/UmaBuild/utils";
import SupportCardImage from "../../../components/UmaBuild/support-cards/Image";
import type { SkillEntry } from "../../../types/SkillEntry";
import type { SupportCardEntry } from "../../../types/UmaBuild";
import type { UmaEntry } from "../../../types/UmaEntry";
import ExpandableList from "../components/ExpandableList";
import type { RunningStyleOverview } from "../types";
import {
  formatBuildCount,
  formatCount,
  formatPercent,
  RUNNING_STYLE_TABS,
} from "../utils";

type RunningStyleProps = {
  selectedStyle: string;
  onSelectStyle: (style: string) => void;
  runningStyle: RunningStyleOverview;
  umaList: UmaEntry[];
  skillList: SkillEntry[];
  supportCardList: SupportCardEntry[];
};

export default function RunningStyle({
  selectedStyle,
  onSelectStyle,
  runningStyle,
  umaList,
  skillList,
  supportCardList,
}: RunningStyleProps) {
  const averageStats = statFields.flatMap((stat) => {
    const value = runningStyle.averageStats[stat];
    return typeof value === "number"
      ? [{ stat, value: Math.round(value) }]
      : [];
  });

  return (
    <section className="overview-panel overview-style-panel" aria-labelledby="overview-style-stats">
      <div className="overview-style-panel__heading">
        <h3 id="overview-style-stats">Style-specific stats</h3>
        <p className="overview-style-build-count">
          {formatBuildCount(runningStyle.count)}
        </p>
      </div>
      <div className="overview-style-buttons" role="group" aria-label="Running styles">
        {RUNNING_STYLE_TABS.map(({ key, name }) => {
          const styleIcon = strategyIcons[key];
          return (
            <button
              className="overview-style-button"
              type="button"
              key={key}
              aria-pressed={selectedStyle === key}
              onClick={() => onSelectStyle(key)}
            >
              {styleIcon ? (
                <img src={`/icons/style/${styleIcon}.webp`} alt="" />
              ) : null}
              <span className="overview-style-button__label">{name}</span>
            </button>
          );
        })}
      </div>
      <section
        className="overview-style-section overview-style-average-stats"
        aria-labelledby="style-average-stats-heading"
      >
        <h4 id="style-average-stats-heading">Average stats</h4>
        {averageStats.length > 0 ? (
          <ul className="overview-average-stats__list">
            {averageStats.map(({ stat, value }) => {
              const rank = getStatRank(value);
              return (
                <li className="overview-style-item overview-average-stat" key={stat}>
                  <span className="overview-style-item__label">
                    <span className="overview-average-stat__label-full">
                      {stat === "wisdom" ? "Wit" : stat[0].toUpperCase() + stat.slice(1)}
                    </span>
                    <span className="overview-average-stat__label-short" aria-hidden="true">
                      {stat === "speed" ? "SPE" : stat === "stamina" ? "STA" : stat === "power" ? "POW" : stat === "guts" ? "GUTS" : "WIT"}
                    </span>
                  </span>
                  <span className="overview-average-stat__value">
                    <img
                      src={`/icons/statrank/rank_${String(rank).padStart(2, "0")}.png`}
                      alt={`${stat === "wisdom" ? "wit" : stat} rank ${rank}`}
                    />
                    <strong>{formatCount(value)}</strong>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : <p>No average stat data available.</p>}
      </section>
      <div className="overview-style-columns">
        <section className="overview-style-section overview-style-section--outfits" aria-labelledby="style-outfits-heading">
          <ExpandableList
            className="overview-style-list"
            label="Style outfits"
            title="Outfits"
            titleId="style-outfits-heading"
            headingLevel="h4"
            emptyMessage="No outfit data available."
          >
            {runningStyle.outfits.map(({ id, count }) => {
              const uma = umaList.find((entry) => String(entry.id) === id);
              return (
                <li className="overview-style-item" key={id}>
                  {uma ? (
                    <UmaImage uma={uma} className="overview-style-item__image" alt="" lazy />
                  ) : null}
                  <span className="overview-style-item__label">
                    {uma?.outfitTitle ?? `Outfit ${id}`}
                  </span>
                  <strong>{formatCount(count)}</strong>
                </li>
              );
            })}
          </ExpandableList>
        </section>
        <section className="overview-style-section overview-style-section--skills" aria-labelledby="style-skills-heading">
          <ExpandableList
            className="overview-style-list"
            popupClassName="overview-style-list overview-style-list--separated"
            label="Style skills"
            title="Skills"
            titleId="style-skills-heading"
            headingLevel="h4"
            emptyMessage="No skill data available."
          >
            {runningStyle.skills.map(({ id, count }) => {
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
                  <strong>{formatPercent(count, runningStyle.count)}</strong>
                </li>
              );
            })}
          </ExpandableList>
        </section>
        <section className="overview-style-section overview-style-section--support-cards" aria-labelledby="style-support-cards-heading">
          <ExpandableList
            className="overview-style-list"
            popupClassName="overview-support-card-list"
            columns={2}
            estimatedItemSize={100}
            itemGap={9}
            label="Style support cards"
            title="Support cards"
            titleId="style-support-cards-heading"
            headingLevel="h4"
            previewLimit={4}
            emptyMessage="No support card data available."
          >
            {runningStyle.supportCards.map(({ id, count }) => {
              const cardId = Number(id);
              const buildsWithCard = Math.min(count, runningStyle.count);
              const card = supportCardList.find((entry) => String(entry.id) === id);
              return (
                <li className="overview-style-item overview-style-support-card" key={id}>
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
                  <strong>{formatPercent(buildsWithCard, runningStyle.count)}</strong>
                </li>
              );
            })}
          </ExpandableList>
        </section>
      </div>
    </section>
  );
}
