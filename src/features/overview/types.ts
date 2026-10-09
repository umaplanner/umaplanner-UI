import type { SkillEntry } from "../../types/SkillEntry";
import type { UmaEntry } from "../../types/UmaEntry";
import type { SupportCardEntry } from "../../types/UmaBuild";

export type OverviewProps = {
  selectedEvent: string;
  data: unknown;
  umaList: UmaEntry[];
  skillList: SkillEntry[];
  supportCardList: SupportCardEntry[];
  isLoading: boolean;
  error?: string;
  onRefresh: () => void;
};

export type CountedOutfit = {
  id: string;
  count: number;
};

export type CountedTeam = {
  members: Array<{ id?: string; label: string }>;
  count: number;
};

export type CountedId = {
  id: string;
  count: number;
};

export type RunningStyleOverview = {
  style: string;
  count: number;
  outfits: CountedId[];
  skills: CountedId[];
  supportCards: CountedId[];
  averageStats: Record<string, number>;
};
