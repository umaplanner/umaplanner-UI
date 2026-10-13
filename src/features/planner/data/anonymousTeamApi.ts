import { config } from "../../../lib/config";
import type { StoredUmaBuild } from "../../../types/UmaBuild";
import type { EventTeam } from "../domain/types";

const ANONYMOUS_ID_STORAGE_KEY = "umaplanner:anonymous-contributor-id";

type AnonymousBuild = {
  id: string;
  "build-type"?: "standard" | "plan";
  outfitId: string;
  strategy: string;
  speed: number;
  stamina: number;
  power: number;
  guts: number;
  wisdom: number;
  skills: string[];
  supportCards: Array<{
    position: number;
    supportCardId: number;
    limitBreakCount: number;
  }>;
};

function getAnonymousId(): string {
  const storedId = localStorage.getItem(ANONYMOUS_ID_STORAGE_KEY);
  if (storedId) return storedId;

  const anonymousId = crypto.randomUUID();
  localStorage.setItem(ANONYMOUS_ID_STORAGE_KEY, anonymousId);
  return anonymousId;
}

function toAnonymousBuild(build: StoredUmaBuild): AnonymousBuild {
  return {
    id: build.id,
    "build-type": build["build-type"] ?? "standard",
    outfitId: build.outfitId,
    strategy: build.strategy,
    speed: build.speed,
    stamina: build.stamina,
    power: build.power,
    guts: build.guts,
    wisdom: build.wisdom,
    skills: build.skills,
    supportCards: (build.supportCards ?? []).map((card) => ({
      position: card.position,
      supportCardId: card.support_card_id,
      limitBreakCount: card.limit_break_count,
    })),
  };
}

export async function postAnonymousTeam(
  team: EventTeam,
  builds: StoredUmaBuild[],
): Promise<void> {
  if (!config.apiBaseUrl) {
    throw new Error("VITE_API_BASE_URL is not configured");
  }

  const url = `${config.apiBaseUrl}/anonymous/teams`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      anonymousId: getAnonymousId(),
      event: team.event,
      team: {
        uma1: team.uma1,
        uma2: team.uma2,
        uma3: team.uma3,
        lastUpdate: team.lastUpdate,
      },
      builds: builds.map(toAnonymousBuild),
    }),
  });
  if (!response.ok) {
    throw new Error(
      `Failed to save anonymous team (${response.status}) at ${url}: ${await response.text()}`,
    );
  }
}
