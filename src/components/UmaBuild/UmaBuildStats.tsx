import type { UmaBuild as UmaBuildData } from "../../types/UmaBuild";
import { getStatRank, statFields } from "./umaBuildUtils";

interface Props {
  value: UmaBuildData;
  editable?: boolean;
  onChange?: (field: keyof UmaBuildData, value: number) => void;
}

export default function UmaBuildStats({ value, editable = false, onChange }: Props) {
  return (
    <div className="uma-build__stats">
      {statFields.map((field) => (
        editable ? (
          <label key={field}>
            <span>{field}</span>
            <span className="uma-build__stat-control">
              <img src={`/icons/statrank/rank_${String(getStatRank(value[field])).padStart(2, "0")}.png`} alt={`${field} rank ${getStatRank(value[field])}`} />
              <input type="number" min="0" value={Math.max(0, value[field])} onChange={(event) => onChange?.(field, Math.max(0, Number(event.target.value)))} />
            </span>
          </label>
        ) : (
          <div key={field}>
            <span>{field}</span>
            <span className="uma-build__stat-control">
              <img src={`/icons/statrank/rank_${String(getStatRank(value[field])).padStart(2, "0")}.png`} alt={`${field} rank ${getStatRank(value[field])}`} />
              <strong>{value[field]}</strong>
            </span>
          </div>
        )
      ))}
    </div>
  );
}
