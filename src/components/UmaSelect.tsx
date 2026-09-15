import Select from "react-select";
import type { UmaEntry } from "../types/UmaEntry";
import "../styles/UmaSelect.css";

interface UmaSelectProps {
  teamNumber: number;
  umaList: UmaEntry[];
  value: UmaEntry | null;
  onChange: (selected: UmaEntry | null) => void;
  className?: string;
}

export default function UmaSelect({
  teamNumber,
  umaList,
  value,
  onChange,
  className,
}: UmaSelectProps) {
  return (
    <label className={`uma-select-label ${className ?? ""}`.trim()}>
      Uma {teamNumber}:

      <Select<UmaEntry, false>
        name={`uma${teamNumber}`}
        options={umaList}
        getOptionLabel={(uma) => `${uma.outfitTitle} ${uma.baseCharacterName}`}
        getOptionValue={(uma) => String(uma.id)}
        value={value}
        onChange={onChange}
        placeholder="Select an Uma"
        isSearchable
        classNamePrefix="uma-select"
      />
    </label>
  );
}
