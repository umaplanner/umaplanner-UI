import Select, { type StylesConfig } from "react-select";
import type { UmaEntry } from "../types/UmaEntry";

interface UmaSelectProps {
  teamNumber: number;
  umaList: UmaEntry[];
  value: UmaEntry | null;
  onChange: (selected: UmaEntry | null) => void;
  className?: string;
}

const umaSelectStyles: StylesConfig<UmaEntry, false> = {
  control: (base, state) => ({
    ...base,
    backgroundColor: "#f0f0f0",
    borderColor: "#007bff",
    borderRadius: "4px",
    minHeight: "38px",
    boxShadow: state.isFocused ? "0 0 0 1px #007bff" : "none",

    "&:hover": {
      borderColor: "#007bff",
    },
  }),

  option: (base, state) => ({
    ...base,
    color: "#000000",
    backgroundColor: state.isSelected
      ? "#007bff"
      : state.isFocused
        ? "#e6f7ff"
        : "#ffffff",

    cursor: "pointer",

    "&:active": {
      backgroundColor: "#007bff",
    },
  }),

  singleValue: (base) => ({
    ...base,
    color: "#000000",
  }),

  placeholder: (base) => ({
    ...base,
    color: "#555555",
  }),

  input: (base) => ({
    ...base,
    color: "#000000",
  }),

  menu: (base) => ({
    ...base,
    zIndex: 10,
  }),
};

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
        getOptionValue={(uma) => uma.id}
        value={value}
        onChange={onChange}
        placeholder="Select an Uma"
        isSearchable
        classNamePrefix="uma-select"
        styles={umaSelectStyles}
      />
    </label>
  );
}
