import { useEffect, useState } from "react";

export type SkillSort = "rarity" | "game" | "alphabetical";

export type ResultCollapseGroup = "Finals" | "Round 2" | "Round 1";
export type ResultCollapsePreferences = Partial<
  Record<ResultCollapseGroup, boolean>
>;
type ResultCollapsePreferencesByEvent = Record<
  string,
  ResultCollapsePreferences
>;

interface StoredPreferences {
  theme?: string;
  skillPicker?: {
    sort?: SkillSort;
    ascending?: boolean;
  };
  resultsCollapsedGroupsByEvent?: unknown;
}

export interface SkillPickerPreferences {
  sort: SkillSort;
  ascending: boolean;
}

export interface Preferences {
  theme: string;
  skillPicker: SkillPickerPreferences;
  resultsCollapsedGroupsByEvent: ResultCollapsePreferencesByEvent;
}

const defaultPreferences: Preferences = {
  theme: "dark",
  skillPicker: {
    sort: "rarity",
    ascending: false,
  },
  resultsCollapsedGroupsByEvent: {},
};

function isResultCollapseGroup(group: string): group is ResultCollapseGroup {
  return group === "Finals" || group === "Round 2" || group === "Round 1";
}

function normalizeResultsCollapsedGroups(
  value: unknown,
): ResultCollapsePreferencesByEvent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: ResultCollapsePreferencesByEvent = {};
  Object.entries(value).forEach(([event, eventGroups]) => {
    if (!eventGroups || typeof eventGroups !== "object" || Array.isArray(eventGroups)) {
      return;
    }
    const validGroups: ResultCollapsePreferences = {};
    Object.entries(eventGroups).forEach(([group, collapsed]) => {
      if (isResultCollapseGroup(group) && typeof collapsed === "boolean") {
        validGroups[group] = collapsed;
      }
    });
    result[event] = validGroups;
  });
  return result;
}

function readPreferences(): Preferences {
  try {
    const stored = localStorage.getItem("prefs");
    if (!stored) {
      return defaultPreferences;
    }

    const preferences = JSON.parse(stored) as StoredPreferences;
    const skillPicker = preferences.skillPicker;
    return {
      theme: typeof preferences.theme === "string"
        ? preferences.theme
        : defaultPreferences.theme,
      skillPicker: {
        sort: skillPicker?.sort === "rarity" ||
            skillPicker?.sort === "alphabetical" ||
            skillPicker?.sort === "game"
          ? skillPicker.sort
          : defaultPreferences.skillPicker.sort,
        ascending: typeof skillPicker?.ascending === "boolean"
          ? skillPicker.ascending
          : defaultPreferences.skillPicker.ascending,
      },
      resultsCollapsedGroupsByEvent: normalizeResultsCollapsedGroups(
        preferences.resultsCollapsedGroupsByEvent,
      ),
    };
  } catch (error) {
    console.error("Error loading preferences:", error);
    return defaultPreferences;
  }
}

export function useSkillPickerPreferences() {
  const [preferences, setPreferences] = useState(readPreferences);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("prefs");
      const current = stored
        ? JSON.parse(stored) as StoredPreferences
        : {};
      localStorage.setItem("prefs", JSON.stringify({
        ...current,
        theme: preferences.theme,
        skillPicker: {
          ...current.skillPicker,
          sort: preferences.skillPicker.sort,
          ascending: preferences.skillPicker.ascending,
        },
      }));
    } catch (error) {
      console.error("Error saving preferences:", error);
    }
  }, [preferences]);

  return {
    sort: preferences.skillPicker.sort,
    setSort: (sort: SkillSort) =>
      setPreferences((current) => ({
        ...current,
        skillPicker: { ...current.skillPicker, sort },
      })),
    ascending: preferences.skillPicker.ascending,
    setAscending: (ascending: boolean) =>
      setPreferences((current) => ({
        ...current,
        skillPicker: { ...current.skillPicker, ascending },
      })),
  };
}

export function useResultCollapsePreferences(event: string) {
  const [collapsedGroups, setCollapsedGroups] = useState<ResultCollapsePreferences>(
    () => readPreferences().resultsCollapsedGroupsByEvent[event] ?? {},
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem("prefs");
      const current = stored
        ? JSON.parse(stored) as StoredPreferences
        : {};
      const resultsCollapsedGroupsByEvent = normalizeResultsCollapsedGroups(
        current.resultsCollapsedGroupsByEvent,
      );
      localStorage.setItem("prefs", JSON.stringify({
        ...current,
        resultsCollapsedGroupsByEvent: {
          ...resultsCollapsedGroupsByEvent,
          [event]: collapsedGroups,
        },
      }));
    } catch (error) {
      console.error("Error saving Results collapse preferences:", error);
    }
  }, [collapsedGroups, event]);

  return { collapsedGroups, setCollapsedGroups };
}
