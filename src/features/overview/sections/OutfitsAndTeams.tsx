import UmaImage from "../../../components/UmaImage";
import { strategyIcons } from "../../../components/UmaBuild/utils";
import ExpandableList from "../components/ExpandableList";
import type { CountedOutfit, CountedTeam } from "../types";
import { formatCount } from "../utils";
import type { UmaEntry } from "../../../types/UmaEntry";

type OutfitsAndTeamsProps = {
  outfits: CountedOutfit[];
  teams: CountedTeam[];
  umaList: UmaEntry[];
  isLoading: boolean;
};

export default function OutfitsAndTeams({
  outfits,
  teams,
  umaList,
  isLoading,
}: OutfitsAndTeamsProps) {
  return (
    <div className="overview-columns">
      <section className="overview-panel" aria-labelledby="overview-outfits">
        <ExpandableList
          className="overview-outfit-list"
          label="Outfits"
          title="Outfits"
          titleId="overview-outfits"
          headingLevel="h3"
          previewLimit={5}
          emptyMessage={!isLoading ? "No outfit data available." : undefined}
        >
          {outfits.map(({ id, count }) => {
            const uma = umaList.find((entry) => String(entry.id) === id);
            return (
              <li className="overview-outfit" key={id}>
                {uma ? (
                  <UmaImage
                    uma={uma}
                    className="overview-outfit__image"
                    alt=""
                    lazy
                  />
                ) : (
                  <span className="overview-outfit__image overview-outfit__placeholder" />
                )}
                <span className="overview-outfit__details">
                  <strong>{uma?.outfitTitle ?? `Outfit ${id}`}</strong>
                  <small>{uma?.baseCharacterName ?? "Unknown character"}</small>
                </span>
                <span
                  className="overview-count"
                  aria-label={`${formatCount(count)} uses`}
                  title={`${formatCount(count)} uses`}
                >
                  {formatCount(count)}
                </span>
              </li>
            );
          })}
        </ExpandableList>
      </section>

      <section className="overview-panel" aria-labelledby="overview-teams">
        <h3 id="overview-teams">Team setups</h3>
        {teams.length > 0 ? (
          <ol className="overview-team-list">
            {teams.map(({ members, count }) => (
              <li
                className="overview-team"
                key={JSON.stringify(members.map((member) => member.id ?? member.label).sort())}
              >
                <div className="overview-team__members">
                  {members.map((member, index) => {
                    const uma = member.id
                      ? umaList.find((entry) => String(entry.id) === member.id)
                      : undefined;
                    const styleIcon = member.id
                      ? undefined
                      : strategyIcons[member.label];
                    return (
                      <span className="overview-team__member" key={`${member.id ?? member.label}-${index}`}>
                        {uma ? (
                          <UmaImage uma={uma} alt="" lazy />
                        ) : member.id ? (
                          <span className="overview-team__placeholder" />
                        ) : styleIcon ? (
                          <img
                            src={`/icons/style/${styleIcon}.webp`}
                            alt={member.label}
                            title={member.label}
                          />
                        ) : null}
                        {member.id ? (
                          <span>
                            <strong>{uma?.outfitTitle ?? `Outfit ${member.id}`}</strong>
                            <small>{uma?.baseCharacterName ?? "Unknown character"}</small>
                          </span>
                        ) : null}
                      </span>
                    );
                  })}
                </div>
                <span
                  className="overview-count"
                  aria-label={`${formatCount(count)} uses`}
                  title={`${formatCount(count)} uses`}
                >
                  {formatCount(count)}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          !isLoading && <p>No team setup data available.</p>
        )}
      </section>
    </div>
  );
}
