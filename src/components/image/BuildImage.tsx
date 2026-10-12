import { forwardRef } from "react";
import type { StoredUmaBuild } from "../../types/UmaBuild";
import type { SkillEntry } from "../../types/SkillEntry";
import type { UmaEntry } from "../../types/UmaEntry";
import UmaBuildTeam from "../UmaBuild/team/Team";
import BrandedImage from "./BrandedImage";

export interface BuildImageEntry {
  slot: 1 | 2 | 3;
  build: StoredUmaBuild | null;
}

interface Props {
  event: string;
  builds: BuildImageEntry[];
  umaList: UmaEntry[];
  skillList: SkillEntry[];
  showSupportCards?: boolean;
}

const BuildImage = forwardRef<HTMLElement, Props>(
  function BuildImage({
    event,
    builds,
    umaList,
    skillList,
    showSupportCards = true,
  }, ref) {
    const buildColumns = Math.max(1, Math.min(3, builds.length));
    const imageWidth = Math.ceil(
      68 + buildColumns * 360 + (buildColumns - 1) * 6.4,
    );
    const isSingleBuild = builds.length === 1;

    return (
      <BrandedImage
        ref={ref}
        event={event}
        width={imageWidth}
        className={`result-image--team${isSingleBuild ? " result-image--single-build" : ""}`}
      >
        <section
          className={`result-image__team${isSingleBuild ? " result-image__team--single" : ""}`}
          aria-label={isSingleBuild ? "Build" : "Team builds"}
          style={{ gridTemplateColumns: `repeat(${buildColumns}, minmax(0, 1fr))` }}
        >
          {builds.map((build) => (
            <UmaBuildTeam
              key={build.slot}
              teamNumber={build.slot}
              build={build.build}
              availableBuilds={[]}
              umaList={umaList}
              skillList={skillList}
              showSupportCards={showSupportCards}
              compactText
              showCopyButton={false}
              showSwapButton={false}
              onSelectBuild={() => {}}
            />
          ))}
        </section>
      </BrandedImage>
    );
  },
);

export default BuildImage;
