import { useEffect, useState } from "react";
import { useEvent } from "../contexts/EventContext";
import Overview from "../features/overview/Overview";
import {
  ensureDataLoaded,
  fetchAndCacheOverview,
  getCachedOverview,
} from "../lib/data";
import { normalizeSkillData } from "../features/planner/skillData";
import { normalizeSupportCardList } from "../features/planner/supportCardData";
import type { SkillEntry } from "../types/SkillEntry";
import type { UmaEntry } from "../types/UmaEntry";
import type { SupportCardEntry } from "../types/UmaBuild";

export default function OverviewPage() {
  const { selectedEvent } = useEvent();
  const [data, setData] = useState<unknown>();
  const [umaList, setUmaList] = useState<UmaEntry[]>([]);
  const [skillList, setSkillList] = useState<SkillEntry[]>([]);
  const [supportCardList, setSupportCardList] = useState<SupportCardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!selectedEvent) {
      setData(undefined);
      setUmaList([]);
      setSkillList([]);
      setSupportCardList([]);
      setIsLoading(false);
      setError(undefined);
      return;
    }

    let cancelled = false;
    setData(undefined);
    setUmaList([]);
    setSkillList([]);
    setSupportCardList([]);

    async function loadOverview() {
      setError(undefined);
      setIsLoading(true);
      const errors: string[] = [];

      try {
        const cachedData = await getCachedOverview(selectedEvent);
        if (!cancelled) {
          setData(cachedData);
        }
      } catch (loadError) {
        errors.push(
          loadError instanceof Error
            ? loadError.message
            : "Unable to read cached overview data",
        );
      }

      const [overviewResult, datasetsResult] = await Promise.allSettled([
        fetchAndCacheOverview(selectedEvent),
        ensureDataLoaded(),
      ]);

      if (cancelled) {
        return;
      }

      if (overviewResult.status === "fulfilled") {
        setData(overviewResult.value);
      } else {
        errors.push(
          overviewResult.reason instanceof Error
            ? overviewResult.reason.message
            : "Unable to load overview data",
        );
      }

      if (datasetsResult.status === "fulfilled") {
        const outfits = datasetsResult.value.outfits;
        const skills = datasetsResult.value.skills;
        setUmaList(Array.isArray(outfits) ? outfits as UmaEntry[] : []);
        setSkillList(normalizeSkillData(skills));
        setSupportCardList(normalizeSupportCardList(datasetsResult.value));
      } else {
        errors.push(
          datasetsResult.reason instanceof Error
            ? datasetsResult.reason.message
            : "Unable to load outfit data",
        );
      }

      if (errors.length > 0) {
        setError(errors.join(" "));
      }
      setIsLoading(false);
    }

    void loadOverview().catch((loadError: unknown) => {
      if (!cancelled) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load overview data",
        );
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedEvent]);

  return (
    <Overview
      selectedEvent={selectedEvent}
      data={data}
      umaList={umaList}
      skillList={skillList}
      supportCardList={supportCardList}
      isLoading={isLoading}
      error={error}
    />
  );
}
