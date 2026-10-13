import type { ResultImageBuild } from "../ResultsImage";
import UmaImage from "../../../components/UmaImage";

interface Props {
  build: ResultImageBuild;
  className?: string;
}

export default function ResultImageBuild({ build, className = "" }: Props) {
  return (
    <div className={`result-image__portrait ${className}`}>
      {build.uma ? (
        <UmaImage uma={build.uma} alt={build.uma.outfitTitle} />
      ) : (
        <span aria-hidden="true">U{build.slot}</span>
      )}
    </div>
  );
}
