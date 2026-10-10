import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { useEvent } from "../contexts/EventContext";
import { config } from "../lib/config";
import { isAdminUser } from "../lib/userAccess";
import "../styles/Admin.css";

type EndpointData = {
  data: unknown;
  error: string | null;
  loading: boolean;
  received: boolean;
};

type MaxDaysResponse = {
  maxDays: number;
  earliestDate?: string;
  latestDate?: string;
};

const compareDayOptions = [
  { days: 1, label: "Last 1 day" },
  { days: 3, label: "Last 3 days" },
  { days: 7, label: "Last 7 days" },
  { days: 14, label: "Last 14 days" },
  { days: 30, label: "Last 1 month" },
  { days: 90, label: "Last 3 months" },
  { days: 180, label: "Last 6 months" },
  { days: 365, label: "Last 1 year" },
  { days: 1095, label: "Last 3 years" },
];

const initialEndpointData: EndpointData = {
  data: [],
  error: null,
  loading: true,
  received: false,
};

async function fetchAdminData(path: string): Promise<unknown> {
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    credentials: "include",
  });
  const body = await response.text();
  if (!response.ok) {
    const details = getResponseMessage(body);
    throw new Error(
      details
        ? `Request failed with status ${response.status}: ${details}`
        : `Request failed with status ${response.status}`,
    );
  }
  if (!body) {
    return null;
  }
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return body;
  }
}

function getResponseMessage(body: string) {
  if (!body.trim()) return "";
  try {
    const payload: unknown = JSON.parse(body);
    if (typeof payload === "string") return payload;
    if (payload && typeof payload === "object") {
      for (const key of ["detail", "message", "title"]) {
        const value = Reflect.get(payload, key);
        if (typeof value === "string") return value;
      }
    }
  } catch {
    return body.trim();
  }
  return body.trim();
}

