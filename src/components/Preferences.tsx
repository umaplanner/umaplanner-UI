import { useEffect, useState } from "react";

export type SkillSort = "rarity" | "game" | "alphabetical";

interface StoredPreferences {
  theme?: string;
  skillPicker?: {
    sort?: SkillSort;
    ascending?: boolean;
  };
}

export interface SkillPickerPreferences {
  sort: SkillSort;
  ascending: boolean;
}

export interface Preferences {
  theme: string;
  skillPicker: SkillPickerPreferences;
}

const defaultPreferences: Preferences = {
  theme: "dark",
  skillPicker: {
    sort: "rarity",
    ascending: false,
  },
};

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
    };
  } catch {
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
