import UmaImage from "../../components/UmaImage";
import { strategyIcons } from "../../components/UmaBuild/umaBuildUtils";
import type { UmaEntry } from "../../types/UmaEntry";
import "../../styles/Overview.css";

type OverviewProps = {
  selectedEvent: string;
  data: unknown;
  umaList: UmaEntry[];
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

export default function Overview({
  selectedEvent,
  data,
  umaList,
  isLoading,
  error,
}: OverviewProps) {
  const { outfits, teams } = getOverviewRows(data);
  const dataRecord = asRecord(data);
  const hasSupportedData = Array.isArray(dataRecord?.outfits) ||
    asRecord(dataRecord?.outfits) !== undefined ||
    Array.isArray(dataRecord?.teams) ||
    Array.isArray(dataRecord?.teamSetups) ||
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
      <h1>Overview</h1>
      {!selectedEvent ? (
        <p>Select an event to view its overview.</p>
      ) : (
        <>
          <h2>{selectedEvent}</h2>
          {isLoading && <p role="status">Loading overview data...</p>}
          {error && <p role="alert">Unable to fully load overview data: {error}</p>}
          {!isLoading && data !== undefined && !hasSupportedData && (
            <p role="alert">Overview data must include outfits or team setups.</p>
          )}
          <div className="overview-columns">
            <section className="overview-panel" aria-labelledby="overview-outfits">
              <h3 id="overview-outfits">Outfits</h3>
              {sortedOutfits.length > 0 ? (
                <ul className="overview-outfit-list">
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
                </ul>
              ) : (
                !isLoading && <p>No outfit data available.</p>
              )}
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
        </>
      )}
    </section>
  );
}
