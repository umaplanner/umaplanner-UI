import { Children, useEffect, useId, useRef, useState, type ReactNode } from "react";
import UmaImage from "../../components/UmaImage";
import { getStatRank, statFields, strategyIcons } from "../../components/UmaBuild/utils";
import SupportCardImage from "../../components/UmaBuild/support-cards/Image";
import type { SkillEntry } from "../../types/SkillEntry";
import type { UmaEntry } from "../../types/UmaEntry";
import type { SupportCardEntry } from "../../types/UmaBuild";
import "../../styles/Overview.css";

type OverviewProps = {
  selectedEvent: string;
  data: unknown;
  umaList: UmaEntry[];
  skillList: SkillEntry[];
  supportCardList: SupportCardEntry[];
  isLoading: boolean;
  error?: string;
};

type CountedOutfit = {
  id: string;
  count: number;
};

type CountedTeam = {
  members: Array<{ id?: string; label: string }>;
  count: number;
};

type CountedId = {
  id: string;
  count: number;
};

type RunningStyleOverview = {
  style: string;
  count: number;
  outfits: CountedId[];
  skills: CountedId[];
  supportCards: CountedId[];
  averageStats: Record<string, number>;
};

const RUNNING_STYLE_TABS = [
  { key: "Oonige", name: "Runaway" },
  { key: "Nige", name: "Front" },
  { key: "Senkou", name: "Pace" },
  { key: "Sasi", name: "Late" },
  { key: "Oikomi", name: "End" },
] as const;

function getCanonicalStyleKey(style: string): string {
  if (style === "Sashi") return "Sasi";
  return style;
}