function parseMaxDays(value: unknown): MaxDaysResponse {
  if (!value || typeof value !== "object" || !("maxDays" in value)) {
    throw new Error("The max-days response did not include maxDays.");
  }
  const { maxDays, earliestDate, latestDate } = value as {
    maxDays: unknown;
    earliestDate?: unknown;
    latestDate?: unknown;
  };
  if (typeof maxDays !== "number" || !Number.isFinite(maxDays) || maxDays < 0) {
    throw new Error("The max-days response included an invalid maxDays value.");
  }
  return {
    maxDays: Math.floor(maxDays),
    ...(typeof earliestDate === "string" ? { earliestDate } : {}),
    ...(typeof latestDate === "string" ? { latestDate } : {}),
  };
}

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const { selectedEvent } = useEvent();
  const [stats, setStats] = useState(initialEndpointData);
  const [eventStats, setEventStats] = useState(initialEndpointData);
  const [maxDays, setMaxDays] = useState<MaxDaysResponse | null>(null);
  const [maxDaysError, setMaxDaysError] = useState<string | null>(null);
  const [compareDays, setCompareDays] = useState(3);

  const isAdmin = isAdminUser(user);
  const availableCompareOptions = maxDays
    ? compareDayOptions.filter(({ days }) => days <= maxDays.maxDays)
    : [];
  const selectedCompareDays = maxDays
    ? availableCompareOptions.find(({ days }) => days === compareDays)?.days ??
      availableCompareOptions.filter(({ days }) => days <= compareDays).at(-1)?.days ??
      availableCompareOptions[0]?.days ??
      1
    : compareDays;

  useEffect(() => {
    if (!isAdmin) return;

    let cancelled = false;
    const loadMaxDays = async () => {
      try {
        const result = parseMaxDays(await fetchAdminData("/admin/stats/max-days"));
        if (!cancelled) {
          setMaxDays(result);
          setMaxDaysError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setMaxDaysError(error instanceof Error ? error.message : String(error));
        }
      }
    };

    void loadMaxDays();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;

    let cancelled = false;
    setStats({ data: [], error: null, loading: true, received: false });
    const loadStats = async () => {
      try {
        const payload = await fetchAdminData(`/admin/stats?compareTo=${selectedCompareDays}`);
        if (!cancelled) {
          setStats({
            data: payload,
            error: null,
            loading: false,
            received: true,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setStats({
            data: [],
            error: error instanceof Error ? error.message : String(error),
            loading: false,
            received: false,
          });
        }
      }
    };

    void loadStats();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, selectedCompareDays]);

  useEffect(() => {
    if (!isAdmin) return;
    if (!selectedEvent) {
      setEventStats({ data: null, error: null, loading: false, received: false });
      return;
    }

    let cancelled = false;
    setEventStats({ data: [], error: null, loading: true, received: false });
    const loadEventStats = async () => {
      try {
        const payload = await fetchAdminData(
          `/admin/stats/events?event=${encodeURIComponent(selectedEvent)}&compareTo=${selectedCompareDays}`,
        );
        if (!cancelled) {
          setEventStats({
            data: payload,
            error: null,
            loading: false,
            received: true,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setEventStats({
            data: [],
            error: error instanceof Error ? error.message : String(error),
            loading: false,
            received: false,
          });
        }
      }
    };

    void loadEventStats();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, selectedEvent, selectedCompareDays]);

  if (isLoading) {
    return <p>Loading admin access...</p>;
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="admin-page">
      <h1>Admin</h1>
      <section className="admin-panel" aria-labelledby="admin-overall-stats-heading">
        <div className="admin-panel-header">
          <div className="admin-period-info">
            {maxDaysError ? (
              <p className="admin-error" role="alert">{maxDaysError}</p>
            ) : maxDays?.earliestDate && maxDays.latestDate ? (
              <p className="admin-period" role="status">
                Data available from <time>{maxDays.earliestDate}</time> to{" "}
                <time>{maxDays.latestDate}</time> ({maxDays.maxDays}{" "}
                {maxDays.maxDays === 1 ? "day" : "days"}).
              </p>
            ) : null}
          </div>
          <PeriodControls
            options={availableCompareOptions}
            selectedDays={selectedCompareDays}
            onSelect={setCompareDays}
          />
        </div>
        <div className="admin-stat-sections">
          <section
            className="admin-stat-section"
            aria-labelledby="admin-overall-stats-heading"
          >
            <h3 id="admin-overall-stats-heading">Overall daily counts</h3>
            <EndpointResult endpoint={stats} compareDays={selectedCompareDays} />
          </section>
          <section
            className="admin-stat-section"
            aria-labelledby="admin-event-stats-heading"
          >
            <h3 id="admin-event-stats-heading">
              Daily counts for {selectedEvent || "selected event"}
            </h3>
            <EndpointResult
              endpoint={eventStats}
              compareDays={selectedCompareDays}
              selectedEvent={selectedEvent}
            />
          </section>
        </div>
      </section>
    </div>
  );
}

function PeriodControls({
  options,
  selectedDays,
  onSelect,
}: {
  options: typeof compareDayOptions;
  selectedDays: number;
  onSelect: (days: number) => void;
}) {
  return (
    <label className="admin-period-controls" htmlFor="admin-comparison-period">
      <span>Comparison period</span>
      <select
        id="admin-comparison-period"
        value={options.some(({ days }) => days === selectedDays) ? selectedDays : ""}
        disabled={options.length === 0}
        onChange={(event) => onSelect(Number(event.target.value))}
      >
        {options.length === 0 ? (
          <option value="">
            No comparison periods available
          </option>
        ) : (
          options.map(({ days, label }) => (
            <option key={days} value={days}>
              {label}
            </option>
          ))
        )}
      </select>
    </label>
  );
}

function EndpointResult({
  endpoint,
  compareDays,
  selectedEvent,
}: {
  endpoint: EndpointData;
  compareDays: number;
  selectedEvent?: string | null;
}) {
  if (endpoint.loading) {
    return <p>Loading...</p>;
  }
  if (endpoint.error) {
    return <p className="admin-error" role="alert">{endpoint.error}</p>;
  }
  if (!endpoint.received) return <p>No response data.</p>;

  const statsData = getStatsData(endpoint.data, selectedEvent);
  if (statsData) {
    return (
      <DailyStatsDisplay
        dailyCounts={statsData.dailyCounts}
        comparison={statsData.comparison}
        compareDays={compareDays}
      />
    );
  }

  if (endpoint.data && typeof endpoint.data === "object" && !Array.isArray(endpoint.data)) {
    return (
      <dl className="admin-response-fields">
        {Object.entries(endpoint.data).map(([key, value]) => (
          <div className="admin-response-field" key={key}>
            <dt>{key}</dt>
            <dd>{formatResponseValue(value)}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <p className="admin-empty">{String(endpoint.data ?? "No statistics are available.")}</p>
  );
}

type DailyCount = Record<string, unknown>;
type StatsData = {
  dailyCounts: DailyCount[];
  comparison: Record<string, unknown> | null;
};

const statMetrics = [
  { key: "users", label: "Users" },
  { key: "builds", label: "Builds" },
  { key: "teams", label: "Teams" },
] as const;

function getStatsData(data: unknown, selectedEvent?: string | null): StatsData | null {
  if (Array.isArray(data)) {
    return { dailyCounts: asDailyCounts(data), comparison: null };
  }
  if (!data || typeof data !== "object") return null;

  const comparison = getObjectValue(data, "comparison");
  const events = getObjectValue(data, "events");
  if (events) {
    const eventEntries = Object.entries(events).filter(
      ([event]) => !selectedEvent || event === selectedEvent,
    );
    const counts = eventEntries.flatMap(([, value]) =>
      Array.isArray(value) ? asDailyCounts(value) : [],
    );
    return {
      dailyCounts: selectedEvent ? counts : combineCountsByDate(counts),
      comparison,
    };
  }

  for (const key of ["dailyCounts", "daily_counts", "data"]) {
    if (key in data) {
      const nestedCounts = Reflect.get(data, key);
      if (Array.isArray(nestedCounts)) {
        return { dailyCounts: asDailyCounts(nestedCounts), comparison };
      }
    }
  }

  if (statMetrics.some(({ key }) => key in data)) {
    return { dailyCounts: [data as DailyCount], comparison };
  }
  return null;
}

function getObjectValue(value: object, key: string): Record<string, unknown> | null {
  if (!(key in value)) return null;
  const nestedValue: unknown = Reflect.get(value, key);
  return nestedValue && typeof nestedValue === "object" && !Array.isArray(nestedValue)
    ? nestedValue as Record<string, unknown>
    : null;
}

function asDailyCounts(value: unknown[]): DailyCount[] {
  return value.filter(
    (dailyCount): dailyCount is DailyCount =>
      Boolean(dailyCount) && typeof dailyCount === "object" && !Array.isArray(dailyCount),
  );
}

function combineCountsByDate(dailyCounts: DailyCount[]): DailyCount[] {
  const combined = new Map<string, DailyCount>();
  for (const dailyCount of dailyCounts) {
    if (typeof dailyCount.date !== "string") continue;
    const combinedCount = combined.get(dailyCount.date) ?? { date: dailyCount.date };
    for (const { key } of statMetrics) {
      const count = getCount(dailyCount[key]);
      if (count !== null) {
        combinedCount[key] = (getCount(combinedCount[key]) ?? 0) + count;
      }
    }
    combined.set(dailyCount.date, combinedCount);
  }
  return [...combined.values()];
}

function formatResponseValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "Additional details";
}

function DailyStatsDisplay({
  dailyCounts,
  comparison,
  compareDays,
}: {
  dailyCounts: DailyCount[];
  comparison: Record<string, unknown> | null;
  compareDays: number;
}) {
  const countsByDate = new Map(
    dailyCounts.flatMap((dailyCount) => {
      const date = dailyCount.date;
      return typeof date === "string" ? [[date, dailyCount] as const] : [];
    }),
  );

  if (dailyCounts.length === 0) {
    return <p className="admin-empty">No daily counts are available.</p>;
  }

  return (
    <div className="admin-daily-counts">
      {dailyCounts.map((dailyCount, index) => {
        const date = typeof dailyCount.date === "string"
          ? dailyCount.date
          : `Snapshot ${index + 1}`;
        const comparisonDate = getComparisonDate(date, compareDays);
        const comparisonCount = comparisonDate ? countsByDate.get(comparisonDate) : undefined;
        const isLatestCount = index === dailyCounts.length - 1;

        return (
          <article className="admin-daily-card" key={`${date}-${index}`}>
            <h3 className="admin-daily-date">{date}</h3>
            <div className="admin-metric-grid">
              {statMetrics.map(({ key, label }) => {
                const value = getCount(dailyCount[key]);
                const previousValue = getCount(comparisonCount?.[key]);
                const explicitChange = isLatestCount
                  ? getCount(comparison?.[`${key}PercentChange`])
                  : null;

                return (
                  <div className="admin-metric" key={key}>
                    <span className="admin-metric-label">{label}</span>
                    <div className="admin-metric-values">
                      <strong className="admin-metric-count">{value ?? "—"}</strong>
                      {value !== null && explicitChange !== null ? (
                        <PercentageChange change={explicitChange} />
                      ) : value !== null && previousValue !== null &&
                        (previousValue !== 0 || value === 0) ? (
                        <PercentageChange
                          change={previousValue === 0 ? 0 : ((value - previousValue) / previousValue) * 100}
                        />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function getCount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getComparisonDate(date: string, compareDays: number): string | null {
  const parsedDate = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsedDate.getTime())) return null;
  parsedDate.setUTCDate(parsedDate.getUTCDate() - compareDays);
  return parsedDate.toISOString().slice(0, 10);
}

function PercentageChange({ change }: { change: number }) {
  const roundedChange = Number(change.toFixed(2));
  const formattedChange = String(roundedChange);
  const sign = roundedChange > 0 ? "+" : "";
  const tone = roundedChange > 0 ? "positive" : roundedChange < 0 ? "negative" : "neutral";

  return (
    <span className={`admin-change admin-change-${tone}`}>
      {sign}{formattedChange}%
    </span>
  );
}
