import { useRef, useState } from "react";

interface Props {
  name: string;
  displayName?: string;
  onRename: (name: string) => Promise<string | null>;
}

export default function EditableBuildName({
  name,
  displayName = name,
  onRename,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [error, setError] = useState("");
  const savingRef = useRef(false);
  const skipBlurRef = useRef(false);

  async function saveName() {
    const nextName = draftName.trim();
    if (!nextName) {
      setError("Build name cannot be empty.");
      return;
    }
    if (savingRef.current) return;
    if (nextName === name) {
      setIsEditing(false);
      setError("");
      return;
    }

    savingRef.current = true;
    try {
      const saveError = await onRename(nextName);
      if (saveError) {
        setError(saveError);
        return;
      }
      setIsEditing(false);
      setError("");
    } catch (caughtError) {
      console.error("Error renaming saved build:", caughtError);
      setError("Unable to save build name.");
    } finally {
      savingRef.current = false;
    }
  }

  return (
    <>
      {isEditing ? (
        <input
          className="build-card__name-input"
          aria-label={`Build name ${displayName}`}
          value={draftName}
          autoFocus
          onChange={(event) => {
            setDraftName(event.target.value);
            setError("");
          }}
          onBlur={() => {
            if (skipBlurRef.current) {
              skipBlurRef.current = false;
              return;
            }
            void saveName();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void saveName();
            } else if (event.key === "Escape") {
              skipBlurRef.current = true;
              setDraftName(name);
              setIsEditing(false);
              setError("");
            }
          }}
        />
      ) : (
        <button
          className="build-card__name"
          type="button"
          aria-label={`Rename ${displayName || "Unnamed build"}`}
          onClick={() => {
            setDraftName(name);
            setIsEditing(true);
            setError("");
          }}
        >
          {displayName || "Unnamed build"}
        </button>
      )}
      {isEditing && error ? (
        <small className="build-card__name-error" role="alert">{error}</small>
      ) : null}
    </>
  );
}
