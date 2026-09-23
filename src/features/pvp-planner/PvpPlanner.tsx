import { useEvent } from "../../contexts/PvpEventContext";
import UmaBuild from "../../components/UmaBuild";
import UmaSelect from "../../components/UmaSelect";
import RaceDisplay from "../../components/RaceDisplay";
import "../../styles/PvpPlanner.css";
import { usePvpPlannerData } from "./usePvpPlannerData";
import { usePvpTeam } from "./usePvpTeam";
import PvpTeamTabs from "./PvpTeamTabs";
import type { UmaKey } from "./pvpPlannerTypes";

export default function PvpPlanner() {
  const { selectedEvent } = useEvent();
  const { raceEntry, umaList, skillList } = usePvpPlannerData(selectedEvent);
  const {
    umas,
    activeBuild,
    setActiveBuild,
    selectUma,
    updateBuild,
  } = usePvpTeam(selectedEvent, skillList, umaList);
  const selectedUmaId = umas[`uma${activeBuild}`];
  const selectedUma = selectedUmaId === null
    ? null
    : umaList.find((uma) => uma.id === selectedUmaId) ?? null;

  return (
    <div className="planner">
      <RaceDisplay raceEntry={raceEntry} />
      <PvpTeamTabs
        umas={umas}
        umaList={umaList}
        activeBuild={activeBuild}
        onSelect={setActiveBuild}
      />
      <section className="uma-build-area" aria-label="Build selected Uma">
        <UmaBuild
          teamNumber={activeBuild}
          value={umas[`uma${activeBuild}Build`]}
          skillList={skillList}
          uniqueSkillId={selectedUma?.uniqueSkillId}
          selector={
            <UmaSelect
              teamNumber={activeBuild}
              umaList={umaList}
              value={selectedUma}
              onChange={(uma) => {
                void selectUma(`uma${activeBuild}` as UmaKey, uma);
              }}
            />
          }
          onChange={(build) => {
            void updateBuild(`uma${activeBuild}Build`, build);
          }}
        />
      </section>
    </div>
  );
}
