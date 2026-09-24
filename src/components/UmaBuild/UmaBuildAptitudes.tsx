import type { UmaBuild as UmaBuildData } from "../../types/UmaBuild";
import { aptitudeOptions, aptitudeRankImages, strategyIcons, strategyOptions } from "./umaBuildUtils";

interface Props {
  value: UmaBuildData;
  openAptitude?: string | null;
  openChoice?: string | null;
  onToggleAptitude?: (field: string) => void;
  onToggleStrategy?: () => void;
  onChange?: (field: keyof UmaBuildData, value: string) => void;
}

const aptitudeFields = [
  ["surfaceAptitude", "Surface"],
  ["distanceAptitude", "Distance"],
  ["strategyAptitude", "Style"],
] as const;

export default function UmaBuildAptitudes({ value, openAptitude = null, openChoice = null, onToggleAptitude, onToggleStrategy, onChange }: Props) {
  const editable = Boolean(onChange);
  return (
    <div className="uma-build__aptitudes">
      {aptitudeFields.map(([field, label]) => editable ? (
        <label key={field}>
          <span>{label}</span>
          <span className="uma-build__aptitude-selector">
            <button 
              className="uma-build__aptitude-current" 
              type="button" 
              aria-label={`${label} aptitude ${value[field]}`} 
              aria-expanded={openAptitude === field} 
              onClick={() => onToggleAptitude?.(field)}
            >
              <img src={`/icons/statrank/rank_${String(aptitudeRankImages[value[field]]).padStart(2, "0")}.png`} alt={value[field]} />
            </button>
            {openAptitude === field ? 
              <span 
                className="uma-build__aptitude-options" 
                role="group" 
                aria-label={`${label} aptitude options`}
              >
              {aptitudeOptions.map((aptitude) => 
                <button 
                  className={value[field] === aptitude ? "uma-build__aptitude-option--selected" : undefined} 
                  type="button" 
                  key={aptitude} 
                  aria-label={`${label} aptitude ${aptitude}`} 
                  aria-pressed={value[field] === aptitude} 
                  onClick={() => onChange?.(field, aptitude)}
                >
                  <img 
                    src={`/icons/statrank/rank_${String(aptitudeRankImages[aptitude]).padStart(2, "0")}.png`} 
                    alt={aptitude} 
                  />
                </button>)}
            </span> : null}
          </span>
        </label>
      ) : (
        <div key={field}><span>{label}</span><img src={`/icons/statrank/rank_${String(aptitudeRankImages[value[field]]).padStart(2, "0")}.png`} alt={value[field]} /></div>
      ))}
      {editable ? (
        <label className="uma-build__strategy">
          <span>Strategy</span>
          <span className="uma-build__choice-selector">
            <button 
              className="uma-build__choice-current" 
              type="button" 
              aria-label={`Strategy ${value.strategy}`} 
              aria-expanded={openChoice === "strategy"} 
              onClick={onToggleStrategy}
            >
              {strategyIcons[value.strategy] ? <img src={`/icons/style/${strategyIcons[value.strategy]}.webp`} alt={value.strategy} /> : value.strategy}
            </button>
            {openChoice === "strategy" ? <span className="uma-build__choice-options" role="group" aria-label="Strategy options">
              {strategyOptions.map((strategy) => <button type="button" key={strategy} aria-label={`Strategy ${strategy}`} onClick={() => onChange?.("strategy", strategy)}>
                {strategyIcons[strategy] ? <img src={`/icons/style/${strategyIcons[strategy]}.webp`} alt={strategy} /> : strategy}</button>)}
            </span> : null}
          </span>
        </label>
      ) : <div>
        <span>Strategy</span>
        {strategyIcons[value.strategy] ? <img src={`/icons/style/${strategyIcons[value.strategy]}.webp`} alt={value.strategy} /> : <strong>{value.strategy}</strong>}
        </div>
      }
    </div>
  );
}
