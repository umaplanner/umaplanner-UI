import Select from "react-select";
import type { UmaEntry } from "../types/UmaEntry";

interface UmaSelectProps {
  teamNumber: number;
  umaList: UmaEntry[];
  value: UmaEntry | null;
  onChange: (selected: UmaEntry | null) => void;
  className?: string
}

export default function UmaSelect({
  teamNumber,
  umaList,
  value,
  onChange,
  className,
}: UmaSelectProps) {
  return (
    <label className={`uma-select-item ${className || ''}`}>
      Uma {teamNumber}:
      <Select<UmaEntry>
        name={`uma${teamNumber}`}
        options={umaList}
        getOptionLabel={(uma) => uma.name}
        getOptionValue={(uma) => String(uma.id)}
        value={value}
        onChange={onChange}
        placeholder="Select an Uma"
        isSearchable
      />
    </label>
  );
}