function ExpandableList({
  className,
  popupClassName,
  label,
  title,
  titleId,
  headingLevel,
  previewLimit = 6,
  titleAdornment,
  emptyMessage,
  children,
}: {
  className: string;
  popupClassName?: string;
  label: string;
  title: string;
  titleId: string;
  headingLevel: "h3" | "h4";
  previewLimit?: number;
  titleAdornment?: ReactNode;
  emptyMessage?: string;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const items = Children.toArray(children);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const Heading = headingLevel;

  useEffect(() => {
    if (!expanded) return;

    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      trigger?.focus();
    };
  }, [expanded]);

  return (
    <>
      <div className="overview-list-heading">
        <Heading id={titleId}>{title}</Heading>
        {titleAdornment}
        {items.length > previewLimit ? (
          <button
            className="overview-expand-button"
            type="button"
            aria-haspopup="dialog"
            aria-expanded={expanded}
            ref={triggerRef}
            onClick={() => setExpanded(true)}
          >
            Expand
          </button>
        ) : null}
      </div>
      {items.length > 0 ? (
        <ul className={className} aria-label={label}>
          {items.slice(0, previewLimit)}
        </ul>
      ) : emptyMessage ? (
        <p>{emptyMessage}</p>
      ) : null}
      {items.length > previewLimit ? (
        expanded ? (
          <div
            className="overview-popup-backdrop"
            onClick={(event) => {
              if (event.target === event.currentTarget) setExpanded(false);
            }}
          >
            <div
              className="overview-popup"
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${titleId}-popup-title`}
              tabIndex={-1}
              onKeyDown={(event) => {
                if (event.key === "Tab") {
                  event.preventDefault();
                  closeRef.current?.focus();
                }
              }}
            >
              <div className="overview-popup__heading">
                <h3 id={`${titleId}-popup-title`}>{title}</h3>
                <button
                  ref={closeRef}
                  className="overview-popup__close"
                  type="button"
                  aria-label="Close"
                  onClick={() => setExpanded(false)}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </div>
              <ul className={popupClassName ?? className} aria-label={`${label} all`}>
                {items}
              </ul>
            </div>
          </div>
        ) : null
      ) : null}
    </>
  );
}

function InfoTooltip({ label, text }: { label: string; text: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span className={`overview-info-tooltip${isOpen ? " is-open" : ""}`}>
      <button
        className="overview-info-tooltip__button"
        type="button"
        aria-label={label}
        aria-describedby={tooltipId}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((previous) => !previous)}
        onBlur={() => setIsOpen(false)}
      >
        <span aria-hidden="true">i</span>
      </button>
      <span className="overview-info-tooltip__content" id={tooltipId} role="tooltip">
        {text}
      </span>
    </span>
  );
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function getId(value: unknown): string | undefined {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  const record = asRecord(value);
  const id = record?.outfitId ?? record?.outfit_id ?? record?.id;
  return typeof id === "string" || typeof id === "number"
    ? String(id)
    : undefined;
}

function getCount(value: unknown): number {
  const record = asRecord(value);
  const count = record?.count ?? record?.instances;
  return typeof count === "number" && Number.isFinite(count) && count >= 0
    ? Math.floor(count)
    : 1;
}

function normalizeCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 1;
}

function sortCountedIds(items: CountedId[]): CountedId[] {
  return [...items].sort((left, right) =>
    right.count - left.count || left.id.localeCompare(right.id, undefined, { numeric: true }),
  );
}

function getCountedIds(value: unknown): CountedId[] {
  const record = asRecord(value);
  if (!record) return [];
  return sortCountedIds(Object.entries(record).map(([id, count]) => ({
    id,
    count: normalizeCount(count),
  })));
}

function getAverageStats(value: unknown): Record<string, number> {
  const record = asRecord(value);
  if (!record) return {};
  return Object.fromEntries(
    Object.entries(record).filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === "number" && Number.isFinite(entry[1]),
    ),
  );
}

function getRunningStyles(value: unknown): RunningStyleOverview[] {
  const record = asRecord(value);
  return Array.isArray(record?.runningStyles)
    ? record.runningStyles.flatMap((entry) => {
        const styleRecord = asRecord(entry);
        if (typeof styleRecord?.style !== "string") return [];
        return [{
          style: styleRecord.style,
          count: normalizeCount(styleRecord.count),
          outfits: getCountedIds(styleRecord.outfits),
          skills: getCountedIds(styleRecord.skills),
          supportCards: getCountedIds(styleRecord.supportCards),
          averageStats: getAverageStats(styleRecord.averageStats),
        }];
      })
    : [];
}

function getStyleCountedSupportCards(styles: RunningStyleOverview[]): CountedId[] {
  const counts = new Map<string, number>();
  for (const style of styles) {
    for (const card of style.supportCards) {
      counts.set(
        card.id,
        (counts.get(card.id) ?? 0) + Math.min(card.count, style.count),
      );
    }
  }
  return [...counts].map(([id, count]) => ({ id, count }));
}

function getTeamIds(value: unknown): string[] {
  const record = asRecord(value);
  const members = Array.isArray(value)
    ? value
    : Array.isArray(record?.outfits)
      ? record.outfits
      : Array.isArray(record?.umas)
        ? record.umas
        : record
          ? [record.uma1, record.uma2, record.uma3]
          : [];

  return members.flatMap((member) => {
    const id = getId(member);
    return id ? [id] : [];
  });
}

function getOverviewRows(data: unknown): {
  outfits: CountedOutfit[];
  teams: CountedTeam[];
} {
  const record = asRecord(data);
  const rawTeams = Array.isArray(record?.teams)
    ? record.teams
    : Array.isArray(record?.teamSetups)
      ? record.teamSetups
      : [];

  const teamCounts = new Map<string, CountedTeam>();
  const outfitCounts = new Map<string, number>();

  for (const team of rawTeams) {
    const ids = getTeamIds(team);
    if (ids.length === 0) continue;

    const count = getCount(team);
    const key = JSON.stringify([...ids].sort());
    const existing = teamCounts.get(key);
    teamCounts.set(key, {
      members: ids.map((id) => ({ id, label: id })),
      count: (existing?.count ?? 0) + count,
    });

    for (const id of ids) {
      outfitCounts.set(id, (outfitCounts.get(id) ?? 0) + count);
    }
  }

  const rawOutfits = record?.outfits;
  if (Array.isArray(rawOutfits) && rawOutfits.length > 0) {
    outfitCounts.clear();
    for (const outfit of rawOutfits) {
      const id = getId(outfit);
      if (!id) continue;
      outfitCounts.set(id, (outfitCounts.get(id) ?? 0) + getCount(outfit));
    }
  } else if (asRecord(rawOutfits)) {
    outfitCounts.clear();
    for (const [id, count] of Object.entries(asRecord(rawOutfits) ?? {})) {
      outfitCounts.set(id, normalizeCount(count));
    }
  }

  let teams = [...teamCounts.values()].sort((a, b) => b.count - a.count);
  const styleCombinations = asRecord(record?.runningStyleCombinations);
  if (teams.length === 0 && styleCombinations) {
    teams = Object.entries(styleCombinations).map(([combination, count]) => ({
      members: combination
        .split(",")
        .map((label) => label.trim())
        .filter(Boolean)
        .map((label) => ({ label })),
      count: normalizeCount(count),
    })).sort((a, b) => b.count - a.count);
  }

  return {
    outfits: [...outfitCounts].map(([id, count]) => ({ id, count })),
    teams,
  };
}

function formatCount(count: number): string {
  return count.toLocaleString();
}

function formatBuildCount(count: number): string {
  return `${formatCount(count)} ${count === 1 ? "build" : "builds"} taken into account`;
}

function formatPercent(count: number, total: number): string {
  if (total <= 0) return "0%";
  return `${((count / total) * 100).toLocaleString(undefined, {
    maximumFractionDigits: 1,
  })}%`;
}

export default function Overview({
  selectedEvent,
  data,
  umaList,
  skillList,
  supportCardList,
  isLoading,
  error,
}: OverviewProps) {
  const [selectedStyle, setSelectedStyle] = useState<string>("Oonige");
  const { outfits, teams } = getOverviewRows(data);
  const dataRecord = asRecord(data);
  const runningStyles = getRunningStyles(data);
  const selectedRunningStyle = runningStyles.find(
    (style) => getCanonicalStyleKey(style.style) === selectedStyle,
  ) ?? {
    style: selectedStyle,
    count: 0,
    outfits: [],
    skills: [],
    supportCards: [],
    averageStats: {},
  };
  const selectedAverageStats = statFields.flatMap((stat) => {
    const value = selectedRunningStyle.averageStats[stat];
    return typeof value === "number"
      ? [{ stat, value: Math.round(value) }]
      : [];
  });
  const totalRunningBuilds = runningStyles.reduce(
    (total, style) => total + style.count,
    0,
  );
  const supportCardCounts = (
    runningStyles.length > 0
      ? getStyleCountedSupportCards(runningStyles)
      : getCountedIds(dataRecord?.supportCards)
  ).sort((left, right) =>
    right.count - left.count || left.id.localeCompare(right.id, undefined, { numeric: true }),
  );
  const overallSkillCounts = getCountedIds(dataRecord?.skills);
  const userCount = typeof dataRecord?.userCount === "number" &&
      Number.isFinite(dataRecord.userCount) && dataRecord.userCount >= 0
    ? dataRecord.userCount
    : undefined;
  const hasSupportedData = Array.isArray(dataRecord?.outfits) ||
    asRecord(dataRecord?.outfits) !== undefined ||
    Array.isArray(dataRecord?.teams) ||
    Array.isArray(dataRecord?.teamSetups) ||
    Array.isArray(dataRecord?.runningStyles) ||
    asRecord(dataRecord?.runningStyleCombinations) !== undefined;
  const sortedOutfits = outfits.sort((a, b) => {
    const countDifference = b.count - a.count;
    if (countDifference !== 0) return countDifference;
    const aUma = umaList.find((uma) => String(uma.id) === a.id);
    const bUma = umaList.find((uma) => String(uma.id) === b.id);
    return (aUma?.outfitTitle ?? a.id).localeCompare(bUma?.outfitTitle ?? b.id);
  });

  return (
    <section className="overview-page">
      {/* <h1>Overview</h1> */}
      {!selectedEvent ? (
        <p>Select an event to view its overview.</p>
      ) : (
        <>
          {/* <h2>{selectedEvent}</h2> */}
          {/* {isLoading && <p role="status">Loading overview data...</p>} */}
          {error && <p role="alert">Unable to fully load overview data: {error}</p>}
          {!isLoading && data !== undefined && !hasSupportedData && (
            <p role="alert">Overview data must include outfits or team setups.</p>
          )}
          {userCount !== undefined || totalRunningBuilds > 0 ? (
            <p className="overview-build-summary">
              {userCount !== undefined
                ? `${formatCount(userCount)} ${userCount === 1 ? "user" : "users"}`
                : null}
              {userCount !== undefined && totalRunningBuilds > 0 ? " · " : null}
              {totalRunningBuilds > 0
                ? formatBuildCount(totalRunningBuilds)
                : null}
            </p>
          ) : null}
          <div className="overview-columns">
            <section className="overview-panel" aria-labelledby="overview-outfits">
              <ExpandableList
                className="overview-outfit-list"
                label="Outfits"
                title="Outfits"
                titleId="overview-outfits"
                headingLevel="h3"
                emptyMessage={!isLoading ? "No outfit data available." : undefined}
              >
                {sortedOutfits.map(({ id, count }) => {
                  const uma = umaList.find((entry) => String(entry.id) === id);
                  return (
                    <li className="overview-outfit" key={id}>
                      {uma ? (
                        <UmaImage
                          uma={uma}
                          className="overview-outfit__image"
                          alt=""
                          lazy
                        />
                      ) : (
                        <span className="overview-outfit__image overview-outfit__placeholder" />
                      )}
                      <span className="overview-outfit__details">
                        <strong>{uma?.outfitTitle ?? `Outfit ${id}`}</strong>
                        <small>{uma?.baseCharacterName ?? "Unknown character"}</small>
                      </span>
                      <span
                        className="overview-count"
                        aria-label={`${formatCount(count)} uses`}
                        title={`${formatCount(count)} uses`}
                      >
                        {formatCount(count)}
                      </span>
                    </li>
                  );
                })}
              </ExpandableList>
            </section>

            <section className="overview-panel" aria-labelledby="overview-teams">
              <h3 id="overview-teams">Team setups</h3>
              {teams.length > 0 ? (
                <ol className="overview-team-list">
                  {teams.map(({ members, count }) => (
                    <li
                      className="overview-team"
                      key={JSON.stringify(members.map((member) => member.id ?? member.label).sort())}
                    >
                      <div className="overview-team__members">
                        {members.map((member, index) => {
                          const uma = member.id
                            ? umaList.find((entry) => String(entry.id) === member.id)
                            : undefined;
                          const styleIcon = member.id
                            ? undefined
                            : strategyIcons[member.label];
                          return (
                            <span className="overview-team__member" key={`${member.id ?? member.label}-${index}`}>
                              {uma ? (
                                <UmaImage uma={uma} alt="" lazy />
                              ) : member.id ? (
                                <span className="overview-team__placeholder" />
                              ) : styleIcon ? (
                                <img
                                  src={`/icons/style/${styleIcon}.webp`}
                                  alt={member.label}
                                  title={member.label}
                                />
                              ) : null}
                              {member.id && (
                                <span>
                                <strong>{uma?.outfitTitle ?? (member.id ? `Outfit ${member.id}` : member.label)}</strong>
                                <small>{uma?.baseCharacterName ?? (member.id ? "Unknown character" : "Running style")}</small>
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                      <span
                        className="overview-count"
                        aria-label={`${formatCount(count)} uses`}
                        title={`${formatCount(count)} uses`}
                      >
                        {formatCount(count)}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                !isLoading && <p>No team setup data available.</p>
              )}
            </section>
          </div>

          <div className="overview-global-usage-columns">
            <section className="overview-panel" aria-labelledby="overview-support-cards">
              <ExpandableList
                className="overview-style-list"
                popupClassName="overview-support-card-list"
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
                {overallSkillCounts.map(({ id, count }) => {
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

          <section className="overview-panel overview-style-panel" aria-labelledby="overview-style-stats">
            <div className="overview-style-panel__heading">
              <h3 id="overview-style-stats">Style-specific stats</h3>
              <p className="overview-style-build-count">
                {formatBuildCount(selectedRunningStyle.count)}
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
                    onClick={() => setSelectedStyle(key)}
                  >
                    {styleIcon ? (
                      <img src={`/icons/style/${styleIcon}.webp`} alt="" />
                    ) : null}
                    <span className="overview-style-button__label">{name}</span>
                  </button>
                );
              })}
            </div>
            <>
                  <section
                    className="overview-style-section overview-style-average-stats"
                    aria-labelledby="style-average-stats-heading"
                  >
                    <h4 id="style-average-stats-heading">Average stats</h4>
                    {selectedAverageStats.length > 0 ? (
                      <ul className="overview-average-stats__list">
                        {selectedAverageStats.map(({ stat, value }) => {
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
                        {selectedRunningStyle.outfits.map(({ id, count }) => {
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
                        {selectedRunningStyle.skills.map(({ id, count }) => {
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
                              <strong>{formatPercent(count, selectedRunningStyle.count)}</strong>
                            </li>
                          );
                        })}
                      </ExpandableList>
                    </section>
                    <section className="overview-style-section overview-style-section--support-cards" aria-labelledby="style-support-cards-heading">
                      <ExpandableList
                        className="overview-style-list"
                        popupClassName="overview-support-card-list"
                        label="Style support cards"
                        title="Support cards"
                        titleId="style-support-cards-heading"
                        headingLevel="h4"
                        previewLimit={4}
                        emptyMessage="No support card data available."
                      >
                        {selectedRunningStyle.supportCards.map(({ id, count }) => {
                          const cardId = Number(id);
                          const buildsWithCard = Math.min(count, selectedRunningStyle.count);
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
                              <strong>{formatPercent(buildsWithCard, selectedRunningStyle.count)}</strong>
                            </li>
                          );
                        })}
                      </ExpandableList>
                    </section>
                  </div>
            </>
          </section>
        </>
      )}
    </section>
  );
}
