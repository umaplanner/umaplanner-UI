import type { StoredUmaBuild } from "../../../types/UmaBuild";
import type { UmaEntry } from "../../../types/UmaEntry";
import type { SkillEntry } from "../../../types/SkillEntry";
import BuildCard from "./BuildCard";
import EditableBuildName from "./EditableBuildName";

interface Props {
  build: StoredUmaBuild;
  uma?: UmaEntry;
  skillList: SkillEntry[];
  createdTime: Date | null;
  onDelete: () => void;
  onRename: (name: string) => Promise<string | null>;
}

export default function SavedBuildCard({
  build,
  uma,
  skillList,
  createdTime,
  onDelete,
  onRename,
}: Props) {
  return (
    <BuildCard
      build={build}
      uma={uma}
      skillList={skillList}
      title={(
        <EditableBuildName
          name={build.name}
          displayName={build.name || "Unnamed build"}
          onRename={onRename}
        />
      )}
      subtitleLines={uma ? [uma.outfitTitle, uma.baseCharacterName] : []}
      createdTime={createdTime}
      headerAction={(
        <button
          className="build-card__delete"
          type="button"
          aria-label={`Delete ${build.name || "Unnamed build"}`}
          onClick={onDelete}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3" />
          </svg>
        </button>
      )}
    />
  );
}
